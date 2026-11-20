use axum::{
    body::Bytes,
    extract::{Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use sdkwork_iam_web_adapter::{
    build_text_reply, callback_dedupe_key, decide_message_action, decrypt_wechat_blob,
    encrypt_reply_envelope, extract_encrypted_payload,
    handle_official_account_notify_get as process_official_account_notify_get,
    handle_official_account_notify_post as process_official_account_notify_post,
    handle_provider_callback_get as process_provider_callback_get,
    handle_provider_callback_post as process_provider_callback_post, iam_api_error,
    message_dedupe_key, now_epoch_seconds, parse_authorizer_message, parse_component_callback,
    verify_callback_signature, verify_component_url, AuthorizerMessage, AuthorizerMessageAction,
    ComponentCallbackConfig, ComponentCallbackConfigReader, ComponentPlatformConfigReader,
    PgComponentCallbackConfigReader, PgComponentPlatformConfigReader, PgComponentTicketStore,
    PgComponentTokenCache, ProviderCallbackHttpResponse, ProviderCallbackRequestMeta,
    ReqwestWechatComponentTransport, WechatComponentApi, WechatComponentCallbackRequest,
    WechatComponentInfoType, WechatComponentTicketService, WechatComponentTokenService,
    WechatComponentUrlVerificationRequest, WechatNotifyHttpResponse,
};
use std::collections::HashMap;

use crate::is_blank;
use crate::oauth_authorization_handlers::{
    enforce_open_api_rate_limit, handle_oauth_authorize, handle_oauth_introspect,
    handle_oauth_revoke, handle_oauth_token, handle_oauth_userinfo, retrieve_oauth_jwks,
    retrieve_openid_configuration,
};
use crate::state::OpenIamState;

pub(crate) fn build_sdkwork_iam_open_api_routes(state: OpenIamState) -> Router {
    Router::new()
        .route(
            "/.well-known/openid-configuration",
            get(retrieve_openid_configuration),
        )
        .route(
            "/.well-known/oauth-authorization-server",
            get(retrieve_openid_configuration),
        )
        .route(
            "/iam/v3/api/system/oauth/openid_configuration",
            get(retrieve_openid_configuration),
        )
        .route(
            "/iam/v3/api/system/oauth/authorization_server_metadata",
            get(retrieve_openid_configuration),
        )
        .route("/iam/v3/oauth/authorize", get(handle_oauth_authorize))
        .route("/iam/v3/api/oauth/authorize", get(handle_oauth_authorize))
        .route("/iam/v3/oauth/token", post(handle_oauth_token))
        .route("/iam/v3/api/oauth/token", post(handle_oauth_token))
        .route("/iam/v3/oauth/revoke", post(handle_oauth_revoke))
        .route("/iam/v3/api/oauth/revoke", post(handle_oauth_revoke))
        .route("/iam/v3/oauth/introspect", post(handle_oauth_introspect))
        .route(
            "/iam/v3/api/oauth/introspect",
            post(handle_oauth_introspect),
        )
        .route("/iam/v3/oauth/jwks", get(retrieve_oauth_jwks))
        .route("/iam/v3/api/oauth/jwks", get(retrieve_oauth_jwks))
        .route("/iam/v3/oauth/userinfo", get(handle_oauth_userinfo))
        .route("/iam/v3/api/oauth/userinfo", get(handle_oauth_userinfo))
        .route(
            "/iam/v3/api/oauth/provider_callbacks/{callback_public_id}",
            get(handle_provider_callback_get).post(handle_provider_callback_post),
        )
        .route(
            "/iam/v3/api/iam/oauth/official_accounts/{account_id}/wechat/notify",
            get(handle_official_account_notify_get).post(handle_official_account_notify_post),
        )
        .route(
            "/iam/v3/api/iam/oauth/wechat/component_callbacks/{callbackPublicId}",
            get(handle_component_callback_get).post(handle_component_callback_post),
        )
        .route(
            "/iam/v3/api/iam/oauth/wechat/authorizer_callbacks/{callbackPublicId}/{authorizerAppId}",
            get(handle_authorizer_callback_get).post(handle_authorizer_callback_post),
        )
        .with_state(state)
}

/// Builds route definitions without web-framework wrapping (for env-based bootstrap).
pub(crate) fn build_sdkwork_iam_open_api_routes_with_state(state: OpenIamState) -> Router {
    build_sdkwork_iam_open_api_routes(state)
}

async fn handle_provider_callback_get(
    State(state): State<OpenIamState>,
    Path(callback_public_id): Path<String>,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = state.require_pool() else {
        return oauth_provider_callback_unavailable_error();
    };
    if let Some(response) = enforce_open_api_rate_limit(
        &state,
        pg,
        &format!("oauth:provider_callback:{callback_public_id}"),
    )
    .await
    {
        return response;
    }

    match process_provider_callback_get(pg, &callback_public_id, &query).await {
        Ok(response) => provider_callback_response(response),
        Err(message) => provider_callback_error(message),
    }
}

async fn handle_provider_callback_post(
    State(state): State<OpenIamState>,
    headers: HeaderMap,
    Path(callback_public_id): Path<String>,
    Query(query): Query<HashMap<String, String>>,
    body: Bytes,
) -> Response {
    let Ok(pg) = state.require_pool() else {
        return oauth_provider_callback_unavailable_error();
    };
    if let Some(response) = enforce_open_api_rate_limit(
        &state,
        pg,
        &format!("oauth:provider_callback:{callback_public_id}"),
    )
    .await
    {
        return response;
    }

    let meta = provider_callback_request_meta(&headers);
    let content_type = headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok());
    match process_provider_callback_post(
        pg,
        &callback_public_id,
        &query,
        &body,
        content_type,
        &meta,
    )
    .await
    {
        Ok(response) => provider_callback_response(response),
        Err(message) => provider_callback_error(message),
    }
}

fn provider_callback_request_meta(headers: &HeaderMap) -> ProviderCallbackRequestMeta {
    ProviderCallbackRequestMeta {
        request_ip: headers
            .get("x-forwarded-for")
            .or_else(|| headers.get("x-real-ip"))
            .and_then(|value| value.to_str().ok())
            .map(str::trim)
            .filter(|value| !is_blank(Some(value)))
            .map(str::to_owned),
        user_agent: headers
            .get(header::USER_AGENT)
            .and_then(|value| value.to_str().ok())
            .map(str::trim)
            .filter(|value| !is_blank(Some(value)))
            .map(str::to_owned),
    }
}

fn provider_callback_response(response: ProviderCallbackHttpResponse) -> Response {
    let status =
        StatusCode::from_u16(response.status_code).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let mut builder = axum::response::Response::builder().status(status);
    if let Some(content_type) = response.content_type {
        builder = builder.header(header::CONTENT_TYPE, content_type);
    }
    builder
        .body(axum::body::Body::from(response.body))
        .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response())
}

fn provider_callback_error(message: String) -> Response {
    let (status, code) = if message.contains("was not found") {
        (
            StatusCode::NOT_FOUND,
            "iam_oauth_provider_callback_not_found",
        )
    } else if message.contains("verification failed") || message.contains("is invalid") {
        (
            StatusCode::FORBIDDEN,
            "iam_oauth_provider_callback_verification_failed",
        )
    } else if message.contains("is not configured") {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            "iam_oauth_provider_callback_unavailable",
        )
    } else {
        (
            StatusCode::BAD_REQUEST,
            "iam_oauth_provider_callback_failed",
        )
    };

    iam_api_error(status, code, &message)
}

fn oauth_provider_callback_unavailable_error() -> Response {
    iam_api_error(
        StatusCode::SERVICE_UNAVAILABLE,
        "iam_oauth_provider_callback_unavailable",
        "OAuth provider callback processing is not configured",
    )
}

async fn handle_official_account_notify_get(
    State(state): State<OpenIamState>,
    Path(account_id): Path<String>,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = state.require_pool() else {
        return official_account_notify_unavailable_error();
    };
    match process_official_account_notify_get(pg, &account_id, &query).await {
        Ok(response) => official_account_notify_response(response),
        Err(message) => official_account_notify_error(message),
    }
}

async fn handle_official_account_notify_post(
    State(state): State<OpenIamState>,
    Path(account_id): Path<String>,
    Query(query): Query<HashMap<String, String>>,
    body: Bytes,
) -> Response {
    let Ok(pg) = state.require_pool() else {
        return official_account_notify_unavailable_error();
    };
    let Ok(body) = std::str::from_utf8(&body) else {
        return iam_api_error(
            StatusCode::BAD_REQUEST,
            "iam_oauth_official_account_notify_invalid",
            "wechat notify body is not UTF-8",
        );
    };
    match process_official_account_notify_post(pg, &account_id, &query, body, &state.notify_replay)
        .await
    {
        Ok(response) => official_account_notify_response(response),
        Err(message) => official_account_notify_error(message),
    }
}

fn official_account_notify_response(response: WechatNotifyHttpResponse) -> Response {
    axum::response::Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, response.content_type)
        .body(axum::body::Body::from(response.body))
        .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response())
}

fn official_account_notify_error(message: String) -> Response {
    let (status, code) = if message.contains("not found") {
        (
            StatusCode::NOT_FOUND,
            "iam_oauth_official_account_notify_not_found",
        )
    } else if message.contains("verification failed") {
        (
            StatusCode::FORBIDDEN,
            "iam_oauth_official_account_notify_verification_failed",
        )
    } else if message.contains("is not configured") || message.contains("is disabled") {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            "iam_oauth_official_account_notify_unavailable",
        )
    } else {
        (
            StatusCode::BAD_REQUEST,
            "iam_oauth_official_account_notify_invalid",
        )
    };
    iam_api_error(status, code, &message)
}

fn official_account_notify_unavailable_error() -> Response {
    iam_api_error(
        StatusCode::SERVICE_UNAVAILABLE,
        "iam_oauth_official_account_notify_unavailable",
        "Official-account WeChat notify processing is not configured",
    )
}

async fn handle_component_callback_get(
    State(state): State<OpenIamState>,
    Path(callback_public_id): Path<String>,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = state.require_pool() else {
        return component_callback_unavailable_error();
    };
    let reader = PgComponentCallbackConfigReader::new(pg.clone());
    let config = match reader.load(&callback_public_id).await {
        Ok(Some(config)) => config,
        Ok(None) => return component_callback_not_found_error(),
        Err(error) => {
            return iam_api_error(
                StatusCode::SERVICE_UNAVAILABLE,
                "iam_oauth_component_callback_unavailable",
                &error.to_string(),
            )
        }
    };
    let request = WechatComponentUrlVerificationRequest {
        token: &config.callback_token,
        encoding_aes_key: &config.encoding_aes_key,
        component_app_id: &config.component_app_id,
        timestamp: query
            .get("timestamp")
            .map(String::as_str)
            .unwrap_or_default(),
        nonce: query.get("nonce").map(String::as_str).unwrap_or_default(),
        signature: query
            .get("signature")
            .map(String::as_str)
            .unwrap_or_default(),
        echostr: query.get("echostr").map(String::as_str).unwrap_or_default(),
    };
    match verify_component_url(&request) {
        Ok(echo) => plain_text_response(&echo),
        Err(error) => component_callback_verification_error(&error.to_string()),
    }
}

async fn handle_component_callback_post(
    State(state): State<OpenIamState>,
    Path(callback_public_id): Path<String>,
    Query(query): Query<HashMap<String, String>>,
    body: Bytes,
) -> Response {
    let Ok(pg) = state.require_pool() else {
        return component_callback_unavailable_error();
    };
    let reader = PgComponentCallbackConfigReader::new(pg.clone());
    let config = match reader.load(&callback_public_id).await {
        Ok(Some(config)) => config,
        Ok(None) => return component_callback_not_found_error(),
        Err(error) => {
            return iam_api_error(
                StatusCode::SERVICE_UNAVAILABLE,
                "iam_oauth_component_callback_unavailable",
                &error.to_string(),
            )
        }
    };
    let Ok(body) = std::str::from_utf8(&body) else {
        return iam_api_error(
            StatusCode::BAD_REQUEST,
            "iam_oauth_component_callback_invalid",
            "wechat component callback body is not UTF-8",
        );
    };
    let request = WechatComponentCallbackRequest {
        token: &config.callback_token,
        encoding_aes_key: &config.encoding_aes_key,
        component_app_id: &config.component_app_id,
        timestamp: query
            .get("timestamp")
            .map(String::as_str)
            .unwrap_or_default(),
        nonce: query.get("nonce").map(String::as_str).unwrap_or_default(),
        msg_signature: query
            .get("msg_signature")
            .map(String::as_str)
            .unwrap_or_default(),
        body,
    };
    let event = match parse_component_callback(&request) {
        Ok(event) => event,
        Err(error) => return component_callback_verification_error(&error.to_string()),
    };
    let dedupe_key = callback_dedupe_key(
        &event.raw_info_type,
        event.authorizer_app_id.as_deref(),
        event.create_time,
    );
    let now = now_epoch_seconds();
    let payload = serde_json::json!({
        "infoType": event.raw_info_type,
        "authorizerAppId": event.authorizer_app_id,
        "createTime": event.create_time,
        "hasVerificationTicket": event.component_verify_ticket.is_some(),
    })
    .to_string();
    let _ = sqlx::query(
        "INSERT INTO iam_oauth_channel_callback_event \
            (id, uuid, tenant_id, operator_platform_id, callback_public_id, dedupe_key, \
             event_kind, payload_json, received_at, status, created_at, updated_at) \
         VALUES (gen_random_uuid()::text, gen_random_uuid()::text, $1, $2, $3, $4, \
                 $5, $6, $7, 'received', $7, $7) \
         ON CONFLICT (callback_public_id, dedupe_key) DO NOTHING",
    )
    .bind(&config.tenant_id)
    .bind(&config.platform_id)
    .bind(&callback_public_id)
    .bind(&dedupe_key)
    .bind(&event.raw_info_type)
    .bind(&payload)
    .bind(now.to_string())
    .execute(pg)
    .await;
    if event.info_type == WechatComponentInfoType::VerifyTicket {
        let tickets = WechatComponentTicketService::new(PgComponentTicketStore::new(pg.clone()));
        let _ = tickets.record(&event, now).await;
    }
    plain_text_response("success")
}

async fn handle_authorizer_callback_get(
    State(state): State<OpenIamState>,
    Path((callback_public_id, authorizer_app_id)): Path<(String, String)>,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let Ok(pg) = state.require_pool() else {
        return component_callback_unavailable_error();
    };
    let reader = PgComponentCallbackConfigReader::new(pg.clone());
    let config = match reader.load(&callback_public_id).await {
        Ok(Some(config)) => config,
        Ok(None) => return component_callback_not_found_error(),
        Err(error) => {
            return iam_api_error(
                StatusCode::SERVICE_UNAVAILABLE,
                "iam_oauth_component_callback_unavailable",
                &error.to_string(),
            )
        }
    };
    let request = WechatComponentUrlVerificationRequest {
        token: &config.callback_token,
        encoding_aes_key: &config.encoding_aes_key,
        component_app_id: &authorizer_app_id,
        timestamp: query
            .get("timestamp")
            .map(String::as_str)
            .unwrap_or_default(),
        nonce: query.get("nonce").map(String::as_str).unwrap_or_default(),
        signature: query
            .get("signature")
            .map(String::as_str)
            .unwrap_or_default(),
        echostr: query.get("echostr").map(String::as_str).unwrap_or_default(),
    };
    match verify_component_url(&request) {
        Ok(echo) => plain_text_response(&echo),
        Err(error) => component_callback_verification_error(&error.to_string()),
    }
}

async fn handle_authorizer_callback_post(
    State(state): State<OpenIamState>,
    Path((callback_public_id, authorizer_app_id)): Path<(String, String)>,
    Query(query): Query<HashMap<String, String>>,
    body: Bytes,
) -> Response {
    let Ok(pg) = state.require_pool() else {
        return component_callback_unavailable_error();
    };
    let reader = PgComponentCallbackConfigReader::new(pg.clone());
    let config = match reader.load(&callback_public_id).await {
        Ok(Some(config)) => config,
        Ok(None) => return component_callback_not_found_error(),
        Err(error) => {
            return iam_api_error(
                StatusCode::SERVICE_UNAVAILABLE,
                "iam_oauth_component_callback_unavailable",
                &error.to_string(),
            )
        }
    };
    let Ok(body) = std::str::from_utf8(&body) else {
        return iam_api_error(
            StatusCode::BAD_REQUEST,
            "iam_oauth_authorizer_callback_invalid",
            "wechat authorizer callback body is not UTF-8",
        );
    };
    let timestamp = query
        .get("timestamp")
        .map(String::as_str)
        .unwrap_or_default();
    let nonce = query.get("nonce").map(String::as_str).unwrap_or_default();
    let msg_signature = query
        .get("msg_signature")
        .map(String::as_str)
        .unwrap_or_default();
    let encrypted = match extract_encrypted_payload(body) {
        Ok(encrypted) => encrypted,
        Err(error) => return component_callback_verification_error(&error.to_string()),
    };
    if !verify_callback_signature(
        &config.callback_token,
        timestamp,
        nonce,
        Some(&encrypted),
        msg_signature,
    ) {
        return component_callback_verification_error("signature verification failed");
    }
    let (plain, receive_id) = match decrypt_wechat_blob(&config.encoding_aes_key, &encrypted) {
        Ok(payload) => payload,
        Err(error) => return component_callback_verification_error(&error.to_string()),
    };
    if receive_id.trim() != authorizer_app_id.trim() {
        return component_callback_verification_error(
            "authorizer appid does not match the callback path",
        );
    }
    let Ok(plain) = std::str::from_utf8(&plain) else {
        return iam_api_error(
            StatusCode::BAD_REQUEST,
            "iam_oauth_authorizer_callback_invalid",
            "decrypted authorizer message is not UTF-8",
        );
    };
    let message = match parse_authorizer_message(plain) {
        Ok(message) => message,
        Err(error) => {
            return iam_api_error(
                StatusCode::BAD_REQUEST,
                "iam_oauth_authorizer_callback_invalid",
                &error.to_string(),
            )
        }
    };
    let now = now_epoch_seconds();
    let payload = serde_json::json!({
        "msgType": message.msg_type,
        "event": message.event,
        "msgId": message.msg_id,
        "createTime": message.create_time,
    })
    .to_string();
    let _ = sqlx::query(
        "INSERT INTO iam_oauth_channel_callback_event \
            (id, uuid, tenant_id, operator_platform_id, callback_public_id, dedupe_key, \
             event_kind, payload_json, received_at, status, created_at, updated_at) \
         VALUES (gen_random_uuid()::text, gen_random_uuid()::text, $1, $2, $3, $4, \
                 $5, $6, $7, 'received', $7, $7) \
         ON CONFLICT (callback_public_id, dedupe_key) DO NOTHING",
    )
    .bind(&config.tenant_id)
    .bind(&config.platform_id)
    .bind(&callback_public_id)
    .bind(message_dedupe_key(&message))
    .bind(&message.msg_type)
    .bind(&payload)
    .bind(now.to_string())
    .execute(pg)
    .await;
    match decide_message_action(&message) {
        AuthorizerMessageAction::ReplyText(text) => {
            let reply = build_text_reply(&message, &text, now);
            match encrypt_reply_envelope(
                &config.encoding_aes_key,
                &config.callback_token,
                &authorizer_app_id,
                &reply,
                now,
                &now.to_string(),
            ) {
                Ok(envelope) => xml_response(&envelope),
                Err(error) => component_callback_verification_error(&error.to_string()),
            }
        }
        // WeChat requires an empty body within five seconds; the follow-up
        // customer-service message is sent here, before the response.
        AuthorizerMessageAction::QueryAuthCode(code) => {
            acknowledge_full_release_query_code(pg, &config, &message, &code, now).await;
            plain_text_response("")
        }
        AuthorizerMessageAction::Acknowledge => plain_text_response("success"),
    }
}

fn xml_response(body: &str) -> Response {
    axum::response::Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "text/xml; charset=utf-8")
        .body(axum::body::Body::from(body.to_string()))
        .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response())
}

/// Exchanges a full-release `QUERY_AUTH_CODE` code and sends `$code_from_api`.
async fn acknowledge_full_release_query_code(
    pg: &sqlx::PgPool,
    config: &ComponentCallbackConfig,
    message: &AuthorizerMessage,
    authorization_code: &str,
    now: i64,
) {
    let reader = PgComponentPlatformConfigReader::new(pg.clone());
    let platform = match reader.load(&config.platform_id).await {
        Ok(Some(platform)) => platform,
        Ok(None) => {
            tracing::warn!("full-release query auth code: operator platform not found");
            return;
        }
        Err(error) => {
            tracing::warn!(error = %error, "full-release query auth code: platform load failed");
            return;
        }
    };
    let Ok(token_transport) = ReqwestWechatComponentTransport::new() else {
        tracing::warn!("full-release query auth code: transport unavailable");
        return;
    };
    let Ok(api_transport) = ReqwestWechatComponentTransport::new() else {
        tracing::warn!("full-release query auth code: transport unavailable");
        return;
    };
    let tokens = WechatComponentTokenService::new(
        PgComponentTokenCache::new(pg.clone()),
        WechatComponentApi::new(token_transport),
    );
    let api = WechatComponentApi::new(api_transport);
    let component_token = match tokens
        .resolve_single_flight(
            &platform.component_app_id,
            &platform.component_app_secret,
            &platform.component_verify_ticket,
            now,
        )
        .await
    {
        Ok(token) => token,
        Err(error) => {
            tracing::warn!(error = %error, "full-release query auth code: component token failed");
            return;
        }
    };
    let authorization = match api
        .query_authorization(
            &component_token.access_token,
            &platform.component_app_id,
            authorization_code,
        )
        .await
    {
        Ok(authorization) => authorization,
        Err(error) => {
            tracing::warn!(error = %error, "full-release query auth code: exchange failed");
            return;
        }
    };
    let content = format!("{authorization_code}_from_api");
    if let Err(error) = api
        .send_custom_text(
            &authorization.authorizer_access_token,
            &message.from_user,
            &content,
        )
        .await
    {
        tracing::warn!(error = %error, "full-release query auth code: customer message failed");
    }
}

fn plain_text_response(body: &str) -> Response {
    axum::response::Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "text/plain; charset=utf-8")
        .body(axum::body::Body::from(body.to_string()))
        .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response())
}

fn component_callback_unavailable_error() -> Response {
    iam_api_error(
        StatusCode::SERVICE_UNAVAILABLE,
        "iam_oauth_component_callback_unavailable",
        "Component callback processing is not configured",
    )
}

fn component_callback_not_found_error() -> Response {
    iam_api_error(
        StatusCode::NOT_FOUND,
        "iam_oauth_component_callback_not_found",
        "Component callback id is not configured",
    )
}

fn component_callback_verification_error(detail: &str) -> Response {
    iam_api_error(
        StatusCode::FORBIDDEN,
        "iam_oauth_component_callback_verification_failed",
        detail,
    )
}
