//! WeChat payment-scoped lightweight OAuth flow.
//!
//! The H5 cashier needs the payer's WeChat `openid` to run JSAPI payment
//! inside the WeChat app. This flow performs a silent `snsapi_base`
//! authorization (`code` 鈫?`openid`) without creating an IAM session or
//! linking an OAuth identity 鈥?unlike the full login OAuth flow.
//!
//! Flow:
//!   1. `GET /app/v3/api/oauth/wechat/payment/start?redirect=...`
//!      (authenticated) returns the WeChat authorize URL and stores
//!      state/redirect/tenant in short-lived HttpOnly cookies.
//!   2. WeChat redirects the payer to
//!      `GET /app/v3/api/oauth/wechat/payment/callback?code=...&state=...`;
//!      after CSRF state verification the code is exchanged for the
//!      payer's openid and the payer is redirected back to the cashier
//!      URL with `openid` appended (the cashier runs on a hash router, so
//!      the parameter lands in the hash-internal query).

use axum::{
    extract::{Query, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
};
use serde_json::json;
use std::collections::HashMap;

use sdkwork_iam_web_adapter::{
    builtin_authorization_endpoint, exchange_oauth_authorization_code,
    load_oauth_integration_exchange_context_for_app,
};
use sdkwork_web_core::WebRequestContext;

use crate::{
    handlers::postgres_pool_or_error,
    responses::{appbase_error, appbase_ok, iam_session_required_error},
    state::LocalIamState,
    tokens::{generate_opaque_token, resolve_session_from_context},
};

/// Cookie path is scoped to the payment OAuth endpoints only.
const PAYMENT_OAUTH_COOKIE_PATH: &str = "/app/v3/api/oauth/wechat/payment";
const STATE_COOKIE: &str = "sdkwork_wpoauth_state";
const REDIRECT_COOKIE: &str = "sdkwork_wpoauth_redirect";
const TENANT_COOKIE: &str = "sdkwork_wpoauth_tenant";
/// Runtime application id the authorize URL was resolved for.
///
/// The callback is unauthenticated, so without this cookie it re-resolved the
/// tenant's first active WeChat integration. A tenant with more than one
/// official account would then exchange the code against the wrong AppID and
/// secret, which WeChat rejects and which would bind the payer's openid to the
/// wrong application.
const APP_COOKIE: &str = "sdkwork_wpoauth_app";
/// Capability-token id of the anonymous cashier flow that started this OAuth.
///
/// Present only when the payer paid through a scanned cashier link: it is what
/// lets the callback return a signature bound to that token instead of a bare
/// openid that any client could claim.
const CASHIER_COOKIE: &str = "sdkwork_wpoauth_cashier";
const STATE_TTL_SECONDS: i64 = 10 * 60;
/// Silent authorization scope: only the openid is returned, no consent page.
const WECHAT_PAYMENT_SCOPE: &str = "snsapi_base";
const MAX_REDIRECT_LENGTH: usize = 512;

/// Starts the WeChat payment OAuth flow for the signed-in user.
///
/// The `redirect` parameter must be a relative path (the cashier route);
/// it is stored in an HttpOnly cookie together with the CSRF state and the
/// tenant id so the unauthenticated callback can restore them.
pub(crate) async fn start_wechat_payment_oauth(
    State(state): State<LocalIamState>,
    ctx: WebRequestContext,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    let session = match resolve_session_from_context(pg, &ctx).await {
        Some(session) => session,
        None => return iam_session_required_error(),
    };
    let redirect = match query
        .get("redirect")
        .map(String::as_str)
        .and_then(|value| normalize_payment_oauth_redirect(value).ok())
    {
        Some(redirect) => redirect,
        None => {
            return appbase_error(
                StatusCode::BAD_REQUEST,
                "iam_wechat_payment_oauth_redirect_invalid",
                "wechat payment oauth redirect must be a non-empty relative path",
            );
        }
    };
    let provider_ctx = match load_oauth_integration_exchange_context_for_app(
        pg,
        &session.user.tenant_id,
        "wechat",
        Some(&session.context.app_id),
        None,
    )
    .await
    {
        Ok(Some(ctx)) => ctx,
        Ok(None) => {
            return appbase_error(
                StatusCode::SERVICE_UNAVAILABLE,
                "iam_wechat_payment_oauth_not_configured",
                "WeChat OAuth is not configured for this tenant",
            );
        }
        Err(error) => {
            return appbase_error(
                StatusCode::SERVICE_UNAVAILABLE,
                "iam_wechat_payment_oauth_lookup_failed",
                &error,
            );
        }
    };
    let state = generate_opaque_token("wpoauth");
    let callback_url = payment_oauth_callback_url(&headers);
    let authorize_url =
        build_wechat_authorize_url(&provider_ctx.provider_client_id, &callback_url, &state);

    let mut response = appbase_ok(json!({
        "authorizeUrl": authorize_url,
        "state": state,
        "redirectUri": callback_url,
    }));
    append_payment_oauth_cookie(&mut response, STATE_COOKIE, &state, STATE_TTL_SECONDS);
    append_payment_oauth_cookie(&mut response, REDIRECT_COOKIE, &redirect, STATE_TTL_SECONDS);
    append_payment_oauth_cookie(
        &mut response,
        TENANT_COOKIE,
        &session.user.tenant_id,
        STATE_TTL_SECONDS,
    );
    // Pin the callback to the same integration scope this start resolved. An
    // empty scope clears a stale cookie left by a previous application.
    let app_scope = session.context.app_id.trim();
    if app_scope.is_empty() {
        append_payment_oauth_cookie(&mut response, APP_COOKIE, "", 0);
    } else {
        append_payment_oauth_cookie(&mut response, APP_COOKIE, app_scope, STATE_TTL_SECONDS);
    }
    response
}

/// Starts the WeChat payment OAuth for an anonymous cashier link.
///
/// The scanned QR carries a capability token, not a session, so the payer cannot
/// authorize through the session-bound `/payment/start`. This entry verifies the
/// token itself, restores the tenant from its claims, and records the token id in
/// an HttpOnly cookie so the callback can return an openid **bound to that token**
/// rather than a bare value the cashier would have to trust.
///
/// It creates no IAM session: `snsapi_base` only yields the payer openid.
pub(crate) async fn start_wechat_payment_oauth_for_cashier(
    State(state): State<LocalIamState>,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    let Some(cashier_token) = query
        .get("cashierToken")
        .map(String::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return appbase_error(
            StatusCode::BAD_REQUEST,
            "iam_wechat_payment_oauth_cashier_token_required",
            "cashier token is required",
        );
    };
    let Some(claims) = verify_cashier_token_for_cashier(&pg, cashier_token).await else {
        // Same observable result for unknown/tampered/expired links.
        return appbase_error(
            StatusCode::NOT_FOUND,
            "iam_wechat_payment_oauth_cashier_not_found",
            "cashier link is not payable",
        );
    };
    let redirect = match query
        .get("redirect")
        .map(String::as_str)
        .and_then(|value| normalize_payment_oauth_redirect(value).ok())
    {
        Some(redirect) => redirect,
        None => {
            return appbase_error(
                StatusCode::BAD_REQUEST,
                "iam_wechat_payment_oauth_redirect_invalid",
                "wechat payment oauth redirect must be a non-empty relative path",
            );
        }
    };
    let provider_ctx = match load_oauth_integration_exchange_context_for_app(
        pg,
        &claims.tenant_id,
        "wechat",
        None,
        None,
    )
    .await
    {
        Ok(Some(ctx)) => ctx,
        Ok(None) => {
            return appbase_error(
                StatusCode::SERVICE_UNAVAILABLE,
                "iam_wechat_payment_oauth_not_configured",
                "WeChat OAuth is not configured for this tenant",
            );
        }
        Err(error) => {
            return appbase_error(
                StatusCode::SERVICE_UNAVAILABLE,
                "iam_wechat_payment_oauth_lookup_failed",
                &error,
            );
        }
    };
    let state_token = generate_opaque_token("wpoauth");
    let callback_url = payment_oauth_callback_url(&headers);
    let authorize_url = build_wechat_authorize_url(
        &provider_ctx.provider_client_id,
        &callback_url,
        &state_token,
    );

    let mut response = appbase_ok(json!({
        "authorizeUrl": authorize_url,
        "state": state_token,
        "redirectUri": callback_url,
    }));
    append_payment_oauth_cookie(&mut response, STATE_COOKIE, &state_token, STATE_TTL_SECONDS);
    append_payment_oauth_cookie(&mut response, REDIRECT_COOKIE, &redirect, STATE_TTL_SECONDS);
    append_payment_oauth_cookie(
        &mut response,
        TENANT_COOKIE,
        &claims.tenant_id,
        STATE_TTL_SECONDS,
    );
    append_payment_oauth_cookie(
        &mut response,
        CASHIER_COOKIE,
        &format!("{}|{}", claims.token_id, claims.epoch),
        STATE_TTL_SECONDS,
    );
    // An anonymous cashier has no application scope; clear any stale scope left
    // by a previous signed-in start in the same browser.
    append_payment_oauth_cookie(&mut response, APP_COOKIE, "", 0);
    response
}

/// Verifies a cashier capability token with its tenant key.
async fn verify_cashier_token_for_cashier(
    pg: &sqlx::PgPool,
    token: &str,
) -> Option<sdkwork_utils_rust::CashierTokenClaims> {
    let token = resolve_cashier_short_link_token(pg, token).await?;
    // The tenant and epoch are read from the (still unverified) payload only to
    // select the derivation key; the signature must then validate under that
    // tenant's epoch key, so a foreign tenant or epoch cannot pass.
    let tenant_id = sdkwork_utils_rust::peek_cashier_token_tenant(&token)?;
    let epoch = sdkwork_utils_rust::peek_cashier_token_epoch(&token);
    let now = sdkwork_utils_rust::now().timestamp();
    for secret in load_cashier_signing_secrets(pg, &tenant_id).await {
        let Ok(key) =
            sdkwork_utils_rust::derive_cashier_token_key_with_epoch(&secret, &tenant_id, epoch)
        else {
            continue;
        };
        if let Ok(claims) = sdkwork_utils_rust::verify_cashier_token(
            &token,
            &key,
            now,
            sdkwork_utils_rust::CASHIER_TOKEN_AUDIENCE,
        ) {
            return Some(claims);
        }
    }
    None
}

/// Resolves a short cashier link (`s1.<22>`) to the real signed token stored in
/// the payment-side mapping. Non-short tokens pass through unchanged.
async fn resolve_cashier_short_link_token(pg: &sqlx::PgPool, token: &str) -> Option<String> {
    if !sdkwork_utils_rust::is_cashier_short_link_segment(token) {
        return Some(token.to_owned());
    }
    let short_id = token
        .trim()
        .strip_prefix(sdkwork_utils_rust::CASHIER_SHORT_LINK_PREFIX)?;
    let row = sqlx::query(
        r#"
        SELECT tenant_id, key_epoch, token_ciphertext
        FROM commerce_payment_cashier_link
        WHERE short_id = CAST($1 AS TEXT)
          AND status = 'active'
          AND expires_at > NOW()
        LIMIT 1
        "#,
    )
    .bind(short_id)
    .fetch_optional(pg)
    .await
    .ok()?;
    let Some(row) = row else {
        return None;
    };
    use sqlx::Row;
    let tenant_id = row.try_get::<String, _>("tenant_id").ok()?;
    let key_epoch = row.try_get::<i64, _>("key_epoch").ok()?;
    let ciphertext = row.try_get::<String, _>("token_ciphertext").ok()?;
    for secret in load_cashier_signing_secrets(pg, &tenant_id).await {
        if let Ok(signed) = sdkwork_utils_rust::decrypt_cashier_short_link_token(
            &secret,
            &tenant_id,
            key_epoch,
            &ciphertext,
        ) {
            return Some(signed);
        }
    }
    None
}

/// Loads the signing secrets valid for a tenant from the payment settings table.
///
/// Returns the payment-center managed secret (active plus its rotation grace
/// secret) opened by the host-installed cipher. An empty result disables the
/// anonymous cashier (no stored secret, disabled, or provider unavailable).
async fn load_cashier_signing_secrets(pg: &sqlx::PgPool, tenant_id: &str) -> Vec<Vec<u8>> {
    match load_stored_cashier_signing_secrets(pg, tenant_id).await {
        Ok(Some(secrets)) => secrets,
        _ => Vec::new(),
    }
}

async fn load_stored_cashier_signing_secrets(
    pg: &sqlx::PgPool,
    tenant_id: &str,
) -> Result<Option<Vec<Vec<u8>>>, ()> {
    let cipher = sdkwork_utils_rust::cashier_signing_key_cipher().map_err(|_| ())?;
    let tenant = tenant_id.trim();
    let scopes: &[&str] = if tenant.is_empty() || tenant == "0" {
        &["0"]
    } else {
        &[tenant, "0"]
    };
    for scope in scopes {
        let row = sqlx::query(
            r#"
            SELECT enabled, secret_ciphertext, secret_encryption_key_id,
                   secret_encryption_algorithm,
                   previous_secret_ciphertext, previous_secret_encryption_key_id,
                   previous_secret_encryption_algorithm,
                   EXTRACT(EPOCH FROM previous_secret_expires_at)::BIGINT
                       AS previous_secret_expires_at_unix
            FROM commerce_payment_cashier_token_setting
            WHERE tenant_id = CAST($1 AS TEXT)
            LIMIT 1
            "#,
        )
        .bind(scope)
        .fetch_optional(pg)
        .await
        .map_err(|_| ())?;
        let Some(row) = row else {
            continue;
        };
        use sqlx::Row;
        // An existing tenant row is authoritative: a disabled row or a row
        // without a stored secret stops resolution instead of inheriting the
        // platform row's key.
        if !row.try_get::<bool, _>("enabled").unwrap_or(true) {
            return Ok(None);
        }
        let ciphertext: String = row.try_get("secret_ciphertext").unwrap_or_default();
        if ciphertext.trim().is_empty() {
            return Ok(None);
        }
        let current = cipher
            .open(
                scope,
                &ciphertext,
                &row.try_get::<String, _>("secret_encryption_key_id")
                    .unwrap_or_default(),
                &row.try_get::<String, _>("secret_encryption_algorithm")
                    .unwrap_or_default(),
            )
            .map_err(|_| ())?;
        let mut secrets = vec![current];
        let previous_ciphertext: String = row
            .try_get("previous_secret_ciphertext")
            .unwrap_or_default();
        let previous_expires_at: Option<i64> = row
            .try_get("previous_secret_expires_at_unix")
            .ok()
            .flatten();
        let now = sdkwork_utils_rust::now().timestamp();
        if !previous_ciphertext.trim().is_empty()
            && previous_expires_at.is_some_and(|expires_at| expires_at > now)
        {
            let previous = cipher
                .open(
                    scope,
                    &previous_ciphertext,
                    &row.try_get::<String, _>("previous_secret_encryption_key_id")
                        .unwrap_or_default(),
                    &row.try_get::<String, _>("previous_secret_encryption_algorithm")
                        .unwrap_or_default(),
                )
                .map_err(|_| ())?;
            secrets.push(previous);
        }
        return Ok(Some(secrets));
    }
    Ok(None)
}

/// Handles the WeChat authorize redirect: verifies the CSRF state,
pub(crate) async fn handle_wechat_payment_oauth_callback(
    State(state): State<LocalIamState>,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let pg = match postgres_pool_or_error(&state) {
        Ok(pg) => pg,
        Err(response) => return response,
    };
    let code = match query
        .get("code")
        .map(String::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        Some(code) => code.to_owned(),
        None => {
            return appbase_error(
                StatusCode::BAD_REQUEST,
                "iam_wechat_payment_oauth_code_required",
                "WeChat payment authorization code is required",
            );
        }
    };
    let state_param = match query
        .get("state")
        .map(String::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        Some(state) => state.to_owned(),
        None => {
            return appbase_error(
                StatusCode::BAD_REQUEST,
                "iam_wechat_payment_oauth_state_required",
                "WeChat payment authorization state is required",
            );
        }
    };
    let Some(redirect) = read_payment_oauth_cookie(&headers, REDIRECT_COOKIE) else {
        return appbase_error(
            StatusCode::BAD_REQUEST,
            "iam_wechat_payment_oauth_context_missing",
            "WeChat payment oauth context cookie is missing or expired",
        );
    };
    let cookie_state = read_payment_oauth_cookie(&headers, STATE_COOKIE);
    if cookie_state.as_deref() != Some(state_param.as_str()) {
        return payment_oauth_redirect_response(&redirect, "error", "invalid_state");
    }
    let tenant_id = match read_payment_oauth_cookie(&headers, TENANT_COOKIE) {
        Some(tenant_id) if !tenant_id.is_empty() => tenant_id,
        _ => return payment_oauth_redirect_response(&redirect, "error", "context_missing"),
    };
    let callback_url = payment_oauth_callback_url(&headers);
    // Restore the scope the start request used; an anonymous cashier link has
    // no application scope and keeps the tenant-wide resolution.
    let app_scope = read_payment_oauth_cookie(&headers, APP_COOKIE)
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty());
    let provider_ctx = match load_oauth_integration_exchange_context_for_app(
        pg,
        &tenant_id,
        "wechat",
        app_scope.as_deref(),
        None,
    )
    .await
    {
        Ok(Some(ctx)) => ctx,
        Ok(None) => {
            return payment_oauth_redirect_response(&redirect, "error", "not_configured");
        }
        Err(_) => return payment_oauth_redirect_response(&redirect, "error", "lookup_failed"),
    };
    let profile =
        match exchange_oauth_authorization_code(&provider_ctx, &code, &callback_url, None, None)
            .await
        {
            Ok(profile) => profile,
            Err(_) => {
                return payment_oauth_redirect_response(&redirect, "error", "exchange_failed");
            }
        };
    // Anonymous cashier: the payer has no session, so the openid must be returned
    // in a form the order service can verify against the capability token instead
    // of trusting a client-supplied value.
    if let Some(cashier_cookie) = read_payment_oauth_cookie(&headers, CASHIER_COOKIE)
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
    {
        // The cookie carries `tokenId|keyEpoch` so the binding is signed with the
        // same tenant key epoch the order service derives from the token claims.
        // Cookies issued before epoch rotation (plain token id) default to epoch 1.
        let (cashier_token_id, key_epoch) = cashier_cookie
            .split_once('|')
            .map(|(token_id, epoch)| {
                (
                    token_id.trim().to_owned(),
                    epoch.trim().parse::<i64>().unwrap_or(1),
                )
            })
            .unwrap_or((cashier_cookie.clone(), 1));
        if cashier_token_id.is_empty() {
            return payment_oauth_redirect_response(&redirect, "error", "context_missing");
        }
        let Some(binding) = sign_openid_binding(
            &pg,
            &tenant_id,
            &cashier_token_id,
            key_epoch,
            &profile.subject,
        )
        .await
        else {
            return payment_oauth_redirect_response(&redirect, "error", "context_missing");
        };
        let target = append_query_component(&redirect, "openid", &profile.subject);
        let target = append_query_component(&target, "openidBinding", &binding);
        return payment_oauth_redirect_to(&target);
    }
    payment_oauth_redirect_response(&redirect, "openid", &profile.subject)
}

/// Signs the payer openid against the cashier token id and key epoch.
///
/// The order service recomputes the same HMAC from the same deployment secret and
/// the epoch carried in the capability token, so an openid cannot be replayed onto
/// another cashier link and cannot be invented.
async fn sign_openid_binding(
    pg: &sqlx::PgPool,
    tenant_id: &str,
    token_id: &str,
    key_epoch: i64,
    openid: &str,
) -> Option<String> {
    let secrets = load_cashier_signing_secrets(pg, tenant_id).await;
    let secret = secrets.first()?;
    let key = sdkwork_utils_rust::derive_cashier_token_key_with_epoch(secret, tenant_id, key_epoch)
        .ok()?;
    Some(sdkwork_utils_rust::hmac_sha256_base64url(
        sdkwork_utils_rust::cashier_openid_binding_message(token_id, openid).as_bytes(),
        &key,
    ))
}

/// Builds the WeChat web authorization URL with silent `snsapi_base` scope.
fn build_wechat_authorize_url(app_id: &str, redirect_uri: &str, state: &str) -> String {
    let endpoint =
        builtin_authorization_endpoint("wechat").expect("builtin wechat authorization endpoint");
    format!(
        "{endpoint}?appid={}&redirect_uri={}&response_type=code&scope={}&state={}#wechat_redirect",
        percent_encode_component(app_id),
        percent_encode_component(redirect_uri),
        WECHAT_PAYMENT_SCOPE,
        percent_encode_component(state),
    )
}

/// Derives the payment OAuth callback URL from the request host. The host
/// must match the WeChat official-account authorized web domain
/// (domain-level configuration; the path is free-form).
fn payment_oauth_callback_url(headers: &HeaderMap) -> String {
    let host = headers
        .get("x-forwarded-host")
        .and_then(|value| value.to_str().ok())
        .filter(|value| is_safe_host(value))
        .or_else(|| {
            headers
                .get(header::HOST)
                .and_then(|value| value.to_str().ok())
                .filter(|value| is_safe_host(value))
        })
        .unwrap_or("localhost");
    format!("https://{host}{PAYMENT_OAUTH_COOKIE_PATH}/callback")
}

/// Host values must be a plain `host[:port]` pair 鈥?no path, credentials
/// or whitespace 鈥?so they cannot smuggle an external target into the
/// authorize redirect_uri.
fn is_safe_host(value: &str) -> bool {
    let value = value.trim();
    !value.is_empty()
        && value.len() <= 253
        && !value.contains('/')
        && !value.contains('@')
        && !value.contains(char::is_whitespace)
}

/// Redirect paths must be relative so the OAuth callback cannot be used as
/// an open redirector.
fn normalize_payment_oauth_redirect(value: &str) -> Result<String, &'static str> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.len() > MAX_REDIRECT_LENGTH {
        return Err("redirect must be a non-empty relative path");
    }
    if !trimmed.starts_with('/') || trimmed.starts_with("//") || trimmed.contains("://") {
        return Err("redirect must be a relative path");
    }
    if trimmed.contains(['\r', '\n', '\t']) {
        return Err("redirect must not contain control characters");
    }
    Ok(trimmed.to_owned())
}

/// Appends a query component to a location string, honoring an existing
/// query (hash-router locations keep their `#` intact).
fn append_query_component(location: &str, key: &str, value: &str) -> String {
    let separator = if location.contains('?') { '&' } else { '?' };
    format!(
        "{location}{separator}{key}={}",
        percent_encode_component(value)
    )
}

/// Percent-encodes a value for use as a single query component (RFC 3986
/// unreserved characters stay literal).
fn percent_encode_component(value: &str) -> String {
    let mut encoded = String::with_capacity(value.len());
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'.' | b'_' | b'~' => {
                encoded.push(byte as char);
            }
            _ => encoded.push_str(&format!("%{byte:02X}")),
        }
    }
    encoded
}

fn payment_oauth_cookie(name: &str, value: &str, max_age: i64) -> String {
    format!(
        "{name}={value}; Path={PAYMENT_OAUTH_COOKIE_PATH}; Max-Age={max_age}; HttpOnly; SameSite=Lax"
    )
}

fn append_payment_oauth_cookie(response: &mut Response, name: &str, value: &str, max_age: i64) {
    response.headers_mut().append(
        header::SET_COOKIE,
        HeaderValue::from_str(&payment_oauth_cookie(name, value, max_age))
            .expect("payment oauth cookie header"),
    );
}

fn read_payment_oauth_cookie(headers: &HeaderMap, name: &str) -> Option<String> {
    let cookie_header = headers.get(header::COOKIE)?.to_str().ok()?;
    for pair in cookie_header.split(';') {
        let pair = pair.trim();
        if let Some((key, value)) = pair.split_once('=') {
            if key.trim() == name {
                return Some(value.trim().to_string());
            }
        }
    }
    None
}

/// 302 back to the cashier with the openid (or an `error` code) appended,
/// clearing the state cookies.
fn payment_oauth_redirect_response(location: &str, key: &str, value: &str) -> Response {
    payment_oauth_redirect_to(&append_query_component(location, key, value))
}

/// 302 to an already-assembled cashier URL, clearing every state cookie.
///
/// Used by the anonymous cashier flow, which appends both the openid and its
/// token binding before redirecting.
fn payment_oauth_redirect_to(target: &str) -> Response {
    let mut response = (
        StatusCode::FOUND,
        [
            (header::LOCATION, target.to_owned()),
            (header::CACHE_CONTROL, "no-store".to_string()),
        ],
    )
        .into_response();
    for name in [STATE_COOKIE, REDIRECT_COOKIE, TENANT_COOKIE, CASHIER_COOKIE] {
        append_payment_oauth_cookie(&mut response, name, "", 0);
    }
    response
}

#[cfg(test)]
mod tests {
    use super::{
        append_query_component, build_wechat_authorize_url, is_safe_host,
        normalize_payment_oauth_redirect, percent_encode_component, WECHAT_PAYMENT_SCOPE,
    };

    #[test]
    fn normalize_redirect_accepts_relative_paths() {
        assert_eq!(
            normalize_payment_oauth_redirect("/#/orders/123/cashier"),
            Ok("/#/orders/123/cashier".to_owned())
        );
        assert_eq!(
            normalize_payment_oauth_redirect("/orders/123/cashier?scene=recharge"),
            Ok("/orders/123/cashier?scene=recharge".to_owned())
        );
    }

    #[test]
    fn normalize_redirect_rejects_open_redirectors() {
        assert!(normalize_payment_oauth_redirect("https://evil.example").is_err());
        assert!(normalize_payment_oauth_redirect("//evil.example/path").is_err());
        assert!(normalize_payment_oauth_redirect("javascript:alert(1)").is_err());
        assert!(normalize_payment_oauth_redirect("").is_err());
        assert!(normalize_payment_oauth_redirect("   ").is_err());
        assert!(normalize_payment_oauth_redirect(&"a".repeat(600)).is_err());
    }

    #[test]
    fn append_query_honors_existing_query() {
        assert_eq!(
            append_query_component("/#/orders/1/cashier", "openid", "o_abc"),
            "/#/orders/1/cashier?openid=o_abc"
        );
        assert_eq!(
            append_query_component("/#/orders/1/cashier?scene=recharge", "openid", "o_abc"),
            "/#/orders/1/cashier?scene=recharge&openid=o_abc"
        );
    }

    #[test]
    fn percent_encoding_keeps_unreserved_characters() {
        assert_eq!(percent_encode_component("abc-._~123"), "abc-._~123");
        assert_eq!(
            percent_encode_component("https://im.sdkwork.com/cb"),
            "https%3A%2F%2Fim.sdkwork.com%2Fcb"
        );
        // Restores the UTF-8 original of this literal (it had been transcoded
        // through GBK); the expected percent-encoding below is unchanged.
        assert_eq!(percent_encode_component("o_中文"), "o_%E4%B8%AD%E6%96%87");
    }

    #[test]
    fn authorize_url_uses_snsapi_base_scope_and_wechat_redirect_fragment() {
        let url = build_wechat_authorize_url("wxappid", "https://im.sdkwork.com/cb", "state1");
        assert!(url.starts_with("https://open.weixin.qq.com/connect/oauth2/authorize?"));
        assert!(url.contains("appid=wxappid"));
        assert!(url.contains("redirect_uri=https%3A%2F%2Fim.sdkwork.com%2Fcb"));
        assert!(url.contains("response_type=code"));
        assert!(url.contains(&format!("scope={}", WECHAT_PAYMENT_SCOPE)));
        assert!(url.contains("state=state1"));
        assert!(url.ends_with("#wechat_redirect"));
    }

    #[test]
    fn safe_host_rejects_paths_and_credentials() {
        assert!(is_safe_host("im.sdkwork.com"));
        assert!(is_safe_host("im.sdkwork.com:8443"));
        assert!(!is_safe_host("im.sdkwork.com/evil"));
        assert!(!is_safe_host("user@im.sdkwork.com"));
        assert!(!is_safe_host("im.sdkwork.com/path"));
        assert!(!is_safe_host(""));
    }
}
