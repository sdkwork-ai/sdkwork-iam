//! Per-user official (service) account configuration for the IAM app-api.
//!
//! An official account here is the caller's own WeChat 公众号 channel: the
//! AppID, display name, account type, original id, logo, message-push endpoint,
//! and the custom-menu draft that menu/article publishing will later push. It
//! is deliberately independent of `iam_oauth_resource_account`, which is a
//! tenant login resource with an integration, OAuth client, and secret
//! cascade; this row never participates in login, so one end user configuring
//! their own channel needs no tenant-operator involvement.
//!
//! Every handler resolves the caller from the verified [`WebRequestContext`],
//! never from a header or query parameter, and scopes every row by the
//! session's `tenant_id` and `user_id`. Secret values (AppSecret, message-push
//! token, EncodingAESKey) are written as encoded signing-secret references and
//! are never returned; reads expose only whether a value is configured.

use std::collections::HashMap;

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::Row;

use sdkwork_web_core::WebRequestContext;

use crate::handlers::postgres_pool_or_error;
use crate::responses::{appbase_error, appbase_ok, iam_session_required_error};
use crate::state::{LocalIamState, LocalSession};
use crate::tokens::resolve_session_from_context;
use crate::utils::{
    list_page_json, list_page_params_or_error, list_search_pattern, stable_local_id,
    total_from_rows, LIST_TOTAL_COLUMN,
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
}

/// Create payload of `POST /app/v3/api/iam/oauth/official_accounts`.
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OfficialAccountCreateCommand {
    /// WeChat 公众号 AppID.
    #[serde(default)]
    pub(crate) app_id: String,
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
    #[serde(default)]
    pub(crate) enabled: Option<bool>,
}

/// One stored row, resolved for an update merge.
struct StoredAccount {
    app_id: String,
    display_name: String,
    account_type: Option<String>,
    original_id: Option<String>,
    logo_url: Option<String>,
    app_secret_ref: Option<String>,
    notify_url: Option<String>,
    notify_token_ref: Option<String>,
    notify_encoding_aes_key_ref: Option<String>,
    custom_menu: Value,
    enabled: i32,
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

fn account_json(row: &sqlx::postgres::PgRow) -> Value {
    json!({
        "officialAccountId": row.get::<String, _>("id"),
        "appId": row.get::<String, _>("app_id"),
        "displayName": row.get::<String, _>("display_name"),
        "accountType": row.get::<Option<String>, _>("account_type"),
        "originalId": row.get::<Option<String>, _>("original_id"),
        "logoUrl": row.get::<Option<String>, _>("logo_url"),
        "hasAppSecret": row.get::<bool, _>("has_app_secret"),
        "notifyUrl": row.get::<Option<String>, _>("notify_url"),
        "hasNotifyToken": row.get::<bool, _>("has_notify_token"),
        "hasEncodingAesKey": row.get::<bool, _>("has_encoding_aes_key"),
        "customMenu": parse_custom_menu(&row.get::<String, _>("custom_menu")),
        "enabled": row.get::<i32, _>("enabled") != 0,
        "status": row.get::<String, _>("status"),
        "createdAt": row.get::<String, _>("created_at"),
        "updatedAt": row.get::<String, _>("updated_at"),
    })
}

fn parse_custom_menu(raw: &str) -> Value {
    serde_json::from_str::<Value>(raw)
        .ok()
        .filter(Value::is_object)
        .unwrap_or_else(|| json!({}))
}

/// Column list shared by the account reads, with secret booleans instead of
/// secret references.
const ACCOUNT_SELECT: &str = "id, app_id, display_name, account_type, original_id, logo_url, \
     app_secret_ref IS NOT NULL AS has_app_secret, notify_url, \
     notify_token_ref IS NOT NULL AS has_notify_token, \
     notify_encoding_aes_key_ref IS NOT NULL AS has_encoding_aes_key, \
     custom_menu, enabled, status, \
     to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS created_at, \
     to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS updated_at";

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
         FROM iam_user_official_account \
         WHERE tenant_id = $1 AND user_id = $2 AND status = 'active' \
           AND ($3::text IS NULL OR LOWER(display_name) LIKE $3 OR LOWER(app_id) LIKE $3) \
         ORDER BY updated_at DESC, id \
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

    let Some(app_id) = normalized_required(&body.app_id, MAX_APP_ID_LEN) else {
        return official_account_invalid(
            "appId",
            "a non-empty AppID of at most 64 characters is required",
        );
    };
    if !app_id
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-')
    {
        return official_account_invalid(
            "appId",
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
    let notify_url = match normalized_optional(body.notify_url.as_deref(), 1024) {
        Ok(value) => value,
        Err(()) => return official_account_invalid("notifyUrl", "at most 1024 characters"),
    };
    let app_secret_ref = match sealed_secret(body.app_secret.as_deref()) {
        Ok(value) => value,
        Err(()) => {
            return official_account_invalid("appSecret", "the secret could not be accepted")
        }
    };
    let notify_token_ref = match sealed_secret(body.notify_token.as_deref()) {
        Ok(value) => value,
        Err(()) => {
            return official_account_invalid("notifyToken", "the token could not be accepted")
        }
    };
    let notify_encoding_aes_key_ref = match sealed_secret(body.notify_encoding_aes_key.as_deref()) {
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

    let id = stable_local_id(
        "iam_user_official_account",
        &[
            session.user.tenant_id.as_str(),
            session.user.id.as_str(),
            app_id.as_str(),
        ],
    );
    let result = sqlx::query(sqlx::AssertSqlSafe(format!(
        "INSERT INTO iam_user_official_account \
           (id, tenant_id, user_id, app_id, display_name, account_type, original_id, logo_url, \
            app_secret_ref, notify_url, notify_token_ref, notify_encoding_aes_key_ref, custom_menu, \
            enabled, status, created_at, updated_at, version) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, 1, 'active', \
                 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1) \
         RETURNING {ACCOUNT_SELECT}"
    )))
    .bind(&id)
    .bind(&session.user.tenant_id)
    .bind(&session.user.id)
    .bind(&app_id)
    .bind(&display_name)
    .bind(&account_type)
    .bind(&original_id)
    .bind(&logo_url)
    .bind(&app_secret_ref)
    .bind(&notify_url)
    .bind(&notify_token_ref)
    .bind(&notify_encoding_aes_key_ref)
    .bind(custom_menu.to_string())
    .fetch_one(&pg)
    .await;

    match result {
        Ok(row) => appbase_ok(account_json(&row)),
        Err(sqlx::Error::Database(error)) if error.is_unique_violation() => appbase_error(
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
        "SELECT {ACCOUNT_SELECT} FROM iam_user_official_account \
         WHERE id = $1 AND tenant_id = $2 AND user_id = $3 AND status = 'active'"
    )))
    .bind(&official_account_id)
    .bind(&session.user.tenant_id)
    .bind(&session.user.id)
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

    let stored = sqlx::query(
        "SELECT app_id, display_name, account_type, original_id, logo_url, app_secret_ref, \
                notify_url, notify_token_ref, notify_encoding_aes_key_ref, custom_menu, enabled \
         FROM iam_user_official_account \
         WHERE id = $1 AND tenant_id = $2 AND user_id = $3 AND status = 'active'",
    )
    .bind(&official_account_id)
    .bind(&session.user.tenant_id)
    .bind(&session.user.id)
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
    let current = StoredAccount {
        app_id: row.get("app_id"),
        display_name: row.get("display_name"),
        account_type: row.get("account_type"),
        original_id: row.get("original_id"),
        logo_url: row.get("logo_url"),
        app_secret_ref: row.get("app_secret_ref"),
        notify_url: row.get("notify_url"),
        notify_token_ref: row.get("notify_token_ref"),
        notify_encoding_aes_key_ref: row.get("notify_encoding_aes_key_ref"),
        custom_menu: parse_custom_menu(&row.get::<String, _>("custom_menu")),
        enabled: row.get("enabled"),
    };

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
        None => current.logo_url.clone(),
        Some(value) => match normalized_optional(Some(value), 1024) {
            Ok(value) => value,
            Err(()) => return official_account_invalid("logoUrl", "at most 1024 characters"),
        },
    };
    let notify_url = match body.notify_url.as_deref() {
        None => current.notify_url.clone(),
        Some(value) => match normalized_optional(Some(value), 1024) {
            Ok(value) => value,
            Err(()) => return official_account_invalid("notifyUrl", "at most 1024 characters"),
        },
    };
    let app_secret_ref = match sealed_secret(body.app_secret.as_deref()) {
        Ok(Some(value)) => Some(value),
        Ok(None) => current.app_secret_ref.clone(),
        Err(()) => {
            return official_account_invalid("appSecret", "the secret could not be accepted")
        }
    };
    let notify_token_ref = match sealed_secret(body.notify_token.as_deref()) {
        Ok(Some(value)) => Some(value),
        Ok(None) => current.notify_token_ref.clone(),
        Err(()) => {
            return official_account_invalid("notifyToken", "the token could not be accepted")
        }
    };
    let notify_encoding_aes_key_ref = match sealed_secret(body.notify_encoding_aes_key.as_deref()) {
        Ok(Some(value)) => Some(value),
        Ok(None) => current.notify_encoding_aes_key_ref.clone(),
        Err(()) => {
            return official_account_invalid(
                "notifyEncodingAesKey",
                "the encoding key could not be accepted",
            )
        }
    };
    let custom_menu = match normalized_custom_menu(body.custom_menu.as_ref()) {
        Ok(value) if body.custom_menu.is_some() => value,
        Ok(_) => current.custom_menu.clone(),
        Err(()) => return official_account_invalid("customMenu", "a JSON object is required"),
    };
    let enabled = body.enabled.unwrap_or(current.enabled != 0);

    let result = sqlx::query(sqlx::AssertSqlSafe(format!(
        "UPDATE iam_user_official_account SET \
           display_name = $4, account_type = $5, original_id = $6, logo_url = $7, \
           app_secret_ref = $8, notify_url = $9, notify_token_ref = $10, \
           notify_encoding_aes_key_ref = $11, custom_menu = $12::jsonb, enabled = $13, \
           updated_at = CURRENT_TIMESTAMP, version = version + 1 \
         WHERE id = $1 AND tenant_id = $2 AND user_id = $3 AND status = 'active' \
         RETURNING {ACCOUNT_SELECT}"
    )))
    .bind(&official_account_id)
    .bind(&session.user.tenant_id)
    .bind(&session.user.id)
    .bind(&display_name)
    .bind(&account_type)
    .bind(&original_id)
    .bind(&logo_url)
    .bind(&app_secret_ref)
    .bind(&notify_url)
    .bind(&notify_token_ref)
    .bind(&notify_encoding_aes_key_ref)
    .bind(custom_menu.to_string())
    .bind(if enabled { 1 } else { 0 })
    .fetch_optional(&pg)
    .await;

    match result {
        Ok(Some(row)) => appbase_ok(account_json(&row)),
        Ok(None) => official_account_not_found(),
        Err(error) => official_account_storage_error(
            "iam_official_account_update_failed",
            &format!("update official account failed: {error}"),
        ),
    }
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
    let result = sqlx::query(
        "DELETE FROM iam_user_official_account \
         WHERE id = $1 AND tenant_id = $2 AND user_id = $3",
    )
    .bind(&official_account_id)
    .bind(&session.user.tenant_id)
    .bind(&session.user.id)
    .execute(&pg)
    .await;

    match result {
        Ok(done) if done.rows_affected() > 0 => StatusCode::NO_CONTENT.into_response(),
        Ok(_) => official_account_not_found(),
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
}
