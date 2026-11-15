//! Per-user official (service) account configuration for the IAM app-api.
//!
//! An official account here is the caller's own WeChat 公众号 channel: the
//! AppID, display name, account type, original id, logo, message-push endpoint,
//! and the custom-menu draft that menu/article publishing will later push.
//!
//! Since the official-account unification there is one aggregate:
//! `iam_oauth_resource_account` owns the channel
//! (`resource_account_kind = 'official_account'`, `access_mode =
//! 'self_managed_account'`, `maintainer_user_id` = the caller), its AppSecret
//! (`iam_oauth_secret`, owner kind `resource_account`), its message-push
//! callback (`iam_oauth_webhook_config` with kind `message_push` plus the
//! `verification_token` / `encoding_aes_key` secrets), and the
//! domain/logo/menu draft inside `provider_config_json`. The shared
//! `iam_oauth_integration` / `iam_oauth_client` / `iam_oauth_surface` rows
//! belong to the application, so deleting a channel never deletes them.
//!
//! Every handler resolves the caller from the verified [`WebRequestContext`],
//! never from a header or query parameter, and scopes every row by the
//! session's `tenant_id` and `user_id`; reads and writes additionally require
//! `access_mode = 'self_managed_account'` and `maintainer_user_id = <caller>`,
//! so a channel never leaks into another user's list and never becomes the
//! scan-login default (`qr_default_enabled` is always 0 here). Secret values
//! (AppSecret, message-push token, EncodingAESKey) are written as encoded
//! signing-secret references and are never returned; reads expose only whether
//! a value is configured.

use std::collections::HashMap;

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};
use sqlx::{PgConnection, Row};
use uuid::Uuid;

use sdkwork_web_core::WebRequestContext;

use crate::handlers::postgres_pool_or_error;
use crate::responses::{appbase_error, appbase_ok, iam_session_required_error};
use crate::state::{LocalIamState, LocalSession};
use crate::tokens::resolve_session_from_context;
use crate::utils::{
    current_timestamp_str, deployment_mode_to_string, environment_to_string, list_page_json,
    list_page_params_or_error, list_search_pattern, stable_local_id, total_from_rows,
    LIST_TOTAL_COLUMN,
};

/// `GET` list / `POST` create — the caller's official accounts.
pub(crate) const OFFICIAL_ACCOUNTS_PATH: &str = "/app/v3/api/iam/oauth/official_accounts";

/// `GET`, `PATCH`, `DELETE` — one official account owned by the caller.
pub(crate) const OFFICIAL_ACCOUNT_PATH: &str =
    "/app/v3/api/iam/oauth/official_accounts/{officialAccountId}";

/// Maximum accepted length of a display name, matching the DDL check.
const MAX_DISPLAY_NAME_LEN: usize = 128;

/// Maximum accepted length of an AppID, matching the DDL check pattern.
const MAX_APP_ID_LEN: usize = 64;

/// WeChat allows at most five JS interface security domains per account.
const JS_SECURE_DOMAIN_LIMIT: usize = 5;

/// WeChat allows two web-authorization callback domains per account.
const WEB_AUTH_DOMAIN_LIMIT: usize = 2;

/// WeChat allows three business domains per account.
const BUSINESS_DOMAIN_LIMIT: usize = 3;

/// Longest accepted protected-domain host, per the WeChat console rules.
const MAX_DOMAIN_LEN: usize = 253;

/// WeChat server-configuration URL schemes (port 80 for http, 443 for https).
const NOTIFY_URL_SCHEMES: [&str; 2] = ["http://", "https://"];

/// WeChat server-configuration Token range (letters and digits only).
const NOTIFY_TOKEN_MIN_LEN: usize = 3;
const NOTIFY_TOKEN_MAX_LEN: usize = 32;

/// WeChat message-encryption key length (A-Z, a-z, 0-9 only).
const NOTIFY_AES_KEY_LEN: usize = 43;

/// Message-push encryption modes the WeChat console offers.
const NOTIFY_ENCRYPT_MODES: [&str; 3] = ["plaintext", "compatible", "safe"];

/// `iam_oauth_webhook_config.webhook_kind` for a WeChat message push.
const WEBHOOK_KIND_MESSAGE_PUSH: &str = "message_push";

/// `iam_oauth_secret` owner kinds and secret kinds this surface writes.
const SECRET_OWNER_KIND_RESOURCE_ACCOUNT: &str = "resource_account";
const SECRET_OWNER_KIND_WEBHOOK_CONFIG: &str = "webhook_config";
const SECRET_KIND_APP_SECRET: &str = "app_secret";
const SECRET_KIND_VERIFICATION_TOKEN: &str = "verification_token";
const SECRET_KIND_ENCODING_AES_KEY: &str = "encoding_aes_key";

/// Keys of the strongly typed configuration sub-document stored in
/// `iam_oauth_resource_account.provider_config_json`.
const CONFIG_LOGO_URL: &str = "logoUrl";
const CONFIG_CUSTOM_MENU: &str = "customMenu";
const CONFIG_JS_SECURE_DOMAINS: &str = "jsSecureDomains";
const CONFIG_WEB_AUTH_DOMAINS: &str = "webAuthDomains";
const CONFIG_BUSINESS_DOMAINS: &str = "businessDomains";

/// `GET` the tenant's official-account server egress IP allowlist.
pub(crate) const OFFICIAL_ACCOUNT_SETTINGS_PATH: &str =
    "/app/v3/api/iam/oauth/official_account_settings";

/// Binds the official-account routes to the surface's shared state.
pub(crate) fn official_account_routes() -> Router<LocalIamState> {
    Router::new()
        .route(
            OFFICIAL_ACCOUNTS_PATH,
            get(list_official_accounts).post(create_official_account),
        )
        .route(
            OFFICIAL_ACCOUNT_PATH,
            get(retrieve_official_account)
                .patch(update_official_account)
                .delete(delete_official_account),
        )
        .route(
            OFFICIAL_ACCOUNT_SETTINGS_PATH,
            get(retrieve_official_account_settings),
        )
}

/// Create payload of `POST /app/v3/api/iam/oauth/official_accounts`.
///
/// The WeChat AppID arrives as `wechatAppId`, never as `appId`: the web
/// framework rejects client-supplied body keys that name ambient
/// tenant/app/subject context selectors, and `app_id`/`appId` is one of them
/// (API_SPEC §14). This value is business data — the channel's own WeChat
/// identifier — so it carries the provider-qualified name instead.
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OfficialAccountCreateCommand {
    /// WeChat 公众号 AppID.
    #[serde(default)]
    pub(crate) wechat_app_id: String,
    /// Account display name shown in the caller's account list.
    #[serde(default)]
    pub(crate) display_name: String,
    /// WeChat account type (`service` / `subscription`).
    #[serde(default)]
    pub(crate) account_type: Option<String>,
    /// WeChat account original id.
    #[serde(default)]
    pub(crate) original_id: Option<String>,
    /// Logo URL.
    #[serde(default)]
    pub(crate) logo_url: Option<String>,
    /// AppSecret, write-only.
    #[serde(default)]
    pub(crate) app_secret: Option<String>,
    /// Message-push endpoint.
    #[serde(default)]
    pub(crate) notify_url: Option<String>,
    /// Message-push verification token, write-only.
    #[serde(default)]
    pub(crate) notify_token: Option<String>,
    /// Message-push EncodingAESKey, write-only.
    #[serde(default)]
    pub(crate) notify_encoding_aes_key: Option<String>,
    /// Custom-menu draft as a menu object.
    #[serde(default)]
    pub(crate) custom_menu: Option<Value>,
    /// WeChat JS interface security domains (normalized hosts, at most 5).
    #[serde(default)]
    pub(crate) js_secure_domains: Option<Vec<String>>,
    /// WeChat web-authorization callback domains (normalized hosts, at most 2).
    #[serde(default)]
    pub(crate) web_auth_domains: Option<Vec<String>>,
    /// WeChat business domains (normalized hosts, at most 3).
    #[serde(default)]
    pub(crate) business_domains: Option<Vec<String>>,
    /// Message-push encryption mode: `plaintext`, `compatible`, or `safe`.
    #[serde(default)]
    pub(crate) notify_encrypt_mode: Option<String>,
}

/// Patch payload of `PATCH /app/v3/api/iam/oauth/official_accounts/{id}`.
///
/// Omitted fields are left unchanged; an empty secret field keeps the stored
/// value, because the read side never returns secrets to echo back.
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OfficialAccountUpdateCommand {
    #[serde(default)]
    pub(crate) display_name: Option<String>,
    #[serde(default)]
    pub(crate) account_type: Option<String>,
    #[serde(default)]
    pub(crate) original_id: Option<String>,
    #[serde(default)]
    pub(crate) logo_url: Option<String>,
    #[serde(default)]
    pub(crate) app_secret: Option<String>,
    #[serde(default)]
    pub(crate) notify_url: Option<String>,
    #[serde(default)]
    pub(crate) notify_token: Option<String>,
    #[serde(default)]
    pub(crate) notify_encoding_aes_key: Option<String>,
    #[serde(default)]
    pub(crate) custom_menu: Option<Value>,
    /// Replacement JS interface security domains (at most 5).
    #[serde(default)]
    pub(crate) js_secure_domains: Option<Vec<String>>,
    /// Replacement web-authorization callback domains (at most 2).
    #[serde(default)]
    pub(crate) web_auth_domains: Option<Vec<String>>,
    /// Replacement business domains (at most 3).
    #[serde(default)]
    pub(crate) business_domains: Option<Vec<String>>,
    /// Replacement message-push encryption mode.
    #[serde(default)]
    pub(crate) notify_encrypt_mode: Option<String>,
    #[serde(default)]
    pub(crate) enabled: Option<bool>,
}

/// One stored row, resolved for an update merge.
struct StoredAccount {
    app_id: String,
    integration_id: String,
    oauth_client_id: Option<String>,
    display_name: String,
    account_type: Option<String>,
    original_id: Option<String>,
    provider_config: Value,
    app_secret_ref: Option<String>,
    notify_url: Option<String>,
    notify_token_ref: Option<String>,
    notify_encoding_aes_key_ref: Option<String>,
    notify_encrypt_mode: String,
    enabled: i32,
}

impl StoredAccount {
    fn from_row(row: &sqlx::postgres::PgRow) -> Self {
        Self {
            app_id: row.get("provider_account_id"),
            integration_id: row.get("integration_id"),
            oauth_client_id: row.get("oauth_client_id"),
            display_name: row.get("display_name"),
            account_type: row.get("provider_account_type"),
            original_id: row.get("provider_account_original_id"),
            provider_config: stored_provider_config(&row.get::<String, _>("provider_config_json")),
            app_secret_ref: row.get("app_secret_ref"),
            notify_url: row.get("notify_url"),
            notify_token_ref: row.get("notify_token_ref"),
            notify_encoding_aes_key_ref: row.get("notify_encoding_aes_key_ref"),
            notify_encrypt_mode: stored_encrypt_mode(
                row.get::<Option<String>, _>("notify_encrypt_mode")
                    .as_deref(),
            ),
            enabled: row.get("enabled"),
        }
    }
}

fn official_account_invalid(field: &str, message: &str) -> Response {
    appbase_error(
        StatusCode::UNPROCESSABLE_ENTITY,
        "iam_official_account_invalid",
        &format!("{field}: {message}"),
    )
}

fn official_account_storage_error(code: &str, message: &str) -> Response {
    appbase_error(StatusCode::SERVICE_UNAVAILABLE, code, message)
}

fn official_account_not_found() -> Response {
    appbase_error(
        StatusCode::NOT_FOUND,
        "iam_official_account_not_found",
        "the official account does not exist for the current user",
    )
}

/// Trims a required text field and rejects blank or over-long values.
fn normalized_required(value: &str, max_len: usize) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.chars().count() > max_len {
        return None;
    }
    Some(trimmed.to_owned())
}

/// Trims an optional text field; a blank value becomes `None`.
fn normalized_optional(value: Option<&str>, max_len: usize) -> Result<Option<String>, ()> {
    let Some(raw) = value else { return Ok(None) };
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    if trimmed.chars().count() > max_len {
        return Err(());
    }
    Ok(Some(trimmed.to_owned()))
}

/// Encodes a write-only secret into the stored signing-secret reference.
fn sealed_secret(value: Option<&str>) -> Result<Option<String>, ()> {
    let Some(raw) = value else { return Ok(None) };
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    Ok(Some(sdkwork_iam_bootstrap::encode_signing_secret_ref(
        trimmed.as_bytes(),
    )))
}

/// Validates the custom-menu draft: a JSON object (or omitted).
fn normalized_custom_menu(value: Option<&Value>) -> Result<Value, ()> {
    match value {
        None => Ok(json!({})),
        Some(Value::Object(map)) => Ok(Value::Object(map.clone())),
        Some(Value::Null) => Ok(json!({})),
        Some(_) => Err(()),
    }
}

/// Normalizes one WeChat protected domain and rejects values the console rejects.
///
/// The WeChat console accepts a bare host name (no scheme, port, path, IP
/// literal, or wildcard), lowercases it, and requires a registrable domain that
/// passed ICP filing; a parent domain covers its subdomains.
fn normalized_domain(raw: &str) -> Option<String> {
    let domain = raw.trim().to_ascii_lowercase();
    if domain.is_empty() || domain.len() > MAX_DOMAIN_LEN {
        return None;
    }
    if domain.contains("://")
        || domain.contains('/')
        || domain.contains(':')
        || domain.contains('*')
        || domain.contains('@')
        || domain.contains('?')
        || domain.contains('#')
        || domain.starts_with('.')
        || domain.ends_with('.')
        || !domain.contains('.')
    {
        return None;
    }
    // Reject bare IPv4/IPv6 literals: the console refuses IP addresses.
    if domain.parse::<std::net::IpAddr>().is_ok() {
        return None;
    }
    let mut labels = domain.split('.');
    while let Some(label) = labels.next() {
        if label.is_empty() || label.len() > 63 {
            return None;
        }
        let bytes = label.as_bytes();
        if bytes.first() == Some(&b'-') || bytes.last() == Some(&b'-') {
            return None;
        }
        if !bytes
            .iter()
            .all(|byte| byte.is_ascii_alphanumeric() || *byte == b'-')
        {
            return None;
        }
    }
    Some(domain)
}

/// Normalizes an ordered, de-duplicated protected-domain list within WeChat's limit.
fn normalized_domains(
    values: Option<&[String]>,
    limit: usize,
    field: &str,
) -> Result<Vec<String>, Response> {
    let mut domains: Vec<String> = Vec::new();
    for raw in values.unwrap_or(&[]) {
        if raw.trim().is_empty() {
            continue;
        }
        let Some(domain) = normalized_domain(raw) else {
            return Err(official_account_invalid(
                field,
                "the domain must be a bare host name (no scheme, port, path, or IP)",
            ));
        };
        if !domains.contains(&domain) {
            domains.push(domain);
        }
    }
    if domains.len() > limit {
        return Err(official_account_invalid(
            field,
            &format!("at most {limit} domains are accepted"),
        ));
    }
    Ok(domains)
}

/// Validates the message-push encryption mode, defaulting to plaintext.
fn normalized_encrypt_mode(value: Option<&str>) -> Result<String, ()> {
    match value.map(str::trim) {
        None => Ok("plaintext".to_owned()),
        Some(raw) if raw.is_empty() => Ok("plaintext".to_owned()),
        Some(raw) => {
            let mode = raw.to_ascii_lowercase();
            if NOTIFY_ENCRYPT_MODES.contains(&mode.as_str()) {
                Ok(mode)
            } else {
                Err(())
            }
        }
    }
}

/// Validates the callback URL the WeChat console accepts (http:80 / https:443).
fn normalized_notify_url(value: Option<&str>) -> Result<Option<String>, ()> {
    let Some(raw) = value else { return Ok(None) };
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    if trimmed.len() > 1024 {
        return Err(());
    }
    let lowered = trimmed.to_ascii_lowercase();
    let (rest, expected_port) = if let Some(rest) = lowered.strip_prefix(NOTIFY_URL_SCHEMES[0]) {
        (rest, 80)
    } else if let Some(rest) = lowered.strip_prefix(NOTIFY_URL_SCHEMES[1]) {
        (rest, 443)
    } else {
        return Err(());
    };
    let authority_end = rest.find(['/', '?', '#']).unwrap_or(rest.len());
    let authority = &rest[..authority_end];
    if authority.is_empty() {
        return Err(());
    }
    let (host, port) = match authority.rsplit_once(':') {
        Some((host, port)) => (host, Some(port)),
        None => (authority, None),
    };
    if normalized_domain(host).as_deref() != Some(host) {
        return Err(());
    }
    if let Some(port) = port {
        if port.parse::<u16>().ok() != Some(expected_port) {
            return Err(());
        }
    }
    Ok(Some(trimmed.to_owned()))
}

/// Validates the WeChat server-configuration Token (letters and digits, 3-32).
fn normalized_notify_token(value: Option<&str>) -> Result<Option<String>, ()> {
    let Some(raw) = value else { return Ok(None) };
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    if trimmed.len() < NOTIFY_TOKEN_MIN_LEN
        || trimmed.len() > NOTIFY_TOKEN_MAX_LEN
        || !trimmed.chars().all(|ch| ch.is_ascii_alphanumeric())
    {
        return Err(());
    }
    Ok(Some(trimmed.to_owned()))
}

/// Validates the WeChat message-encryption key (A-Z, a-z, 0-9, 43 chars).
fn normalized_aes_key(value: Option<&str>) -> Result<Option<String>, ()> {
    let Some(raw) = value else { return Ok(None) };
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    if trimmed.len() != NOTIFY_AES_KEY_LEN || !trimmed.chars().all(|ch| ch.is_ascii_alphanumeric())
    {
        return Err(());
    }
    Ok(Some(trimmed.to_owned()))
}

/// Decodes the stored `provider_config_json` sub-document into an object.
fn stored_provider_config(raw: &str) -> Value {
    serde_json::from_str::<Value>(raw)
        .ok()
        .filter(Value::is_object)
        .unwrap_or_else(|| json!({}))
}

/// One text value of the stored configuration sub-document.
fn config_text(config: &Value, key: &str) -> Option<String> {
    config
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

/// One object value of the stored configuration sub-document (`{}` otherwise).
fn config_object(config: &Value, key: &str) -> Value {
    config
        .get(key)
        .filter(|value| value.is_object())
        .cloned()
        .unwrap_or_else(|| json!({}))
}

/// One array value of the stored configuration sub-document (`[]` otherwise).
fn config_domains(config: &Value, key: &str) -> Value {
    config
        .get(key)
        .filter(|value| value.is_array())
        .cloned()
        .unwrap_or_else(|| json!([]))
}

/// One string-array value of the stored configuration sub-document.
fn config_domain_list(config: &Value, key: &str) -> Vec<String> {
    config
        .get(key)
        .and_then(|value| serde_json::from_value::<Vec<String>>(value.clone()).ok())
        .unwrap_or_default()
}

/// Builds the `provider_config_json` document from validated pieces.
fn build_provider_config(
    logo_url: Option<&str>,
    custom_menu: &Value,
    js_secure_domains: &[String],
    web_auth_domains: &[String],
    business_domains: &[String],
) -> Value {
    let mut config = Map::new();
    config.insert(
        CONFIG_LOGO_URL.to_owned(),
        logo_url.map_or(Value::Null, |value| json!(value)),
    );
    config.insert(CONFIG_CUSTOM_MENU.to_owned(), custom_menu.clone());
    config.insert(CONFIG_JS_SECURE_DOMAINS.to_owned(), json!(js_secure_domains));
    config.insert(CONFIG_WEB_AUTH_DOMAINS.to_owned(), json!(web_auth_domains));
    config.insert(
        CONFIG_BUSINESS_DOMAINS.to_owned(),
        json!(business_domains),
    );
    Value::Object(config)
}

/// Maps the stored encryption mode onto the canonical vocabulary, tolerating
/// the legacy `plain` value written by the pre-unification admin surface.
fn stored_encrypt_mode(raw: Option<&str>) -> String {
    match raw.map(str::trim) {
        Some("plaintext") => "plaintext".to_owned(),
        Some("compatible") => "compatible".to_owned(),
        Some("safe") => "safe".to_owned(),
        _ => "plaintext".to_owned(),
    }
}

/// Whether a stored secret reference carries a value.
fn has_secret(secret_ref: &Option<String>) -> bool {
    secret_ref
        .as_deref()
        .is_some_and(|value| !value.trim().is_empty())
}

/// Deterministic, collision-free identifier suffix for the derived integration,
/// client, surface, webhook, and secret rows.
fn stable_hash(parts: &[&str]) -> String {
    let mut hasher = Sha256::new();
    for part in parts {
        hasher.update(part.as_bytes());
        hasher.update([0u8]);
    }
    let digest = hasher.finalize();
    let mut hex = String::with_capacity(64);
    for byte in digest {
        hex.push_str(&format!("{byte:02x}"));
    }
    hex
}

/// `self_managed_config_status` derived from how complete the credentials are.
fn self_managed_config_status(
    app_secret_ref: &Option<String>,
    notify_token_ref: &Option<String>,
    notify_encoding_aes_key_ref: &Option<String>,
) -> &'static str {
    let app_secret = has_secret(app_secret_ref);
    let token = has_secret(notify_token_ref);
    let aes_key = has_secret(notify_encoding_aes_key_ref);
    if app_secret && token && aes_key {
        "ready"
    } else if app_secret || token || aes_key {
        "incomplete"
    } else {
        "missing"
    }
}

/// `verification_token` / `encoding_aes_key` completeness of a webhook row.
fn credential_status(secret_ref: &Option<String>) -> &'static str {
    if has_secret(secret_ref) {
        "configured"
    } else {
        "missing"
    }
}

fn account_json(row: &sqlx::postgres::PgRow) -> Value {
    let config = stored_provider_config(&row.get::<String, _>("provider_config_json"));
    let app_secret_ref: Option<String> = row.get("app_secret_ref");
    let notify_token_ref: Option<String> = row.get("notify_token_ref");
    let notify_encoding_aes_key_ref: Option<String> = row.get("notify_encoding_aes_key_ref");
    json!({
        "officialAccountId": row.get::<String, _>("id"),
        "appId": row.get::<String, _>("provider_account_id"),
        "displayName": row.get::<String, _>("display_name"),
        "accountType": row.get::<Option<String>, _>("provider_account_type"),
        "originalId": row.get::<Option<String>, _>("provider_account_original_id"),
        "logoUrl": config_text(&config, CONFIG_LOGO_URL),
        "hasAppSecret": has_secret(&app_secret_ref),
        "notifyUrl": row.get::<Option<String>, _>("notify_url"),
        "hasNotifyToken": has_secret(&notify_token_ref),
        "hasEncodingAesKey": has_secret(&notify_encoding_aes_key_ref),
        "customMenu": config_object(&config, CONFIG_CUSTOM_MENU),
        "jsSecureDomains": config_domains(&config, CONFIG_JS_SECURE_DOMAINS),
        "webAuthDomains": config_domains(&config, CONFIG_WEB_AUTH_DOMAINS),
        "businessDomains": config_domains(&config, CONFIG_BUSINESS_DOMAINS),
        "notifyEncryptMode": stored_encrypt_mode(
            row.get::<Option<String>, _>("notify_encrypt_mode")
                .as_deref(),
        ),
        "enabled": row.get::<i32, _>("enabled") != 0,
        "status": row.get::<String, _>("status"),
        "createdAt": row.get::<String, _>("created_at"),
        "updatedAt": row.get::<String, _>("updated_at"),
    })
}

/// Column list shared by the account reads, with secret references resolved
/// through the canonical secret/webhook tables.
const ACCOUNT_SELECT: &str = "ra.id AS id, ra.integration_id AS integration_id, \
     ra.oauth_client_id AS oauth_client_id, ra.provider_account_id AS provider_account_id, \
     ra.display_name AS display_name, ra.provider_account_type AS provider_account_type, \
     ra.provider_account_original_id AS provider_account_original_id, \
     ra.provider_config_json AS provider_config_json, ra.enabled AS enabled, \
     ra.status AS status, \
     to_char(ra.created_at::timestamptz AT TIME ZONE 'UTC', \
             'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS created_at, \
     to_char(ra.updated_at::timestamptz AT TIME ZONE 'UTC', \
             'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS updated_at, \
     wc.id AS webhook_config_id, wc.callback_url AS notify_url, \
     wc.encryption_mode AS notify_encrypt_mode, \
     app_secret.secret_ref AS app_secret_ref, \
     notify_token.secret_ref AS notify_token_ref, \
     encoding_aes_key.secret_ref AS notify_encoding_aes_key_ref";

/// Source and self-service scope shared by every account read. Callers append
/// their own predicate (`id = $3`, search/paging) after this fragment.
const ACCOUNT_FROM: &str = "FROM iam_oauth_resource_account ra \
     LEFT JOIN LATERAL ( \
       SELECT w.id, w.callback_url, w.encryption_mode \
       FROM iam_oauth_webhook_config w \
       WHERE w.tenant_id = ra.tenant_id AND w.resource_account_id = ra.id \
         AND w.webhook_kind = 'message_push' AND w.status = 'active' \
       ORDER BY w.created_at DESC, w.id DESC \
       LIMIT 1 \
     ) wc ON TRUE \
     LEFT JOIN LATERAL ( \
       SELECT s.secret_ref \
       FROM iam_oauth_secret s \
       WHERE s.tenant_id = ra.tenant_id AND s.secret_owner_kind = 'resource_account' \
         AND s.secret_owner_id = ra.id AND s.secret_kind = 'app_secret' \
         AND s.status = 'active' \
       ORDER BY s.active_from DESC, s.id DESC \
       LIMIT 1 \
     ) app_secret ON TRUE \
     LEFT JOIN LATERAL ( \
       SELECT s.secret_ref \
       FROM iam_oauth_secret s \
       WHERE s.tenant_id = ra.tenant_id AND s.secret_owner_kind = 'webhook_config' \
         AND s.secret_owner_id = wc.id AND s.secret_kind = 'verification_token' \
         AND s.status = 'active' \
       ORDER BY s.active_from DESC, s.id DESC \
       LIMIT 1 \
     ) notify_token ON TRUE \
     LEFT JOIN LATERAL ( \
       SELECT s.secret_ref \
       FROM iam_oauth_secret s \
       WHERE s.tenant_id = ra.tenant_id AND s.secret_owner_kind = 'webhook_config' \
         AND s.secret_owner_id = wc.id AND s.secret_kind = 'encoding_aes_key' \
         AND s.status = 'active' \
       ORDER BY s.active_from DESC, s.id DESC \
       LIMIT 1 \
     ) encoding_aes_key ON TRUE \
     WHERE ra.tenant_id = $1 AND ra.access_mode = 'self_managed_account' \
       AND ra.maintainer_user_id = $2 AND ra.provider_code = 'wechat' \
       AND ra.resource_account_kind = 'official_account'";

async fn require_session(
    state: &LocalIamState,
    ctx: &WebRequestContext,
) -> Result<(sqlx::PgPool, LocalSession), Response> {
    // Cloning the pool keeps the borrow of `state` out of the async body; the
    // pool itself is a cheap handle over the shared connections.
    let pool = postgres_pool_or_error(state)?.clone();
    match resolve_session_from_context(&pool, ctx).await {
        Some(session) => Ok((pool, session)),
        None => Err(iam_session_required_error()),
    }
}

/// The application id the channel is filed under.
fn session_app_id(session: &LocalSession) -> String {
    let app_id = session.context.app_id.trim();
    if app_id.is_empty() {
        "0".to_owned()
    } else {
        app_id.to_owned()
    }
}

/// The organization the channel is scoped to.
fn session_organization_id(session: &LocalSession) -> String {
    session
        .context
        .organization_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("0")
        .to_owned()
}

/// Resolves (creating when absent) the WeChat integration of the application.
async fn resolve_wechat_integration(
    conn: &mut PgConnection,
    tenant_id: &str,
    organization_id: &str,
    app_id: &str,
    environment: &str,
    deployment_mode: &str,
    created_by: &str,
) -> Result<String, sqlx::Error> {
    let find = "SELECT id FROM iam_oauth_integration \
                WHERE tenant_id = $1 AND provider_code = 'wechat' AND app_id = $2 \
                ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at, id \
                LIMIT 1";
    let existing = sqlx::query_scalar::<_, String>(find)
        .bind(tenant_id)
        .bind(app_id)
        .fetch_optional(&mut *conn)
        .await?;
    if let Some(integration_id) = existing {
        return Ok(integration_id);
    }

    let provider_catalog_id = sqlx::query_scalar::<_, String>(
        "SELECT id FROM iam_oauth_provider_catalog \
         WHERE provider_code = 'wechat' AND status = 'active' \
           AND (owner_tenant_id = $1 OR owner_tenant_id = '0') \
         ORDER BY CASE WHEN owner_tenant_id = $1 THEN 0 ELSE 1 END \
         LIMIT 1",
    )
    .bind(tenant_id)
    .fetch_optional(&mut *conn)
    .await?
    .unwrap_or_default();
    let integration_id = format!("iamoi-oa-{}", stable_hash(&[tenant_id, app_id]));
    let now = current_timestamp_str();
    sqlx::query(
        "INSERT INTO iam_oauth_integration \
           (id, uuid, tenant_id, organization_id, app_id, environment, deployment_mode, \
            provider_code, provider_catalog_id, integration_code, display_name, region_group, \
            protocol_family, account_operation_enabled, operator_authorization_enabled, \
            enabled, health_status, status, created_by, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'wechat', $8, $9, $10, 'cn', 'oauth2', \
                 1, 0, 1, 'unknown', 'active', $11, $12, $12) \
         ON CONFLICT (id) DO NOTHING",
    )
    .bind(&integration_id)
    .bind(Uuid::now_v7().to_string())
    .bind(tenant_id)
    .bind(organization_id)
    .bind(app_id)
    .bind(environment)
    .bind(deployment_mode)
    .bind(&provider_catalog_id)
    .bind(format!("official-account-{app_id}"))
    .bind(format!("Official Account {app_id}"))
    .bind(created_by)
    .bind(&now)
    .execute(&mut *conn)
    .await?;

    sqlx::query_scalar::<_, String>(find)
        .bind(tenant_id)
        .bind(app_id)
        .fetch_optional(&mut *conn)
        .await?
        .ok_or_else(|| {
            sqlx::Error::Protocol("the WeChat integration could not be resolved".to_owned())
        })
}

/// Resolves (creating when absent) the OAuth client bound to one WeChat AppID.
async fn resolve_wechat_client(
    conn: &mut PgConnection,
    tenant_id: &str,
    organization_id: &str,
    integration_id: &str,
    app_id: &str,
    display_name: &str,
    enabled: bool,
    created_by: &str,
) -> Result<String, sqlx::Error> {
    let find = "SELECT id FROM iam_oauth_client \
                WHERE tenant_id = $1 AND integration_id = $2 AND provider_code = 'wechat' \
                  AND provider_client_id = $3 \
                ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at, id \
                LIMIT 1";
    let existing = sqlx::query_scalar::<_, String>(find)
        .bind(tenant_id)
        .bind(integration_id)
        .bind(app_id)
        .fetch_optional(&mut *conn)
        .await?;
    if let Some(oauth_client_id) = existing {
        return Ok(oauth_client_id);
    }

    let oauth_client_id = format!("iamoc-oa-{}", stable_hash(&[tenant_id, integration_id, app_id]));
    let now = current_timestamp_str();
    sqlx::query(
        "INSERT INTO iam_oauth_client \
           (id, uuid, tenant_id, organization_id, integration_id, provider_code, client_code, \
            display_name, provider_client_id, provider_account_id, client_auth_method, \
            pkce_default_mode, secret_config_status, enabled, status, created_by, \
            created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, 'wechat', $6, $7, $8, $8, 'client_secret_post', \
                 'optional', 'missing', $9, 'active', $10, $11, $11) \
         ON CONFLICT (id) DO NOTHING",
    )
    .bind(&oauth_client_id)
    .bind(Uuid::now_v7().to_string())
    .bind(tenant_id)
    .bind(organization_id)
    .bind(integration_id)
    .bind(format!("official-account-{app_id}-client"))
    .bind(display_name)
    .bind(app_id)
    .bind(if enabled { 1 } else { 0 })
    .bind(created_by)
    .bind(&now)
    .execute(&mut *conn)
    .await?;

    sqlx::query_scalar::<_, String>(find)
        .bind(tenant_id)
        .bind(integration_id)
        .bind(app_id)
        .fetch_optional(&mut *conn)
        .await?
        .ok_or_else(|| {
            sqlx::Error::Protocol("the WeChat OAuth client could not be resolved".to_owned())
        })
}

/// Resolves (creating when absent) the web surface of one OAuth client.
async fn resolve_web_surface(
    conn: &mut PgConnection,
    tenant_id: &str,
    organization_id: &str,
    integration_id: &str,
    oauth_client_id: &str,
    display_name: &str,
    enabled: bool,
) -> Result<String, sqlx::Error> {
    let find = "SELECT id FROM iam_oauth_surface \
                WHERE tenant_id = $1 AND oauth_client_id = $2 AND surface_kind = 'web' \
                ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at, id \
                LIMIT 1";
    let existing = sqlx::query_scalar::<_, String>(find)
        .bind(tenant_id)
        .bind(oauth_client_id)
        .fetch_optional(&mut *conn)
        .await?;
    if let Some(surface_id) = existing {
        return Ok(surface_id);
    }

    let surface_id = format!("iamosurf-oa-{}", stable_hash(&[tenant_id, oauth_client_id]));
    let now = current_timestamp_str();
    sqlx::query(
        "INSERT INTO iam_oauth_surface \
           (id, uuid, tenant_id, organization_id, integration_id, oauth_client_id, \
            surface_kind, surface_code, display_name, redirect_validation_mode, pkce_mode, \
            client_auth_method, enabled, status, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, 'web', $7, $8, 'strict', 'optional', \
                 'client_secret_post', $9, 'active', $10, $10) \
         ON CONFLICT (id) DO NOTHING",
    )
    .bind(&surface_id)
    .bind(Uuid::now_v7().to_string())
    .bind(tenant_id)
    .bind(organization_id)
    .bind(integration_id)
    .bind(oauth_client_id)
    .bind(format!("{oauth_client_id}-web"))
    .bind(format!("{display_name} web"))
    .bind(if enabled { 1 } else { 0 })
    .bind(&now)
    .execute(&mut *conn)
    .await?;

    sqlx::query_scalar::<_, String>(find)
        .bind(tenant_id)
        .bind(oauth_client_id)
        .fetch_optional(&mut *conn)
        .await?
        .ok_or_else(|| {
            sqlx::Error::Protocol("the WeChat web surface could not be resolved".to_owned())
        })
}

/// One sealed secret row of the canonical aggregate to write.
struct SecretWrite<'a> {
    tenant_id: &'a str,
    organization_id: &'a str,
    owner_kind: &'a str,
    owner_id: &'a str,
    resource_account_id: Option<&'a str>,
    webhook_config_id: Option<&'a str>,
    secret_kind: &'a str,
    secret_ref: &'a str,
    created_by: &'a str,
}

/// Writes (or refreshes) one sealed secret row of the canonical aggregate.
///
/// An existing active row for the same owner and secret kind is updated in
/// place rather than duplicated, so a channel migrated by
/// `0033_official_account_unification` (which seeds its own secret ids) keeps
/// exactly one active credential per kind after the first app-api write.
async fn upsert_account_secret(
    conn: &mut PgConnection,
    secret: &SecretWrite<'_>,
) -> Result<(), sqlx::Error> {
    let secret_hash = sdkwork_iam_bootstrap::hash_secret_ref(secret.secret_ref);
    let now = current_timestamp_str();
    let existing = sqlx::query_scalar::<_, String>(
        "SELECT id FROM iam_oauth_secret \
         WHERE tenant_id = $1 AND secret_owner_kind = $2 AND secret_owner_id = $3 \
           AND secret_kind = $4 AND status = 'active' \
         ORDER BY active_from DESC, id DESC \
         LIMIT 1",
    )
    .bind(secret.tenant_id)
    .bind(secret.owner_kind)
    .bind(secret.owner_id)
    .bind(secret.secret_kind)
    .fetch_optional(&mut *conn)
    .await?;
    if let Some(secret_id) = existing {
        sqlx::query(
            "UPDATE iam_oauth_secret SET \
               secret_ref = $3, secret_hash = $4, \
               resource_account_id = $5, webhook_config_id = $6, \
               status = 'active', active_until = NULL, updated_at = $7, \
               version = version + 1 \
             WHERE tenant_id = $1 AND id = $2",
        )
        .bind(secret.tenant_id)
        .bind(&secret_id)
        .bind(secret.secret_ref)
        .bind(&secret_hash)
        .bind(secret.resource_account_id)
        .bind(secret.webhook_config_id)
        .bind(&now)
        .execute(&mut *conn)
        .await?;
        return Ok(());
    }

    let secret_id = format!(
        "iamos-oa-{}",
        stable_hash(&[
            secret.tenant_id,
            secret.owner_kind,
            secret.owner_id,
            secret.secret_kind
        ])
    );
    sqlx::query(
        "INSERT INTO iam_oauth_secret \
           (id, uuid, tenant_id, organization_id, secret_owner_kind, secret_owner_id, \
            resource_account_id, webhook_config_id, secret_kind, secret_ref, secret_hash, \
            active_from, status, created_by, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13, $12, $12) \
         ON CONFLICT (id) DO UPDATE SET \
           secret_ref = EXCLUDED.secret_ref, secret_hash = EXCLUDED.secret_hash, \
           resource_account_id = EXCLUDED.resource_account_id, \
           webhook_config_id = EXCLUDED.webhook_config_id, \
           status = 'active', active_until = NULL, updated_at = EXCLUDED.updated_at, \
           version = iam_oauth_secret.version + 1",
    )
    .bind(&secret_id)
    .bind(Uuid::now_v7().to_string())
    .bind(secret.tenant_id)
    .bind(secret.organization_id)
    .bind(secret.owner_kind)
    .bind(secret.owner_id)
    .bind(secret.resource_account_id)
    .bind(secret.webhook_config_id)
    .bind(secret.secret_kind)
    .bind(secret.secret_ref)
    .bind(&secret_hash)
    .bind(&now)
    .bind(secret.created_by)
    .execute(&mut *conn)
    .await
    .map(|_| ())
}

/// One message-push webhook row of the canonical aggregate to write.
struct MessagePushWebhook<'a> {
    tenant_id: &'a str,
    organization_id: &'a str,
    integration_id: &'a str,
    resource_account_id: &'a str,
    app_id: &'a str,
    display_name: &'a str,
    callback_url: &'a str,
    encryption_mode: &'a str,
    verification_token_status: &'a str,
    encoding_aes_key_status: &'a str,
    enabled: bool,
    created_by: &'a str,
}

/// Writes (or refreshes) the message-push webhook row of one account and
/// returns its id.
async fn upsert_message_push_webhook(
    conn: &mut PgConnection,
    webhook: &MessagePushWebhook<'_>,
) -> Result<String, sqlx::Error> {
    let callback_url_hash = sdkwork_iam_bootstrap::hash_secret_ref(webhook.callback_url);
    let now = current_timestamp_str();
    let enabled = if webhook.enabled { 1 } else { 0 };
    let existing = sqlx::query_scalar::<_, String>(
        "SELECT id FROM iam_oauth_webhook_config \
         WHERE tenant_id = $1 AND resource_account_id = $2 AND webhook_kind = 'message_push' \
         ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at, id \
         LIMIT 1",
    )
    .bind(webhook.tenant_id)
    .bind(webhook.resource_account_id)
    .fetch_optional(&mut *conn)
    .await?;
    if let Some(webhook_id) = existing {
        sqlx::query(
            "UPDATE iam_oauth_webhook_config SET \
               callback_url = $3, callback_url_hash = $4, \
               verification_token_status = $5, encoding_aes_key_status = $6, \
               encryption_mode = $7, enabled = $8, status = 'active', updated_at = $9, \
               version = version + 1 \
             WHERE tenant_id = $1 AND id = $2",
        )
        .bind(webhook.tenant_id)
        .bind(&webhook_id)
        .bind(webhook.callback_url)
        .bind(&callback_url_hash)
        .bind(webhook.verification_token_status)
        .bind(webhook.encoding_aes_key_status)
        .bind(webhook.encryption_mode)
        .bind(enabled)
        .bind(&now)
        .execute(&mut *conn)
        .await?;
        return Ok(webhook_id);
    }

    let webhook_id = format!(
        "iamowh-oa-{}",
        stable_hash(&[
            webhook.tenant_id,
            webhook.resource_account_id,
            WEBHOOK_KIND_MESSAGE_PUSH
        ])
    );
    sqlx::query(
        "INSERT INTO iam_oauth_webhook_config \
           (id, uuid, tenant_id, organization_id, integration_id, resource_account_id, \
            provider_code, webhook_code, webhook_kind, display_name, callback_url, \
            callback_url_hash, callback_public_id, verification_token_status, \
            encoding_aes_key_status, encryption_mode, message_handling_mode, enabled, \
            status, created_by, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, 'wechat', $7, 'message_push', $8, $9, $10, $11, \
                 $12, $13, $14, 'ack_only', $15, 'active', $16, $17, $17)",
    )
    .bind(&webhook_id)
    .bind(Uuid::now_v7().to_string())
    .bind(webhook.tenant_id)
    .bind(webhook.organization_id)
    .bind(webhook.integration_id)
    .bind(webhook.resource_account_id)
    .bind(format!(
        "official-account-{}-message-push",
        webhook.app_id
    ))
    .bind(webhook.display_name)
    .bind(webhook.callback_url)
    .bind(&callback_url_hash)
    .bind(format!("cb-{}", Uuid::now_v7()))
    .bind(webhook.verification_token_status)
    .bind(webhook.encoding_aes_key_status)
    .bind(webhook.encryption_mode)
    .bind(enabled)
    .bind(webhook.created_by)
    .bind(&now)
    .execute(&mut *conn)
    .await?;
    Ok(webhook_id)
}

/// Marks the linked OAuth client as carrying a configured provider secret.
///
/// The credential lives on `iam_oauth_secret`, but the admin console reads the
/// client's `secret_config_status`, so storing an AppSecret keeps that
/// projection truthful.
async fn mark_client_secret_configured(
    conn: &mut PgConnection,
    tenant_id: &str,
    oauth_client_id: &str,
) -> Result<(), sqlx::Error> {
    let now = current_timestamp_str();
    sqlx::query(
        "UPDATE iam_oauth_client SET secret_config_status = 'configured', \
           updated_at = $3, version = version + 1 \
         WHERE tenant_id = $1 AND id = $2 AND secret_config_status <> 'configured'",
    )
    .bind(tenant_id)
    .bind(oauth_client_id)
    .bind(&now)
    .execute(&mut *conn)
    .await
    .map(|_| ())
}

/// Writes the message-push token and EncodingAESKey secrets of a webhook row.
async fn write_webhook_secrets(
    conn: &mut PgConnection,
    tenant_id: &str,
    organization_id: &str,
    user_id: &str,
    account_id: &str,
    webhook_id: &str,
    notify_token_ref: &Option<String>,
    notify_encoding_aes_key_ref: &Option<String>,
) -> Result<(), sqlx::Error> {
    if let Some(secret_ref) = notify_token_ref.as_deref() {
        upsert_account_secret(
            conn,
            &SecretWrite {
                tenant_id,
                organization_id,
                owner_kind: SECRET_OWNER_KIND_WEBHOOK_CONFIG,
                owner_id: webhook_id,
                resource_account_id: Some(account_id),
                webhook_config_id: Some(webhook_id),
                secret_kind: SECRET_KIND_VERIFICATION_TOKEN,
                secret_ref,
                created_by: user_id,
            },
        )
        .await?;
    }
    if let Some(secret_ref) = notify_encoding_aes_key_ref.as_deref() {
        upsert_account_secret(
            conn,
            &SecretWrite {
                tenant_id,
                organization_id,
                owner_kind: SECRET_OWNER_KIND_WEBHOOK_CONFIG,
                owner_id: webhook_id,
                resource_account_id: Some(account_id),
                webhook_config_id: Some(webhook_id),
                secret_kind: SECRET_KIND_ENCODING_AES_KEY,
                secret_ref,
                created_by: user_id,
            },
        )
        .await?;
    }
    Ok(())
}

async fn list_official_accounts(
    State(state): State<LocalIamState>,
    ctx: WebRequestContext,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let (pg, session) = match require_session(&state, &ctx).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let Ok(params) = list_page_params_or_error(&query) else {
        return list_page_params_or_error(&query)
            .err()
            .expect("error response");
    };
    let search = list_search_pattern(&query);

    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {ACCOUNT_SELECT}, COUNT(*) OVER() AS {LIST_TOTAL_COLUMN} \
         {ACCOUNT_FROM} AND ra.status = 'active' \
           AND ($3::text IS NULL OR LOWER(ra.display_name) LIKE $3 \
                OR LOWER(ra.provider_account_id) LIKE $3) \
         ORDER BY ra.updated_at::timestamptz DESC, ra.id \
         LIMIT $4 OFFSET $5"
    )))
    .bind(&session.user.tenant_id)
    .bind(&session.user.id)
    .bind(&search)
    .bind(params.page_size)
    .bind(params.offset)
    .fetch_all(&pg)
    .await;

    match rows {
        Ok(rows) => {
            let total = total_from_rows(&rows);
            let items: Vec<Value> = rows.iter().map(account_json).collect();
            appbase_ok(list_page_json(items, total, &params))
        }
        Err(error) => official_account_storage_error(
            "iam_official_accounts_list_failed",
            &format!("list official accounts failed: {error}"),
        ),
    }
}

async fn create_official_account(
    State(state): State<LocalIamState>,
    ctx: WebRequestContext,
    Json(body): Json<OfficialAccountCreateCommand>,
) -> Response {
    let (pg, session) = match require_session(&state, &ctx).await {
        Ok(value) => value,
        Err(response) => return response,
    };

    let Some(app_id) = normalized_required(&body.wechat_app_id, MAX_APP_ID_LEN) else {
        return official_account_invalid(
            "wechatAppId",
            "a non-empty AppID of at most 64 characters is required",
        );
    };
    if !app_id
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-')
    {
        return official_account_invalid(
            "wechatAppId",
            "only letters, digits, `_`, and `-` are accepted",
        );
    }
    let Some(display_name) = normalized_required(&body.display_name, MAX_DISPLAY_NAME_LEN) else {
        return official_account_invalid(
            "displayName",
            "a display name of 1 to 128 characters is required",
        );
    };
    let account_type = match normalized_optional(body.account_type.as_deref(), 32) {
        Ok(value) => value,
        Err(()) => return official_account_invalid("accountType", "at most 32 characters"),
    };
    let original_id = match normalized_optional(body.original_id.as_deref(), 128) {
        Ok(value) => value,
        Err(()) => return official_account_invalid("originalId", "at most 128 characters"),
    };
    let logo_url = match normalized_optional(body.logo_url.as_deref(), 1024) {
        Ok(value) => value,
        Err(()) => return official_account_invalid("logoUrl", "at most 1024 characters"),
    };
    let notify_url =
        match normalized_notify_url(body.notify_url.as_deref()) {
            Ok(value) => value,
            Err(()) => return official_account_invalid(
                "notifyUrl",
                "a callback URL starting with http:// (port 80) or https:// (port 443) is required",
            ),
        };
    let app_secret_ref = match sealed_secret(body.app_secret.as_deref()) {
        Ok(value) => value,
        Err(()) => {
            return official_account_invalid("appSecret", "the secret could not be accepted")
        }
    };
    let notify_token = match normalized_notify_token(body.notify_token.as_deref()) {
        Ok(value) => value,
        Err(()) => {
            return official_account_invalid(
                "notifyToken",
                "the token must be 3 to 32 letters or digits",
            )
        }
    };
    let notify_token_ref = match sealed_secret(notify_token.as_deref()) {
        Ok(value) => value,
        Err(()) => {
            return official_account_invalid("notifyToken", "the token could not be accepted")
        }
    };
    let notify_encoding_aes_key = match normalized_aes_key(body.notify_encoding_aes_key.as_deref())
    {
        Ok(value) => value,
        Err(()) => {
            return official_account_invalid(
                "notifyEncodingAesKey",
                "the encoding key must be exactly 43 letters or digits",
            )
        }
    };
    let notify_encoding_aes_key_ref = match sealed_secret(notify_encoding_aes_key.as_deref()) {
        Ok(value) => value,
        Err(()) => {
            return official_account_invalid(
                "notifyEncodingAesKey",
                "the encoding key could not be accepted",
            )
        }
    };
    let custom_menu = match normalized_custom_menu(body.custom_menu.as_ref()) {
        Ok(value) => value,
        Err(()) => return official_account_invalid("customMenu", "a JSON object is required"),
    };
    let js_secure_domains = match normalized_domains(
        body.js_secure_domains.as_deref(),
        JS_SECURE_DOMAIN_LIMIT,
        "jsSecureDomains",
    ) {
        Ok(value) => value,
        Err(response) => return response,
    };
    let web_auth_domains = match normalized_domains(
        body.web_auth_domains.as_deref(),
        WEB_AUTH_DOMAIN_LIMIT,
        "webAuthDomains",
    ) {
        Ok(value) => value,
        Err(response) => return response,
    };
    let business_domains = match normalized_domains(
        body.business_domains.as_deref(),
        BUSINESS_DOMAIN_LIMIT,
        "businessDomains",
    ) {
        Ok(value) => value,
        Err(response) => return response,
    };
    let notify_encrypt_mode = match normalized_encrypt_mode(body.notify_encrypt_mode.as_deref()) {
        Ok(value) => value,
        Err(()) => {
            return official_account_invalid(
                "notifyEncryptMode",
                "the encryption mode must be plaintext, compatible, or safe",
            )
        }
    };

    let account_id = stable_local_id(
        "iam_oauth_resource_account",
        &[
            session.user.tenant_id.as_str(),
            session.user.id.as_str(),
            app_id.as_str(),
        ],
    );
    let provider_config = build_provider_config(
        logo_url.as_deref(),
        &custom_menu,
        &js_secure_domains,
        &web_auth_domains,
        &business_domains,
    );

    let outcome = create_account_aggregate(
        &pg,
        &OfficialAccountCreation {
            tenant_id: session.user.tenant_id.clone(),
            organization_id: session_organization_id(&session),
            runtime_app_id: session_app_id(&session),
            environment: environment_to_string(&session.context.environment).to_owned(),
            deployment_mode: deployment_mode_to_string(&session.context.deployment_mode)
                .to_owned(),
            user_id: session.user.id.clone(),
            account_id,
            app_id: app_id.clone(),
            display_name,
            account_type,
            original_id,
            provider_config_json: provider_config.to_string(),
            self_managed_config_status: self_managed_config_status(
                &app_secret_ref,
                &notify_token_ref,
                &notify_encoding_aes_key_ref,
            ),
            notify_url,
            app_secret_ref,
            notify_token_ref,
            notify_encoding_aes_key_ref,
            notify_encrypt_mode,
        },
    )
    .await;

    match outcome {
        Ok(Some(row)) => appbase_ok(account_json(&row)),
        Ok(None) => official_account_storage_error(
            "iam_official_accounts_create_failed",
            "the official account could not be persisted",
        ),
        Err(error) if is_conflict(&error) => appbase_error(
            StatusCode::CONFLICT,
            "iam_official_account_conflict",
            &format!("an official account with AppID {app_id} already exists for the current user"),
        ),
        Err(error) => official_account_storage_error(
            "iam_official_accounts_create_failed",
            &format!("create official account failed: {error}"),
        ),
    }
}

/// Everything one create writes, grouped so the transaction helper stays
/// readable.
struct OfficialAccountCreation {
    tenant_id: String,
    organization_id: String,
    runtime_app_id: String,
    environment: String,
    deployment_mode: String,
    user_id: String,
    account_id: String,
    app_id: String,
    display_name: String,
    account_type: Option<String>,
    original_id: Option<String>,
    provider_config_json: String,
    self_managed_config_status: &'static str,
    notify_url: Option<String>,
    app_secret_ref: Option<String>,
    notify_token_ref: Option<String>,
    notify_encoding_aes_key_ref: Option<String>,
    notify_encrypt_mode: String,
}

/// A create/update conflict on the provider identity or the primary key.
fn is_conflict(error: &sqlx::Error) -> bool {
    matches!(error, sqlx::Error::Database(database) if database.is_unique_violation())
}

/// Creates the unified official-account aggregate in one transaction:
/// integration → client → surface → resource account → webhook → secrets.
///
/// The channel is `access_mode = 'self_managed_account'` with
/// `qr_default_enabled = 0` so it can never be picked up by scan login.
async fn create_account_aggregate(
    pg: &sqlx::PgPool,
    creation: &OfficialAccountCreation,
) -> Result<Option<sqlx::postgres::PgRow>, sqlx::Error> {
    let mut tx = pg.begin().await?;
    let integration_id = resolve_wechat_integration(
        &mut tx,
        &creation.tenant_id,
        &creation.organization_id,
        &creation.runtime_app_id,
        &creation.environment,
        &creation.deployment_mode,
        &creation.user_id,
    )
    .await?;
    let oauth_client_id = resolve_wechat_client(
        &mut tx,
        &creation.tenant_id,
        &creation.organization_id,
        &integration_id,
        &creation.app_id,
        &creation.display_name,
        true,
        &creation.user_id,
    )
    .await?;
    resolve_web_surface(
        &mut tx,
        &creation.tenant_id,
        &creation.organization_id,
        &integration_id,
        &oauth_client_id,
        &creation.display_name,
        true,
    )
    .await?;

    let now = current_timestamp_str();
    let inserted = sqlx::query(
        "INSERT INTO iam_oauth_resource_account \
           (id, uuid, tenant_id, organization_id, integration_id, oauth_client_id, \
            provider_code, resource_account_code, resource_account_kind, access_mode, \
            maintainer_user_id, display_name, provider_account_id, \
            provider_account_original_id, provider_account_type, verification_status, \
            authorization_status, self_managed_config_status, \
            operator_authorization_status, webhook_verify_status, domain_verify_status, \
            provider_config_json, qr_default_enabled, enabled, status, created_by, \
            created_at, updated_at, version) \
         VALUES ($1, $2, $3, $4, $5, $6, 'wechat', $7, 'official_account', \
                 'self_managed_account', $8, $9, $10, $11, $12, 'unknown', 'authorized', \
                 $13, 'not_required', 'unknown', 'unknown', $14, 0, 1, 'active', $8, $15, $15, 1)",
    )
    .bind(&creation.account_id)
    .bind(Uuid::now_v7().to_string())
    .bind(&creation.tenant_id)
    .bind(&creation.organization_id)
    .bind(&integration_id)
    .bind(&oauth_client_id)
    .bind(format!("oa-{}", creation.app_id))
    .bind(&creation.user_id)
    .bind(&creation.display_name)
    .bind(&creation.app_id)
    .bind(&creation.original_id)
    .bind(&creation.account_type)
    .bind(creation.self_managed_config_status)
    .bind(&creation.provider_config_json)
    .bind(&now)
    .execute(&mut *tx)
    .await;
    if let Err(error) = inserted {
        tx.rollback().await.ok();
        return Err(error);
    }

    if let Some(notify_url) = creation.notify_url.as_deref() {
        let webhook_id = upsert_message_push_webhook(
            &mut tx,
            &MessagePushWebhook {
                tenant_id: &creation.tenant_id,
                organization_id: &creation.organization_id,
                integration_id: &integration_id,
                resource_account_id: &creation.account_id,
                app_id: &creation.app_id,
                display_name: &creation.display_name,
                callback_url: notify_url,
                encryption_mode: &creation.notify_encrypt_mode,
                verification_token_status: credential_status(&creation.notify_token_ref),
                encoding_aes_key_status: credential_status(
                    &creation.notify_encoding_aes_key_ref,
                ),
                enabled: true,
                created_by: &creation.user_id,
            },
        )
        .await?;
        write_webhook_secrets(
            &mut tx,
            &creation.tenant_id,
            &creation.organization_id,
            &creation.user_id,
            &creation.account_id,
            &webhook_id,
            &creation.notify_token_ref,
            &creation.notify_encoding_aes_key_ref,
        )
        .await?;
    }
    if let Some(secret_ref) = creation.app_secret_ref.as_deref() {
        upsert_account_secret(
            &mut tx,
            &SecretWrite {
                tenant_id: &creation.tenant_id,
                organization_id: &creation.organization_id,
                owner_kind: SECRET_OWNER_KIND_RESOURCE_ACCOUNT,
                owner_id: &creation.account_id,
                resource_account_id: Some(&creation.account_id),
                webhook_config_id: None,
                secret_kind: SECRET_KIND_APP_SECRET,
                secret_ref,
                created_by: &creation.user_id,
            },
        )
        .await?;
        mark_client_secret_configured(&mut tx, &creation.tenant_id, &oauth_client_id).await?;
    }

    let row = fetch_account_row(&mut tx, &creation.tenant_id, &creation.user_id, &creation.account_id)
        .await?;
    tx.commit().await?;
    Ok(row)
}

/// Reads one account through the shared self-service scope.
async fn fetch_account_row(
    conn: &mut PgConnection,
    tenant_id: &str,
    user_id: &str,
    account_id: &str,
) -> Result<Option<sqlx::postgres::PgRow>, sqlx::Error> {
    sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {ACCOUNT_SELECT} {ACCOUNT_FROM} AND ra.id = $3 AND ra.status = 'active'"
    )))
    .bind(tenant_id)
    .bind(user_id)
    .bind(account_id)
    .fetch_optional(&mut *conn)
    .await
}

async fn retrieve_official_account_settings(
    State(state): State<LocalIamState>,
    ctx: WebRequestContext,
) -> Response {
    let (pg, session) = match require_session(&state, &ctx).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let result = sqlx::query(
        "SELECT server_ips FROM iam_oauth_scan_login_config WHERE tenant_id = $1",
    )
    .bind(&session.user.tenant_id)
    .fetch_optional(&pg)
    .await;
    match result {
        Ok(row) => {
            let server_ips = row
                .map(|row| row.get::<String, _>(0))
                .unwrap_or_else(|| "[]".to_string());
            appbase_ok(json!({ "serverIps": normalize_server_ips(&server_ips) }))
        }
        Err(error) => official_account_storage_error(
            "iam_official_account_settings_retrieve_failed",
            &format!("retrieve official account settings failed: {error}"),
        ),
    }
}

/// Normalizes the stored allowlist document into a deduplicated string array.
fn normalize_server_ips(value: &str) -> Value {
    let parsed = serde_json::from_str::<Value>(value).unwrap_or_else(|_| json!([]));
    let Some(entries) = parsed.as_array() else {
        return json!([]);
    };
    let mut seen = std::collections::HashSet::new();
    Value::Array(
        entries
            .iter()
            .filter_map(Value::as_str)
            .map(str::trim)
            .filter(|entry| !entry.is_empty())
            .filter(|entry| seen.insert((*entry).to_string()))
            .map(|entry| json!(entry))
            .collect(),
    )
}

async fn retrieve_official_account(
    State(state): State<LocalIamState>,
    ctx: WebRequestContext,
    Path(official_account_id): Path<String>,
) -> Response {
    let (pg, session) = match require_session(&state, &ctx).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let result = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {ACCOUNT_SELECT} {ACCOUNT_FROM} AND ra.id = $3 AND ra.status = 'active'"
    )))
    .bind(&session.user.tenant_id)
    .bind(&session.user.id)
    .bind(&official_account_id)
    .fetch_optional(&pg)
    .await;

    match result {
        Ok(Some(row)) => appbase_ok(account_json(&row)),
        Ok(None) => official_account_not_found(),
        Err(error) => official_account_storage_error(
            "iam_official_account_retrieve_failed",
            &format!("retrieve official account failed: {error}"),
        ),
    }
}

async fn update_official_account(
    State(state): State<LocalIamState>,
    ctx: WebRequestContext,
    Path(official_account_id): Path<String>,
    Json(body): Json<OfficialAccountUpdateCommand>,
) -> Response {
    let (pg, session) = match require_session(&state, &ctx).await {
        Ok(value) => value,
        Err(response) => return response,
    };

    let stored = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {ACCOUNT_SELECT} {ACCOUNT_FROM} AND ra.id = $3 AND ra.status = 'active'"
    )))
    .bind(&session.user.tenant_id)
    .bind(&session.user.id)
    .bind(&official_account_id)
    .fetch_optional(&pg)
    .await;

    let row = match stored {
        Ok(Some(row)) => row,
        Ok(None) => return official_account_not_found(),
        Err(error) => {
            return official_account_storage_error(
                "iam_official_account_retrieve_failed",
                &format!("load official account failed: {error}"),
            )
        }
    };
    let current = StoredAccount::from_row(&row);

    let display_name = match body.display_name.as_deref() {
        None => current.display_name.clone(),
        Some(value) => match normalized_required(value, MAX_DISPLAY_NAME_LEN) {
            Some(value) => value,
            None => {
                return official_account_invalid(
                    "displayName",
                    "a display name of 1 to 128 characters is required",
                )
            }
        },
    };
    let account_type = match body.account_type.as_deref() {
        None => current.account_type.clone(),
        Some(value) => match normalized_optional(Some(value), 32) {
            Ok(value) => value,
            Err(()) => return official_account_invalid("accountType", "at most 32 characters"),
        },
    };
    let original_id = match body.original_id.as_deref() {
        None => current.original_id.clone(),
        Some(value) => match normalized_optional(Some(value), 128) {
            Ok(value) => value,
            Err(()) => return official_account_invalid("originalId", "at most 128 characters"),
        },
    };
    let logo_url = match body.logo_url.as_deref() {
        None => config_text(&current.provider_config, CONFIG_LOGO_URL),
        Some(value) => match normalized_optional(Some(value), 1024) {
            Ok(value) => value,
            Err(()) => return official_account_invalid("logoUrl", "at most 1024 characters"),
        },
    };
    let notify_url = match body.notify_url.as_deref() {
        None => current.notify_url.clone(),
        Some(value) => match normalized_notify_url(Some(value)) {
            Ok(value) => value,
            Err(()) => return official_account_invalid(
                "notifyUrl",
                "a callback URL starting with http:// (port 80) or https:// (port 443) is required",
            ),
        },
    };
    let app_secret_ref = match sealed_secret(body.app_secret.as_deref()) {
        Ok(Some(value)) => Some(value),
        Ok(None) => current.app_secret_ref.clone(),
        Err(()) => {
            return official_account_invalid("appSecret", "the secret could not be accepted")
        }
    };
    let notify_token_ref = match body.notify_token.as_deref() {
        None => current.notify_token_ref.clone(),
        Some(value) => match normalized_notify_token(Some(value)) {
            Ok(Some(token)) => match sealed_secret(Some(token.as_str())) {
                Ok(value) => value.or_else(|| current.notify_token_ref.clone()),
                Err(()) => {
                    return official_account_invalid(
                        "notifyToken",
                        "the token could not be accepted",
                    )
                }
            },
            Ok(None) => current.notify_token_ref.clone(),
            Err(()) => {
                return official_account_invalid(
                    "notifyToken",
                    "the token must be 3 to 32 letters or digits",
                )
            }
        },
    };
    let notify_encoding_aes_key_ref = match body.notify_encoding_aes_key.as_deref() {
        None => current.notify_encoding_aes_key_ref.clone(),
        Some(value) => match normalized_aes_key(Some(value)) {
            Ok(Some(key)) => match sealed_secret(Some(key.as_str())) {
                Ok(value) => value.or_else(|| current.notify_encoding_aes_key_ref.clone()),
                Err(()) => {
                    return official_account_invalid(
                        "notifyEncodingAesKey",
                        "the encoding key could not be accepted",
                    )
                }
            },
            Ok(None) => current.notify_encoding_aes_key_ref.clone(),
            Err(()) => {
                return official_account_invalid(
                    "notifyEncodingAesKey",
                    "the encoding key must be exactly 43 letters or digits",
                )
            }
        },
    };
    let custom_menu = match normalized_custom_menu(body.custom_menu.as_ref()) {
        Ok(value) if body.custom_menu.is_some() => value,
        Ok(_) => config_object(&current.provider_config, CONFIG_CUSTOM_MENU),
        Err(()) => return official_account_invalid("customMenu", "a JSON object is required"),
    };
    let js_secure_domains = match body.js_secure_domains.as_deref() {
        None => config_domain_list(&current.provider_config, CONFIG_JS_SECURE_DOMAINS),
        Some(values) => {
            match normalized_domains(Some(values), JS_SECURE_DOMAIN_LIMIT, "jsSecureDomains") {
                Ok(value) => value,
                Err(response) => return response,
            }
        }
    };
    let web_auth_domains = match body.web_auth_domains.as_deref() {
        None => config_domain_list(&current.provider_config, CONFIG_WEB_AUTH_DOMAINS),
        Some(values) => {
            match normalized_domains(Some(values), WEB_AUTH_DOMAIN_LIMIT, "webAuthDomains") {
                Ok(value) => value,
                Err(response) => return response,
            }
        }
    };
    let business_domains = match body.business_domains.as_deref() {
        None => config_domain_list(&current.provider_config, CONFIG_BUSINESS_DOMAINS),
        Some(values) => {
            match normalized_domains(Some(values), BUSINESS_DOMAIN_LIMIT, "businessDomains") {
                Ok(value) => value,
                Err(response) => return response,
            }
        }
    };
    let notify_encrypt_mode = match body.notify_encrypt_mode.as_deref() {
        None => current.notify_encrypt_mode.clone(),
        Some(value) => match normalized_encrypt_mode(Some(value)) {
            Ok(value) => value,
            Err(()) => {
                return official_account_invalid(
                    "notifyEncryptMode",
                    "the encryption mode must be plaintext, compatible, or safe",
                )
            }
        },
    };
    let enabled = body.enabled.unwrap_or(current.enabled != 0);

    let provider_config = build_provider_config(
        logo_url.as_deref(),
        &custom_menu,
        &js_secure_domains,
        &web_auth_domains,
        &business_domains,
    );
    let tenant_id = session.user.tenant_id.clone();
    let user_id = session.user.id.clone();
    let organization_id = session_organization_id(&session);

    let outcome = apply_account_update(
        &pg,
        &OfficialAccountUpdate {
            tenant_id: tenant_id.clone(),
            organization_id,
            user_id: user_id.clone(),
            account_id: official_account_id.clone(),
            display_name,
            account_type,
            original_id,
            provider_config_json: provider_config.to_string(),
            self_managed_config_status: self_managed_config_status(
                &app_secret_ref,
                &notify_token_ref,
                &notify_encoding_aes_key_ref,
            ),
            enabled,
            integration_id: current.integration_id.clone(),
            app_id: current.app_id.clone(),
            oauth_client_id: current.oauth_client_id.clone(),
            notify_url,
            notify_encrypt_mode,
            app_secret_ref,
            notify_token_ref,
            notify_encoding_aes_key_ref,
        },
    )
    .await;

    match outcome {
        Ok(Some(row)) => appbase_ok(account_json(&row)),
        Ok(None) => official_account_not_found(),
        Err(error) => official_account_storage_error(
            "iam_official_account_update_failed",
            &format!("update official account failed: {error}"),
        ),
    }
}

/// Everything one update writes, grouped so the transaction helper stays
/// readable.
struct OfficialAccountUpdate {
    tenant_id: String,
    organization_id: String,
    user_id: String,
    account_id: String,
    display_name: String,
    account_type: Option<String>,
    original_id: Option<String>,
    provider_config_json: String,
    self_managed_config_status: &'static str,
    enabled: bool,
    integration_id: String,
    app_id: String,
    oauth_client_id: Option<String>,
    notify_url: Option<String>,
    notify_encrypt_mode: String,
    app_secret_ref: Option<String>,
    notify_token_ref: Option<String>,
    notify_encoding_aes_key_ref: Option<String>,
}

async fn apply_account_update(
    pg: &sqlx::PgPool,
    update: &OfficialAccountUpdate,
) -> Result<Option<sqlx::postgres::PgRow>, sqlx::Error> {
    let mut tx = pg.begin().await?;
    let now = current_timestamp_str();
    let updated = sqlx::query(
        "UPDATE iam_oauth_resource_account SET \
           display_name = $4, provider_account_type = $5, \
           provider_account_original_id = $6, provider_config_json = $7, enabled = $8, \
           self_managed_config_status = $9, updated_at = $10, version = version + 1 \
         WHERE tenant_id = $1 AND access_mode = 'self_managed_account' \
           AND maintainer_user_id = $2 AND id = $3 AND provider_code = 'wechat' \
           AND resource_account_kind = 'official_account' AND status = 'active'",
    )
    .bind(&update.tenant_id)
    .bind(&update.user_id)
    .bind(&update.account_id)
    .bind(&update.display_name)
    .bind(&update.account_type)
    .bind(&update.original_id)
    .bind(&update.provider_config_json)
    .bind(if update.enabled { 1 } else { 0 })
    .bind(update.self_managed_config_status)
    .bind(&now)
    .execute(&mut *tx)
    .await?
    .rows_affected();
    if updated == 0 {
        tx.rollback().await.ok();
        return Ok(None);
    }

    match update.notify_url.as_deref() {
        Some(notify_url) => {
            let webhook_id = upsert_message_push_webhook(
                &mut tx,
                &MessagePushWebhook {
                    tenant_id: &update.tenant_id,
                    organization_id: &update.organization_id,
                    integration_id: &update.integration_id,
                    resource_account_id: &update.account_id,
                    app_id: &update.app_id,
                    display_name: &update.display_name,
                    callback_url: notify_url,
                    encryption_mode: &update.notify_encrypt_mode,
                    verification_token_status: credential_status(&update.notify_token_ref),
                    encoding_aes_key_status: credential_status(
                        &update.notify_encoding_aes_key_ref,
                    ),
                    enabled: update.enabled,
                    created_by: &update.user_id,
                },
            )
            .await?;
            write_webhook_secrets(
                &mut tx,
                &update.tenant_id,
                &update.organization_id,
                &update.user_id,
                &update.account_id,
                &webhook_id,
                &update.notify_token_ref,
                &update.notify_encoding_aes_key_ref,
            )
            .await?;
        }
        None => {
            // Clearing the callback URL removes the message-push configuration
            // instead of leaving an orphan webhook behind.
            delete_webhook_rows(&mut tx, &update.tenant_id, &update.account_id).await?;
        }
    }

    if let Some(secret_ref) = update.app_secret_ref.as_deref() {
        upsert_account_secret(
            &mut tx,
            &SecretWrite {
                tenant_id: &update.tenant_id,
                organization_id: &update.organization_id,
                owner_kind: SECRET_OWNER_KIND_RESOURCE_ACCOUNT,
                owner_id: &update.account_id,
                resource_account_id: Some(&update.account_id),
                webhook_config_id: None,
                secret_kind: SECRET_KIND_APP_SECRET,
                secret_ref,
                created_by: &update.user_id,
            },
        )
        .await?;
        if let Some(oauth_client_id) = update.oauth_client_id.as_deref() {
            mark_client_secret_configured(&mut tx, &update.tenant_id, oauth_client_id).await?;
        }
    }

    let row = fetch_account_row(&mut tx, &update.tenant_id, &update.user_id, &update.account_id).await?;
    tx.commit().await?;
    Ok(row)
}

/// Removes the message-push webhook rows of one account and their secrets.
///
/// Only the account's own webhook rows are deleted; the shared integration,
/// client, and surface stay because the application and its other channels
/// depend on them.
async fn delete_webhook_rows(
    conn: &mut PgConnection,
    tenant_id: &str,
    account_id: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "DELETE FROM iam_oauth_secret \
         WHERE tenant_id = $1 AND webhook_config_id IN ( \
           SELECT id FROM iam_oauth_webhook_config \
           WHERE tenant_id = $1 AND resource_account_id = $2 \
         )",
    )
    .bind(tenant_id)
    .bind(account_id)
    .execute(&mut *conn)
    .await?;
    sqlx::query(
        "DELETE FROM iam_oauth_webhook_config \
         WHERE tenant_id = $1 AND resource_account_id = $2",
    )
    .bind(tenant_id)
    .bind(account_id)
    .execute(&mut *conn)
    .await?;
    Ok(())
}

async fn delete_official_account(
    State(state): State<LocalIamState>,
    ctx: WebRequestContext,
    Path(official_account_id): Path<String>,
) -> Response {
    let (pg, session) = match require_session(&state, &ctx).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let mut tx = match pg.begin().await {
        Ok(tx) => tx,
        Err(error) => {
            return official_account_storage_error(
                "iam_official_account_delete_failed",
                &format!("delete official account failed: {error}"),
            )
        }
    };

    let owned = sqlx::query_scalar::<_, String>(
        "SELECT id FROM iam_oauth_resource_account \
         WHERE id = $1 AND tenant_id = $2 AND access_mode = 'self_managed_account' \
           AND maintainer_user_id = $3 AND provider_code = 'wechat' \
           AND resource_account_kind = 'official_account' \
         LIMIT 1",
    )
    .bind(&official_account_id)
    .bind(&session.user.tenant_id)
    .bind(&session.user.id)
    .fetch_optional(&mut *tx)
    .await;
    match owned {
        Ok(Some(_)) => {}
        Ok(None) => {
            tx.rollback().await.ok();
            return official_account_not_found();
        }
        Err(error) => {
            tx.rollback().await.ok();
            return official_account_storage_error(
                "iam_official_account_delete_failed",
                &format!("delete official account failed: {error}"),
            );
        }
    }

    let result = async {
        delete_webhook_rows(
            &mut tx,
            &session.user.tenant_id,
            &official_account_id,
        )
        .await?;
        sqlx::query(
            "DELETE FROM iam_oauth_secret \
             WHERE tenant_id = $1 AND secret_owner_kind = 'resource_account' \
               AND secret_owner_id = $2",
        )
        .bind(&session.user.tenant_id)
        .bind(&official_account_id)
        .execute(&mut *tx)
        .await?;
        sqlx::query(
            "DELETE FROM iam_oauth_resource_account \
             WHERE id = $1 AND tenant_id = $2 AND access_mode = 'self_managed_account' \
               AND maintainer_user_id = $3 AND provider_code = 'wechat' \
               AND resource_account_kind = 'official_account'",
        )
        .bind(&official_account_id)
        .bind(&session.user.tenant_id)
        .bind(&session.user.id)
        .execute(&mut *tx)
        .await?;
        tx.commit().await
    }
    .await;

    match result {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => official_account_storage_error(
            "iam_official_account_delete_failed",
            &format!("delete official account failed: {error}"),
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_command_addresses_the_wechat_app_id_by_its_provider_qualified_name() {
        let command: OfficialAccountCreateCommand = serde_json::from_value(json!({
            "wechatAppId": "wx1234",
            "displayName": "Example Account",
        }))
        .expect("create command");
        assert_eq!(command.wechat_app_id, "wx1234");
        assert_eq!(command.display_name, "Example Account");
        // `appId` is an ambient context selector on this surface: the framework
        // guard rejects a body that carries it, so the command must not bind it.
        let bare: OfficialAccountCreateCommand = serde_json::from_value(json!({
            "appId": "wx1234",
            "displayName": "Example Account",
        }))
        .expect("create command");
        assert!(bare.wechat_app_id.is_empty());
    }

    #[test]
    fn normalizes_required_text() {
        assert_eq!(
            normalized_required("  wx1234  ", MAX_APP_ID_LEN).as_deref(),
            Some("wx1234")
        );
        assert!(normalized_required("   ", MAX_APP_ID_LEN).is_none());
        assert!(normalized_required(&"a".repeat(65), MAX_APP_ID_LEN).is_none());
    }

    #[test]
    fn blank_optional_text_clears_a_value_and_over_long_text_is_rejected() {
        assert_eq!(normalized_optional(Some(" "), 8).unwrap(), None);
        assert_eq!(
            normalized_optional(Some(" ok "), 8).unwrap().as_deref(),
            Some("ok")
        );
        assert!(normalized_optional(Some("toolongvalue"), 8).is_err());
        assert_eq!(normalized_optional(None, 8).unwrap(), None);
    }

    #[test]
    fn seals_only_non_blank_secrets() {
        assert_eq!(sealed_secret(None).unwrap(), None);
        assert_eq!(sealed_secret(Some("  ")).unwrap(), None);
        let sealed = sealed_secret(Some("secret")).unwrap().expect("sealed");
        assert_ne!(sealed, "secret");
        assert_eq!(
            sdkwork_iam_web_adapter::decode_signing_secret_ref(&sealed).unwrap(),
            b"secret"
        );
    }

    #[test]
    fn custom_menu_accepts_objects_only() {
        assert_eq!(normalized_custom_menu(None).unwrap(), json!({}));
        assert_eq!(
            normalized_custom_menu(Some(&Value::Null)).unwrap(),
            json!({})
        );
        assert!(normalized_custom_menu(Some(&json!([1, 2]))).is_err());
        assert_eq!(
            normalized_custom_menu(Some(&json!({ "button": [] }))).unwrap(),
            json!({ "button": [] })
        );
    }

    #[test]
    fn normalizes_wechat_domains_and_rejects_console_invalid_values() {
        assert_eq!(
            normalized_domain("  API.Example.COM  ").as_deref(),
            Some("api.example.com")
        );
        assert_eq!(
            normalized_domain("example.com").as_deref(),
            Some("example.com")
        );
        for invalid in [
            "https://example.com",
            "example.com:8080",
            "example.com/path",
            "192.168.1.1",
            "*.example.com",
            "localhost",
            "-example.com",
            "example..com",
        ] {
            assert!(
                normalized_domain(invalid).is_none(),
                "{invalid} must be rejected"
            );
        }

        let domains = normalized_domains(
            Some(&[
                "A.example.com".to_owned(),
                "a.example.com".to_owned(),
                " ".to_owned(),
                "b.example.com".to_owned(),
            ]),
            JS_SECURE_DOMAIN_LIMIT,
            "jsSecureDomains",
        )
        .expect("valid domain list");
        assert_eq!(domains, vec!["a.example.com", "b.example.com"]);

        let too_many: Vec<String> = (0..=JS_SECURE_DOMAIN_LIMIT)
            .map(|index| format!("d{index}.example.com"))
            .collect();
        assert!(
            normalized_domains(Some(&too_many), JS_SECURE_DOMAIN_LIMIT, "jsSecureDomains").is_err()
        );
    }

    #[test]
    fn validates_the_wechat_server_configuration_fields() {
        assert_eq!(
            normalized_notify_url(Some(" https://api.example.com/wechat/notify "))
                .unwrap()
                .as_deref(),
            Some("https://api.example.com/wechat/notify")
        );
        assert!(normalized_notify_url(Some("http://api.example.com:80/notify")).is_ok());
        assert!(normalized_notify_url(Some("https://api.example.com:443/notify")).is_ok());
        assert!(normalized_notify_url(Some("https://api.example.com:8443/notify")).is_err());
        assert!(normalized_notify_url(Some("http://api.example.com:443/notify")).is_err());
        assert!(normalized_notify_url(Some("api.example.com/notify")).is_err());
        assert!(normalized_notify_url(Some("")).unwrap().is_none());

        assert_eq!(
            normalized_notify_token(Some("Token123"))
                .unwrap()
                .as_deref(),
            Some("Token123")
        );
        assert!(normalized_notify_token(Some("ab")).is_err());
        assert!(normalized_notify_token(Some(&"a".repeat(33))).is_err());
        assert!(normalized_notify_token(Some("token-with-dash")).is_err());

        let key = "A".repeat(NOTIFY_AES_KEY_LEN);
        assert_eq!(
            normalized_aes_key(Some(key.as_str())).unwrap(),
            Some(key.clone())
        );
        assert!(normalized_aes_key(Some("short")).is_err());
        assert!(normalized_aes_key(Some(&format!("{}!", "A".repeat(42)))).is_err());
    }

    #[test]
    fn defaults_the_notify_encrypt_mode_to_plaintext() {
        assert_eq!(normalized_encrypt_mode(None).unwrap(), "plaintext");
        assert_eq!(normalized_encrypt_mode(Some(" ")).unwrap(), "plaintext");
        assert_eq!(normalized_encrypt_mode(Some("SAFE")).unwrap(), "safe");
        assert_eq!(
            normalized_encrypt_mode(Some("compatible")).unwrap(),
            "compatible"
        );
        assert!(normalized_encrypt_mode(Some("aes")).is_err());
    }

    #[test]
    fn reads_the_configuration_subdocument_back_into_the_wire_fields() {
        let config = build_provider_config(
            Some("https://cdn.example.com/logo.png"),
            &json!({ "button": [] }),
            &["js.example.com".to_owned()],
            &["web.example.com".to_owned()],
            &["biz.example.com".to_owned()],
        );
        assert_eq!(
            config_text(&config, CONFIG_LOGO_URL).as_deref(),
            Some("https://cdn.example.com/logo.png")
        );
        assert_eq!(
            config_object(&config, CONFIG_CUSTOM_MENU),
            json!({ "button": [] })
        );
        assert_eq!(
            config_domains(&config, CONFIG_JS_SECURE_DOMAINS),
            json!(["js.example.com"])
        );
        assert_eq!(
            config_domain_list(&config, CONFIG_WEB_AUTH_DOMAINS),
            vec!["web.example.com".to_owned()]
        );
        assert_eq!(
            config_domain_list(&config, CONFIG_BUSINESS_DOMAINS),
            vec!["biz.example.com".to_owned()]
        );

        // An absent value degrades to the documented empty shape, never null.
        let empty = build_provider_config(None, &json!({}), &[], &[], &[]);
        assert_eq!(config_text(&empty, CONFIG_LOGO_URL), None);
        assert_eq!(config_object(&empty, CONFIG_CUSTOM_MENU), json!({}));
        assert_eq!(config_domains(&empty, CONFIG_JS_SECURE_DOMAINS), json!([]));
    }

    #[test]
    fn maps_the_legacy_plain_encryption_mode_onto_plaintext() {
        assert_eq!(stored_encrypt_mode(Some("plain")), "plaintext");
        assert_eq!(stored_encrypt_mode(Some("plaintext")), "plaintext");
        assert_eq!(stored_encrypt_mode(Some("compatible")), "compatible");
        assert_eq!(stored_encrypt_mode(Some("safe")), "safe");
        assert_eq!(stored_encrypt_mode(None), "plaintext");
    }

    #[test]
    fn derives_the_self_managed_configuration_status_from_the_credentials() {
        let present = Some("sealed".to_owned());
        assert_eq!(
            self_managed_config_status(&present, &present, &present),
            "ready"
        );
        assert_eq!(
            self_managed_config_status(&present, &None, &None),
            "incomplete"
        );
        assert_eq!(
            self_managed_config_status(&None, &present, &None),
            "incomplete"
        );
        assert_eq!(self_managed_config_status(&None, &None, &None), "missing");
        assert_eq!(credential_status(&present), "configured");
        assert_eq!(credential_status(&None), "missing");
    }
}
