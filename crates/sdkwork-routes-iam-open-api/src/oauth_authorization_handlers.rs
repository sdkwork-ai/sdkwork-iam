use axum::{
    extract::{Query, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Redirect, Response},
    Json,
};
use sdkwork_iam_web_adapter::{
    build_oauth_jwks_document, build_openid_configuration_document, build_userinfo_claims,
    create_pending_authorization_state, exchange_authorization_code, exchange_refresh_token,
    introspect_oauth_token, load_oauth_bearer_scopes, resolve_iam_app_context_from_oauth_bearer,
    resolve_relying_party_client, revoke_oauth_token, validate_authorize_request, AuthorizeRequest,
};
use sdkwork_utils_rust::OAuthProtocolErrorBody;
#[cfg(test)]
use serde_json::json;
use serde_json::Value;
use std::collections::HashMap;

use crate::state::OpenIamState;

const OPEN_API_RATE_LIMIT_SCOPE: &str = "iam-open-api";

pub(crate) async fn enforce_open_api_rate_limit(
    state: &OpenIamState,
    pg: &sqlx::PgPool,
    bucket: &str,
) -> Option<Response> {
    match sdkwork_iam_web_adapter::check_rate_limit(
        pg,
        OPEN_API_RATE_LIMIT_SCOPE,
        bucket,
        state.rate_limit_max_requests,
        state.rate_limit_window_seconds,
    )
    .await
    {
        Ok(true) => None,
        Ok(false) => Some(oauth_error(
            StatusCode::TOO_MANY_REQUESTS,
            "iam_rate_limited",
            "too many requests — try again later",
        )),
        Err(message) => Some(oauth_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "iam_ephemeral_unavailable",
            &message,
        )),
    }
}

pub async fn retrieve_openid_configuration() -> Json<Value> {
    Json(build_openid_configuration_document())
}

pub async fn handle_oauth_authorize(
    State(state): State<OpenIamState>,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = state.require_pool() else {
        return oauth_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "iam_oauth_authorization_server_unavailable",
            "OAuth authorization server database is not configured",
        );
    };

    let request = match parse_authorize_request(&query) {
        Ok(request) => request,
        Err(message) => {
            return oauth_error(
                StatusCode::BAD_REQUEST,
                "iam_oauth_authorize_invalid",
                &message,
            );
        }
    };

    // Rate limiting comes before any database read: this endpoint is public,
    // so the cheap rejection must not depend on resolving the client first.
    if let Some(response) = enforce_open_api_rate_limit(
        &state,
        pg,
        &format!("oauth:authorize:{}", request.client_id),
    )
    .await
    {
        return response;
    }

    // The client and its redirect URI decide whether an error may leave this
    // origin. RFC 6749 section 4.1.2.1 requires authorization errors to go
    // back to a trusted redirect URI with `error` + `state`; an unregistered
    // redirect has no trusted destination, so those keep the local document.
    let client =
        match resolve_relying_party_client(pg, &request.client_id, request.tenant_id.as_deref())
            .await
        {
            Ok(client) => client,
            Err(message) => {
                return oauth_error(
                    StatusCode::BAD_REQUEST,
                    "iam_oauth_client_invalid",
                    &message,
                );
            }
        };
    let error_redirect = sdkwork_iam_web_adapter::authorize_error_redirect_target(&request, &client);

    let scopes = match validate_authorize_request(&request, &client) {
        Ok(scopes) => scopes,
        Err(message) => {
            return match error_redirect {
                Some(redirect_uri) => redirect_authorize_error(
                    &redirect_uri,
                    "invalid_request",
                    &message,
                    request.state.as_deref(),
                ),
                None => oauth_error(
                    StatusCode::BAD_REQUEST,
                    "iam_oauth_authorize_invalid",
                    &message,
                ),
            };
        }
    };

    match create_pending_authorization_state(pg, &client, &request, &scopes).await {
        Ok((_state_id, login_url)) => Redirect::temporary(&login_url).into_response(),
        Err(message) => match error_redirect {
            Some(redirect_uri) => {
                tracing::error!(%message, "OAuth authorize state creation failed");
                redirect_authorize_error(
                    &redirect_uri,
                    "server_error",
                    OAUTH_INTERNAL_ERROR_DESCRIPTION,
                    request.state.as_deref(),
                )
            }
            None => oauth_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "iam_oauth_authorize_failed",
                &message,
            ),
        },
    }
}

/// Redirect an authorization error back to the trusted client redirect URI.
///
/// Values are percent-encoded, the request `state` is echoed unchanged, and an
/// existing query string on the redirect URI is preserved.
fn redirect_authorize_error(
    redirect_uri: &str,
    error: &str,
    description: &str,
    state: Option<&str>,
) -> Response {
    let mut target = String::with_capacity(redirect_uri.len() + 128);
    target.push_str(redirect_uri);
    target.push(if redirect_uri.contains('?') { '&' } else { '?' });
    target.push_str("error=");
    target.push_str(&sdkwork_utils_rust::url_encode(error));
    target.push_str("&error_description=");
    target.push_str(&sdkwork_utils_rust::url_encode(description));
    if let Some(state) = state.map(str::trim).filter(|value| !value.is_empty()) {
        target.push_str("&state=");
        target.push_str(&sdkwork_utils_rust::url_encode(state));
    }
    Redirect::temporary(&target).into_response()
}

pub async fn handle_oauth_token(
    State(state): State<OpenIamState>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> Response {
    let Ok(pg) = state.require_pool() else {
        return oauth_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "iam_oauth_authorization_server_unavailable",
            "OAuth authorization server database is not configured",
        );
    };

    let grant_type = read_string(&body, &["grantType", "grant_type"])
        .unwrap_or_else(|| "authorization_code".to_string());

    let client_id = match read_string(&body, &["clientId", "client_id"]) {
        Some(value) => value,
        None => {
            return oauth_error(
                StatusCode::BAD_REQUEST,
                "iam_oauth_client_invalid",
                "client_id is required",
            );
        }
    };
    if let Some(response) =
        enforce_open_api_rate_limit(&state, pg, &format!("oauth:token:{client_id}")).await
    {
        return response;
    }
    let tenant_id = read_string(&body, &["tenantId", "tenant_id"]);
    let client_secret = read_client_secret(&headers, &body);

    let client = match resolve_relying_party_client(pg, &client_id, tenant_id.as_deref()).await {
        Ok(client) => client,
        Err(message) => {
            return oauth_error(
                StatusCode::BAD_REQUEST,
                "iam_oauth_client_invalid",
                &message,
            );
        }
    };

    if grant_type == "refresh_token" {
        let refresh_token = match read_string(&body, &["refreshToken", "refresh_token"]) {
            Some(value) => value,
            None => {
                return oauth_error(
                    StatusCode::BAD_REQUEST,
                    "iam_oauth_refresh_token_required",
                    "refresh_token is required",
                );
            }
        };
        match exchange_refresh_token(pg, &client, &refresh_token, client_secret.as_deref()).await {
            Ok(token_response) => return (StatusCode::OK, Json(token_response)).into_response(),
            Err(message) => {
                return oauth_error(
                    StatusCode::BAD_REQUEST,
                    "iam_oauth_token_refresh_failed",
                    &message,
                );
            }
        }
    }

    if grant_type != "authorization_code" {
        return oauth_error(
            StatusCode::BAD_REQUEST,
            "iam_oauth_token_grant_unsupported",
            "Only authorization_code and refresh_token grant_type values are supported",
        );
    }

    let code = match read_string(&body, &["code"]) {
        Some(value) => value,
        None => {
            return oauth_error(
                StatusCode::BAD_REQUEST,
                "iam_oauth_code_required",
                "code is required",
            );
        }
    };
    let redirect_uri = match read_string(&body, &["redirectUri", "redirect_uri"]) {
        Some(value) => value,
        None => {
            return oauth_error(
                StatusCode::BAD_REQUEST,
                "iam_oauth_redirect_uri_required",
                "redirect_uri is required",
            );
        }
    };
    let code_verifier = read_string(&body, &["codeVerifier", "code_verifier"]);

    match exchange_authorization_code(
        pg,
        &client,
        &code,
        &redirect_uri,
        code_verifier.as_deref(),
        client_secret.as_deref(),
    )
    .await
    {
        Ok(token_response) => (StatusCode::OK, Json(token_response)).into_response(),
        Err(message) => oauth_error(
            StatusCode::BAD_REQUEST,
            "iam_oauth_token_exchange_failed",
            &message,
        ),
    }
}

pub async fn retrieve_oauth_jwks(State(state): State<OpenIamState>) -> Response {
    let Ok(pg) = state.require_pool() else {
        return oauth_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "iam_oauth_authorization_server_unavailable",
            "OAuth authorization server database is not configured",
        );
    };
    Json(build_oauth_jwks_document(pg).await).into_response()
}

pub async fn handle_oauth_revoke(
    State(state): State<OpenIamState>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> Response {
    let Ok(pg) = state.require_pool() else {
        return oauth_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "iam_oauth_authorization_server_unavailable",
            "OAuth authorization server database is not configured",
        );
    };

    let token = match read_string(&body, &["token"]) {
        Some(value) => value,
        None => {
            return oauth_error(
                StatusCode::BAD_REQUEST,
                "iam_oauth_token_required",
                "token is required",
            );
        }
    };
    let client_id = read_string(&body, &["clientId", "client_id"]);
    let tenant_id = read_string(&body, &["tenantId", "tenant_id"]);
    let client_secret = read_client_secret(&headers, &body);

    match revoke_oauth_token(
        pg,
        &token,
        client_id.as_deref(),
        tenant_id.as_deref(),
        client_secret.as_deref(),
    )
    .await
    {
        Ok(()) => StatusCode::OK.into_response(),
        Err(message) => oauth_error(StatusCode::BAD_REQUEST, "iam_oauth_revoke_failed", &message),
    }
}

pub async fn handle_oauth_introspect(
    State(state): State<OpenIamState>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> Response {
    let Ok(pg) = state.require_pool() else {
        return oauth_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "iam_oauth_authorization_server_unavailable",
            "OAuth authorization server database is not configured",
        );
    };

    let token = match read_string(&body, &["token"]) {
        Some(value) => value,
        None => {
            return oauth_error(
                StatusCode::BAD_REQUEST,
                "iam_oauth_token_required",
                "token is required",
            );
        }
    };
    let client_id = read_string(&body, &["clientId", "client_id"]);
    let tenant_id = read_string(&body, &["tenantId", "tenant_id"]);
    let client_secret = read_client_secret(&headers, &body);

    match introspect_oauth_token(
        pg,
        &token,
        client_id.as_deref(),
        tenant_id.as_deref(),
        client_secret.as_deref(),
    )
    .await
    {
        Ok(claims) => (StatusCode::OK, Json(claims)).into_response(),
        Err(message) => oauth_error(
            StatusCode::BAD_REQUEST,
            "iam_oauth_introspect_failed",
            &message,
        ),
    }
}

pub async fn handle_oauth_userinfo(
    State(state): State<OpenIamState>,
    headers: HeaderMap,
) -> Response {
    let Ok(pg) = state.require_pool() else {
        return oauth_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "iam_oauth_authorization_server_unavailable",
            "OAuth authorization server database is not configured",
        );
    };

    let bearer = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();

    let Some(context) = resolve_iam_app_context_from_oauth_bearer(pg, bearer).await else {
        return oauth_error(
            StatusCode::UNAUTHORIZED,
            "iam_oauth_userinfo_unauthorized",
            "OAuth bearer token is invalid",
        );
    };

    let scopes = load_oauth_bearer_scopes(pg, bearer).await;
    match build_userinfo_claims(pg, &context, &scopes).await {
        Ok(claims) => (StatusCode::OK, Json(claims)).into_response(),
        Err(message) => oauth_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "iam_oauth_userinfo_failed",
            &message,
        ),
    }
}

fn parse_authorize_request(query: &HashMap<String, String>) -> Result<AuthorizeRequest, String> {
    Ok(AuthorizeRequest {
        client_id: read_query(query, "client_id")?,
        redirect_uri: read_query(query, "redirect_uri")?,
        // Parsed leniently so a trusted client + redirect URI receives the
        // RFC 6749 redirect error instead of a local document; the value is
        // validated by `validate_authorize_request`.
        response_type: query
            .get("response_type")
            .map(|value| value.trim().to_string())
            .unwrap_or_default(),
        scope: read_query(query, "scope").unwrap_or_else(|_| "openid".to_string()),
        state: query.get("state").cloned(),
        code_challenge: query.get("code_challenge").cloned(),
        code_challenge_method: query.get("code_challenge_method").cloned(),
        tenant_id: query.get("tenant_id").cloned(),
    })
}

fn read_query(query: &HashMap<String, String>, key: &str) -> Result<String, String> {
    query
        .get(key)
        .map(|value| value.trim().to_string())
        .filter(|value| !crate::is_blank(Some(value.as_str())))
        .ok_or_else(|| format!("{key} is required"))
}

fn read_string(body: &Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        body.get(*key)
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !crate::is_blank(Some(value)))
            .map(str::to_owned)
    })
}

fn read_client_secret(headers: &HeaderMap, body: &Value) -> Option<String> {
    if let Some(value) = read_string(body, &["clientSecret", "client_secret"]) {
        return Some(value);
    }
    headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Basic "))
        .and_then(|encoded| {
            base64_decode(encoded).ok().and_then(|decoded| {
                decoded
                    .split_once(':')
                    .map(|(_, secret)| secret.to_string())
            })
        })
}

fn base64_decode(input: &str) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    let bytes = STANDARD
        .decode(input)
        .map_err(|error| format!("basic auth decode failed: {error}"))?;
    String::from_utf8(bytes).map_err(|error| format!("basic auth utf8 failed: {error}"))
}

/// RFC 6749 error response for the OAuth protocol endpoints.
///
/// The body is also an RFC 9457 problem detail: the platform gateway (and the
/// IAM open-api web framework) normalizes every non-`problem+json` 4xx into a
/// generic `40002 Malformed request`, which would erase the OAuth `error`
/// value. A problem-shaped body keeps the SDKWork envelope requirements while
/// preserving `error` / `error_description` for OAuth clients, so an
/// unregistered client reports `invalid_client` instead of "Malformed
/// request".
/// Build the problem-shaped body that also carries RFC 6749 fields.
fn oauth_error_payload(status: StatusCode, code: &str, message: &str) -> (OAuthProtocolErrorBody, Value) {
    let oauth = OAuthProtocolErrorBody::from_iam_oauth_code(code, message);
    let problem_code = match status.as_u16() {
        400 => 40002,
        401 => 40101,
        403 => 40301,
        404 => 40401,
        409 => 40901,
        429 => 42901,
        503 => 50301,
        _ => 50001,
    };
    let mut payload = serde_json::json!({
        "type": format!("https://docs.sdkwork.com/problems/{problem_code}"),
        "title": oauth.error.clone(),
        "status": status.as_u16(),
        "detail": message,
        "code": problem_code,
        "error": oauth.error.clone(),
    });
    if let Some(description) = oauth.error_description.clone() {
        payload["error_description"] = serde_json::Value::String(description);
    }
    (oauth, payload)
}

/// Wire-safe description for a failure whose cause is internal (database,
/// pool, signing key). RFC 6749 `error_description` is client-facing, so an
/// internal error chain — which may name SQL, hosts, or secrets — never
/// reaches it; the real cause is logged instead.
const OAUTH_INTERNAL_ERROR_DESCRIPTION: &str =
    "The authorization server could not complete the request.";

/// Whether the error detail must be replaced by the wire-safe description.
fn is_internal_oauth_failure(
    status: StatusCode,
    oauth: &OAuthProtocolErrorBody,
    message: &str,
) -> bool {
    status.is_server_error()
        || matches!(oauth.error.as_str(), "server_error" | "temporarily_unavailable")
        // Rust error chains mark the boundary with `failed: <cause>`; a bare
        // protocol phrase such as "PKCE verification failed" has no cause tail
        // and stays visible to the client.
        || message.contains("failed:")
}

/// Resolve the client-facing description for one OAuth failure.
fn oauth_error_description(status: StatusCode, code: &str, message: &str) -> String {
    let oauth = OAuthProtocolErrorBody::from_iam_oauth_code(code, message);
    if is_internal_oauth_failure(status, &oauth, message) {
        tracing::error!(
            oauth_error_code = code,
            detail = message,
            "OAuth protocol request failed"
        );
        return OAUTH_INTERNAL_ERROR_DESCRIPTION.to_string();
    }
    message.to_string()
}

fn oauth_error(status: StatusCode, code: &str, message: &str) -> Response {
    let description = oauth_error_description(status, code, message);
    let (_, payload) = oauth_error_payload(status, code, &description);
    (
        status,
        [(header::CONTENT_TYPE, "application/problem+json")],
        Json(payload),
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;
    use sdkwork_iam_web_adapter::{RelyingPartyConfig, ResolvedRelyingParty};

    #[test]
    fn openid_configuration_uses_configured_issuer() {
        std::env::set_var("SDKWORK_IAM_OAUTH_ISSUER", "https://iam.example.com");
        let doc = build_openid_configuration_document();
        assert_eq!(doc["issuer"], json!("https://iam.example.com"));
        std::env::remove_var("SDKWORK_IAM_OAUTH_ISSUER");
    }

    #[test]
    fn oauth_error_hides_internal_causes_behind_a_wire_safe_description() {
        // A server failure never echoes the database error chain.
        assert_eq!(
            oauth_error_description(
                StatusCode::INTERNAL_SERVER_ERROR,
                "iam_oauth_authorize_failed",
                "create oauth authorization state failed: connection refused (postgres://iam@10.0.0.5)",
            ),
            OAUTH_INTERNAL_ERROR_DESCRIPTION
        );
        // The same rule applies when a 4xx path wraps an internal cause.
        assert_eq!(
            oauth_error_description(
                StatusCode::BAD_REQUEST,
                "iam_oauth_client_invalid",
                "load oauth relying party failed: pool timed out",
            ),
            OAUTH_INTERNAL_ERROR_DESCRIPTION
        );
        // A protocol-level message without an internal cause stays visible.
        assert_eq!(
            oauth_error_description(
                StatusCode::BAD_REQUEST,
                "iam_oauth_authorize_invalid",
                "OAuth redirect_uri is not registered for this client",
            ),
            "OAuth redirect_uri is not registered for this client"
        );
    }

    #[test]
    fn oauth_error_keeps_rfc6749_fields_inside_a_problem_envelope() {
        let (oauth, payload) = oauth_error_payload(
            StatusCode::BAD_REQUEST,
            "iam_oauth_client_invalid",
            "OAuth client is not registered for this tenant",
        );
        // RFC 6749 fields survive for OAuth clients...
        assert_eq!(oauth.error, "invalid_client");
        assert_eq!(payload["error"], json!("invalid_client"));
        assert_eq!(
            payload["error_description"],
            json!("OAuth client is not registered for this tenant")
        );
        // ...and the SDKWork problem envelope is complete, so the platform
        // framework enriches this body instead of replacing it with 40002.
        assert_eq!(payload["status"], json!(400));
        assert_eq!(payload["code"], json!(40002));
        assert!(payload["type"]
            .as_str()
            .unwrap_or_default()
            .ends_with("/40002"));
    }

    #[test]
    fn oauth_error_sets_the_problem_content_type() {
        let response = oauth_error(
            StatusCode::BAD_REQUEST,
            "iam_oauth_authorize_invalid",
            "missing response_type",
        );
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        assert_eq!(
            response
                .headers()
                .get(header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok()),
            Some("application/problem+json")
        );
    }

    #[test]
    fn authorize_error_redirects_to_a_trusted_redirect_uri() {
        let client = ResolvedRelyingParty {
            tenant_id: "100001".to_string(),
            app_id: "birdcoder".to_string(),
            config: RelyingPartyConfig {
                enabled: true,
                redirect_uris: vec!["birdcoder://auth/callback".to_string()],
                ..RelyingPartyConfig::default()
            },
        };
        let request = AuthorizeRequest {
            client_id: "birdcoder".to_string(),
            redirect_uri: "birdcoder://auth/callback".to_string(),
            response_type: "code".to_string(),
            scope: "openid".to_string(),
            state: Some("state-1".to_string()),
            code_challenge: None,
            code_challenge_method: None,
            tenant_id: None,
        };
        assert_eq!(
            sdkwork_iam_web_adapter::authorize_error_redirect_target(&request, &client).as_deref(),
            Some("birdcoder://auth/callback")
        );
        assert_eq!(
            sdkwork_iam_web_adapter::authorize_error_redirect_target(
                &AuthorizeRequest {
                    redirect_uri: "https://evil.example.com/callback".to_string(),
                    ..request
                },
                &client,
            ),
            None,
            "an unregistered redirect URI must keep the local error"
        );
    }

    #[test]
    fn authorize_error_redirect_keeps_query_and_encodes_state() {
        let response = redirect_authorize_error(
            "https://app.example.com/callback?tenant=1",
            "invalid_request",
            "scope is not allowed",
            Some("s t+a&te"),
        );
        assert_eq!(response.status(), StatusCode::TEMPORARY_REDIRECT);
        let location = response
            .headers()
            .get(header::LOCATION)
            .and_then(|value| value.to_str().ok())
            .expect("location header");
        assert_eq!(
            location,
            "https://app.example.com/callback?tenant=1&error=invalid_request\
             &error_description=scope%20is%20not%20allowed\
             &state=s%20t%2Ba%26te"
        );
    }
}
