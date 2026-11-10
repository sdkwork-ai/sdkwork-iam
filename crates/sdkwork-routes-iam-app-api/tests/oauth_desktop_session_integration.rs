//! End-to-end coverage for the desktop browser-login redeem leg:
//! `POST /app/v3/api/oauth/desktop_sessions` (`oauth.desktopSessions.create`).
//!
//! Run with `--test-threads=1`: every test owns the shared IAM env mutex and
//! the same database; parallel execution blocks the runtime while one test
//! waits for the env and makes the suite appear to hang.
//!
//! Flow under test (mirrors an Electron/Tauri system-browser login):
//! credential-entry password login -> OAuth authorize (public client + PKCE
//! S256, deep-link redirect) -> authorization completion -> the desktop app
//! redeems the deep-link code for a standard dual-token session.
//!
//! The fixture runs against the bootstrapped default tenant because
//! personal-login sessions persist `organization_id = "0"`, and
//! `iam_organization` currently allows only one tenant to own the sentinel
//! row (global `id` primary key).

use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use axum::Router;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use http_body_util::BodyExt;
use sdkwork_iam_context_service::{AuthLevel, DeploymentMode, Environment, IamAppContext};
use sdkwork_iam_web_adapter::{
    complete_authorization_state, create_pending_authorization_state,
    default_account_binding_policy, ensure_platform_tenant_application,
    exchange_authorization_code, introspect_oauth_token, parse_relying_party_config,
    platform_runtime_app_id_for_tenant, resolve_relying_party_client, revoke_oauth_token,
    validate_authorize_request, AuthorizeRequest,
};
use sdkwork_web_core::bootstrap_access_token_jwt;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use tower::ServiceExt;

#[path = "unified_database_env.rs"]
mod unified_database_env;

const DESKTOP_E2E_TENANT_ID: &str = sdkwork_iam_bootstrap::DEFAULT_IAM_TENANT_ID;
const DESKTOP_E2E_CLIENT_APP_ID: &str = "app_desktop_e2e_partner";
const DESKTOP_E2E_TEMPLATE_ID: &str = "tmpl_desktop_partner_e2e";
const DESKTOP_E2E_USERNAME: &str = "desktop-e2e@sdkwork-iam.test";
const DESKTOP_E2E_PASSWORD: &str = "DesktopE2e#2026";
const DESKTOP_E2E_REDIRECT_URI: &str = "sdkwork-iam://auth/callback";
/// Web redirect registered for the same client: its codes must never become a
/// desktop session (RFC 8252 surface binding).
const DESKTOP_E2E_WEB_REDIRECT_URI: &str = "https://desktop-e2e.sdkwork.test/oauth/callback";

fn lock_local_iam_env() -> std::sync::MutexGuard<'static, ()> {
    static ENV_LOCK: std::sync::OnceLock<std::sync::Mutex<()>> = std::sync::OnceLock::new();
    ENV_LOCK
        .get_or_init(|| std::sync::Mutex::new(()))
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

fn configure_desktop_e2e_env() {
    // SAFETY: test setup runs single-threaded under the IAM env mutex.
    unsafe {
        std::env::set_var("SDKWORK_ENV", "test");
        std::env::set_var("SDKWORK_IAM_ALLOW_DEV_AUTH_FALLBACK", "true");
        std::env::set_var("SDKWORK_IAM_RATE_LIMIT_MAX_REQUESTS", "10000");
        std::env::set_var("SDKWORK_IAM_RATE_LIMIT_WINDOW_SECONDS", "60");
    }
    let _ = tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .with_test_writer()
        .try_init();
}

async fn postgres_pool_for_tests() -> PgPool {
    unified_database_env::apply_workspace_postgres_env();
    unified_database_env::configure_integration_test_database_pool();
    unified_database_env::postgres_pool_for_integration_tests().await
}

async fn build_desktop_e2e_app() -> Router {
    let pool = unified_database_env::integration_database_pool_for_router().await;
    sdkwork_routes_iam_app_api::build_sdkwork_iam_app_api_router_with_initialized_pool(pool)
        .await
        .expect("desktop e2e router should build")
}

fn pkce_pair(verifier: &str) -> (String, String) {
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    (verifier.to_string(), challenge)
}

async fn read_json(response: axum::response::Response) -> Value {
    let body = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).unwrap_or(Value::Null)
}

fn iam_context_from_login_data(data: &Value) -> IamAppContext {
    let context = &data["context"];
    IamAppContext::new(
        context["tenantId"].as_str().expect("tenantId"),
        context.get("organizationId").and_then(Value::as_str),
        context["userId"].as_str().expect("userId"),
        context["sessionId"].as_str().expect("sessionId"),
        context["appId"].as_str().expect("appId"),
        Environment::Prod,
        DeploymentMode::Saas,
        AuthLevel::Password,
        vec![],
        vec!["iam:self".to_string()],
    )
}

async fn seed_desktop_e2e_fixtures(pg: &PgPool) -> String {
    use argon2::password_hash::PasswordHasher;

    let now = chrono::Utc::now();
    let user_id = format!("iamu_{}", uuid::Uuid::now_v7());

    // Remove leftovers from earlier runs of this fixture (enumerated ids and
    // the fixture user only, never the shared default-tenant baseline).
    for statement in [
        "DELETE FROM iam_session WHERE user_id IN \
         (SELECT id FROM iam_user WHERE tenant_id = $1 AND email = $2)",
        "DELETE FROM iam_credential WHERE tenant_id = $1 AND user_id IN \
         (SELECT id FROM iam_user WHERE tenant_id = $1 AND email = $2)",
        "DELETE FROM iam_tenant_member WHERE tenant_id = $1 AND user_id IN \
         (SELECT id FROM iam_user WHERE tenant_id = $1 AND email = $2)",
        "DELETE FROM iam_user WHERE tenant_id = $1 AND email = $2",
        "DELETE FROM iam_tenant_application WHERE app_id = $3",
        "DELETE FROM iam_application_template WHERE id = $3",
    ] {
        let _ = sqlx::query(statement)
            .bind(DESKTOP_E2E_TENANT_ID)
            .bind(DESKTOP_E2E_USERNAME)
            .bind(DESKTOP_E2E_CLIENT_APP_ID)
            .execute(pg)
            .await;
    }

    let password_hash = argon2::Argon2::default()
        .hash_password(
            DESKTOP_E2E_PASSWORD.as_bytes(),
            &argon2::password_hash::SaltString::generate(
                &mut argon2::password_hash::rand_core::OsRng,
            ),
        )
        .expect("hash desktop e2e password")
        .to_string();

    sqlx::query(
        "INSERT INTO iam_user (id, tenant_id, username, display_name, email, phone, \
                email_verified, phone_verified, status, created_at, updated_at) \
         VALUES ($1, $2, $3, 'Desktop E2E User', $3, NULL, 1, 0, 'active', $4, $4)",
    )
    .bind(&user_id)
    .bind(DESKTOP_E2E_TENANT_ID)
    .bind(DESKTOP_E2E_USERNAME)
    .bind(&now)
    .execute(pg)
    .await
    .expect("insert desktop e2e user");

    sqlx::query(
        "INSERT INTO iam_credential (id, tenant_id, user_id, credential_type, credential_hash, \
                failed_attempts, status, created_at, updated_at) \
         VALUES ($1, $2, $3, 'password', $4, 0, 'active', $5, $5)",
    )
    .bind(format!("iamc_{}", uuid::Uuid::now_v7()))
    .bind(DESKTOP_E2E_TENANT_ID)
    .bind(&user_id)
    .bind(&password_hash)
    .bind(&now)
    .execute(pg)
    .await
    .expect("insert desktop e2e credential");

    sqlx::query(
        "INSERT INTO iam_tenant_member (id, tenant_id, user_id, member_kind, status, joined_at, created_at, updated_at) \
         VALUES ($1, $2, $3, 'member', 'active', $4, $4, $4)",
    )
    .bind(format!("iamtm_{}", uuid::Uuid::now_v7()))
    .bind(DESKTOP_E2E_TENANT_ID)
    .bind(&user_id)
    .bind(&now)
    .execute(pg)
    .await
    .expect("insert desktop e2e tenant member");

    // The personal-login session of the desktop user persists organization_id
    // "0"; the default tenant owns that sentinel organization row.
    ensure_platform_tenant_application(pg, DESKTOP_E2E_TENANT_ID)
        .await
        .expect("provision desktop e2e platform tenant application");

    // The hosted login completes the authorization over HTTP with the session
    // dual tokens, so the tenant needs its signing key the same way a deployed
    // tenant does; without it login falls back to a process key and the
    // resolver rejects the session it just issued.
    sdkwork_iam_bootstrap::ensure_postgres_tenant_signing_key(pg, DESKTOP_E2E_TENANT_ID)
        .await
        .expect("provision desktop e2e tenant signing key");

    let runtime_config = json!({
        "oauth": {
            "relyingParty": {
                "enabled": true,
                "redirectUris": [DESKTOP_E2E_REDIRECT_URI, DESKTOP_E2E_WEB_REDIRECT_URI],
                "allowedScopes": ["openid", "profile", "email"],
                "confidential": false
            }
        }
    });
    let parsed = parse_relying_party_config(&runtime_config);
    assert!(parsed.enabled, "desktop e2e relying party must be enabled");

    sqlx::query(
        "INSERT INTO iam_application_template (id, owner_tenant_id, app_key, name, display_name, app_type, \
         version, channel, status, runtime_config_json, artifacts_config_json, default_access_permissions_json, \
         created_at, updated_at) \
         VALUES ($1, '0', $2, $2, 'Desktop Partner E2E', 'WEB', '1.0.0', 'stable', 'active', '{}'::jsonb, '{}'::jsonb, \
         '[\"iam:self\"]'::jsonb, $3, $3) \
         ON CONFLICT (id) DO UPDATE SET status = 'active', updated_at = EXCLUDED.updated_at",
    )
    .bind(DESKTOP_E2E_TEMPLATE_ID)
    .bind(DESKTOP_E2E_CLIENT_APP_ID)
    .bind(&now)
    .execute(pg)
    .await
    .expect("insert desktop e2e partner application template");

    sqlx::query(
        "INSERT INTO iam_tenant_application (id, app_id, tenant_id, organization_id, template_id, \
         template_version, instance_key, display_name, environment, application_type, status, primary_domain, \
         domain_config_json, access_permissions_json, runtime_config_json, provisioned_at, activated_at, \
         created_at, updated_at) \
         VALUES ($1, $2, $3, '0', $4, '1.0.0', 'desktop-partner', 'Desktop Partner', 'prod', 'other', 'enabled', \
         'desktop-e2e.sdkwork.test', '{}'::jsonb, '[\"iam:self\"]'::jsonb, $5::jsonb, $6, $6, $6, $6) \
         ON CONFLICT (id) DO UPDATE SET runtime_config_json = EXCLUDED.runtime_config_json, \
         status = 'enabled', updated_at = EXCLUDED.updated_at",
    )
    .bind(format!("tapp_{DESKTOP_E2E_TENANT_ID}_desktop_partner"))
    .bind(DESKTOP_E2E_CLIENT_APP_ID)
    .bind(DESKTOP_E2E_TENANT_ID)
    .bind(DESKTOP_E2E_TEMPLATE_ID)
    .bind(runtime_config.to_string())
    .bind(&now)
    .execute(pg)
    .await
    .expect("insert desktop e2e relying party tenant application");

    user_id
}

async fn login_desktop_e2e_session(app: &Router) -> (Value, IamAppContext) {
    let access_token = bootstrap_access_token_jwt(
        DESKTOP_E2E_TENANT_ID,
        platform_runtime_app_id_for_tenant(DESKTOP_E2E_TENANT_ID).as_str(),
    );
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/auth/sessions")
                .header("content-type", "application/json")
                .header("access-token", access_token)
                .body(Body::from(
                    json!({
                        "grantType": "password",
                        "username": DESKTOP_E2E_USERNAME,
                        "password": DESKTOP_E2E_PASSWORD
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .expect("desktop e2e login request");
    let login_status = response.status();
    let body = read_json(response).await;
    assert_eq!(
        login_status,
        StatusCode::OK,
        "desktop e2e login failed: {}",
        serde_json::to_string(&body).unwrap_or_default()
    );
    assert_eq!(body["code"].as_i64(), Some(0));
    let data = body["data"].clone();
    let context = iam_context_from_login_data(&data);
    (data, context)
}

async fn redeem_desktop_session(
    app: &Router,
    authorization_code: &str,
    code_verifier: &str,
    redirect_uri: &str,
    device_id: Option<&str>,
) -> (StatusCode, Value) {
    let mut command = json!({
        "clientId": DESKTOP_E2E_CLIENT_APP_ID,
        "authorizationCode": authorization_code,
        "codeVerifier": code_verifier,
        "redirectUri": redirect_uri
    });
    if let Some(device_id) = device_id {
        command["deviceId"] = Value::String(device_id.to_string());
    }
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/oauth/desktop_sessions")
                .header("content-type", "application/json")
                .body(Body::from(command.to_string()))
                .unwrap(),
        )
        .await
        .expect("desktop session request");
    let status = response.status();
    (status, read_json(response).await)
}

/// Completes a pending authorization over HTTP exactly as the hosted login
/// page does: the signed-in browser session's dual tokens authorize the call.
async fn complete_authorization_over_http(
    app: &Router,
    authorization_state_id: &str,
    login_session: &Value,
) -> Value {
    let access_token = login_session["accessToken"]
        .as_str()
        .expect("login access token");
    let auth_token = login_session["authToken"]
        .as_str()
        .expect("login auth token");
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!(
                    "/app/v3/api/oauth/authorizations/{authorization_state_id}/completions"
                ))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {auth_token}"))
                .header("access-token", access_token)
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .expect("authorization completion request");
    let status = response.status();
    let body = read_json(response).await;
    assert_eq!(
        status,
        StatusCode::OK,
        "hosted-login completion failed: {}",
        serde_json::to_string(&body).unwrap_or_default()
    );
    body["data"].clone()
}

/// Issues one desktop authorization code through the hosted-login completion
/// path, exactly as the browser page does after sign-in.
async fn issue_desktop_code(
    app: &Router,
    pg: &PgPool,
    client: &sdkwork_iam_web_adapter::ResolvedRelyingParty,
    login_session: &Value,
    state: &str,
    verifier_seed: &str,
) -> (String, String) {
    let (code_verifier, code_challenge) = pkce_pair(verifier_seed);
    let request = AuthorizeRequest {
        client_id: DESKTOP_E2E_CLIENT_APP_ID.to_string(),
        redirect_uri: DESKTOP_E2E_REDIRECT_URI.to_string(),
        response_type: "code".to_string(),
        scope: "openid profile email".to_string(),
        state: Some(state.to_string()),
        code_challenge: Some(code_challenge),
        code_challenge_method: Some("S256".to_string()),
        tenant_id: Some(DESKTOP_E2E_TENANT_ID.to_string()),
    };
    let scopes =
        validate_authorize_request(&request, client).expect("authorize device e2e request");
    let (authorization_state_id, _) =
        create_pending_authorization_state(pg, client, &request, &scopes)
            .await
            .expect("create device e2e pending authorization state");
    let completion =
        complete_authorization_over_http(app, &authorization_state_id, login_session).await;
    let authorization_code = completion["authorizationCode"]
        .as_str()
        .filter(|value| !value.is_empty())
        .expect("device e2e authorization code")
        .to_owned();
    (authorization_code, code_verifier)
}

/// Active desktop sessions of the e2e user as `(session id, device id)`.
async fn active_desktop_sessions(pg: &PgPool, user_id: &str) -> Vec<(String, Option<String>)> {
    sqlx::query_as(
        "SELECT id, device_id FROM iam_session \
         WHERE tenant_id = $1 AND user_id = $2 AND app_id = $3 AND revoked_at IS NULL \
         ORDER BY created_at",
    )
    .bind(DESKTOP_E2E_TENANT_ID)
    .bind(user_id)
    .bind(DESKTOP_E2E_CLIENT_APP_ID)
    .fetch_all(pg)
    .await
    .expect("list active desktop sessions")
}

#[tokio::test]
async fn desktop_sessions_are_scoped_to_the_device() {
    let _env_guard = lock_local_iam_env();
    configure_desktop_e2e_env();

    let app = build_desktop_e2e_app().await;
    let pg = postgres_pool_for_tests().await;
    let user_id = seed_desktop_e2e_fixtures(&pg).await;

    let (login_session, _) = login_desktop_e2e_session(&app).await;
    let client =
        resolve_relying_party_client(&pg, DESKTOP_E2E_CLIENT_APP_ID, Some(DESKTOP_E2E_TENANT_ID))
            .await
            .expect("resolve desktop e2e relying party client");

    // First device.
    let (code_a1, verifier_a1) = issue_desktop_code(
        &app,
        &pg,
        &client,
        &login_session,
        "device-state-a1",
        "device-verifier-a1-with-sufficient-length-for-pkce",
    )
    .await;
    let (status, body) = redeem_desktop_session(
        &app,
        &code_a1,
        &verifier_a1,
        DESKTOP_E2E_REDIRECT_URI,
        Some("device-a"),
    )
    .await;
    assert_eq!(
        status,
        StatusCode::OK,
        "device a redeem failed: {}",
        serde_json::to_string(&body).unwrap_or_default()
    );
    let first_session_id = body["data"]["sessionId"]
        .as_str()
        .expect("device a session id")
        .to_owned();

    // Second device: the two sessions must coexist.
    let (code_b1, verifier_b1) = issue_desktop_code(
        &app,
        &pg,
        &client,
        &login_session,
        "device-state-b1",
        "device-verifier-b1-with-sufficient-length-for-pkce",
    )
    .await;
    let (status, body) = redeem_desktop_session(
        &app,
        &code_b1,
        &verifier_b1,
        DESKTOP_E2E_REDIRECT_URI,
        Some("device-b"),
    )
    .await;
    assert_eq!(
        status,
        StatusCode::OK,
        "device b redeem failed: {}",
        serde_json::to_string(&body).unwrap_or_default()
    );
    let second_session_id = body["data"]["sessionId"]
        .as_str()
        .expect("device b session id")
        .to_owned();

    let active = active_desktop_sessions(&pg, &user_id).await;
    assert_eq!(
        active.len(),
        2,
        "both devices must keep an active session: {active:?}"
    );

    // The same device logs in again: only its previous session is replaced.
    let (code_a2, verifier_a2) = issue_desktop_code(
        &app,
        &pg,
        &client,
        &login_session,
        "device-state-a2",
        "device-verifier-a2-with-sufficient-length-for-pkce",
    )
    .await;
    let (status, body) = redeem_desktop_session(
        &app,
        &code_a2,
        &verifier_a2,
        DESKTOP_E2E_REDIRECT_URI,
        Some("device-a"),
    )
    .await;
    assert_eq!(
        status,
        StatusCode::OK,
        "device a re-login failed: {}",
        serde_json::to_string(&body).unwrap_or_default()
    );
    let third_session_id = body["data"]["sessionId"]
        .as_str()
        .expect("device a re-login session id")
        .to_owned();

    let active = active_desktop_sessions(&pg, &user_id).await;
    assert_eq!(
        active.len(),
        2,
        "device a re-login must replace only device a: {active:?}"
    );
    assert!(
        !active
            .iter()
            .any(|(session_id, _)| session_id == &first_session_id),
        "device a's previous session must be revoked"
    );
    assert!(
        active
            .iter()
            .any(|(session_id, _)| session_id == &second_session_id),
        "device b's session must remain active"
    );
    assert!(
        active
            .iter()
            .any(|(session_id, _)| session_id == &third_session_id),
        "device a's new session must be active"
    );

    // The browser session that completed the authorizations is untouched.
    let access_token = login_session["accessToken"]
        .as_str()
        .filter(|value| !value.is_empty())
        .expect("login access token");
    let auth_token = login_session["authToken"]
        .as_str()
        .filter(|value| !value.is_empty())
        .expect("login auth token");
    let current = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/app/v3/api/auth/sessions/current")
                .header("authorization", format!("Bearer {auth_token}"))
                .header("access-token", access_token)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .expect("browser session request after device logins");
    assert_eq!(
        current.status(),
        StatusCode::OK,
        "device logins must not revoke the browser session"
    );
}

#[tokio::test]
async fn logout_revokes_the_session_with_only_the_refresh_token() {
    let _env_guard = lock_local_iam_env();
    configure_desktop_e2e_env();

    let app = build_desktop_e2e_app().await;
    let pg = postgres_pool_for_tests().await;
    seed_desktop_e2e_fixtures(&pg).await;
    let (login_session, _) = login_desktop_e2e_session(&app).await;
    let refresh_token = login_session["refreshToken"]
        .as_str()
        .filter(|value| !value.is_empty())
        .expect("login refresh token")
        .to_owned();
    let access_token = login_session["accessToken"]
        .as_str()
        .filter(|value| !value.is_empty())
        .expect("login access token")
        .to_owned();
    let auth_token = login_session["authToken"]
        .as_str()
        .filter(|value| !value.is_empty())
        .expect("login auth token")
        .to_owned();

    // The session is valid before logout.
    let before = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/app/v3/api/auth/sessions/current")
                .header("authorization", format!("Bearer {auth_token}"))
                .header("access-token", access_token.clone())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .expect("current session before logout");
    assert_eq!(before.status(), StatusCode::OK);

    // Logout accepts the refresh token without an access token, which is what
    // lets a client revoke the server session after the access token expired.
    let logout = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/auth/sessions/current/logout")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({ "refreshToken": refresh_token }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .expect("logout request");
    assert_eq!(logout.status(), StatusCode::NO_CONTENT);

    // The session's tokens no longer authenticate.
    let after = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/app/v3/api/auth/sessions/current")
                .header("authorization", format!("Bearer {auth_token}"))
                .header("access-token", access_token)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .expect("current session after logout");
    assert_eq!(after.status(), StatusCode::UNAUTHORIZED);

    // Logout is idempotent.
    let replay = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/auth/sessions/current/logout")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({ "refreshToken": refresh_token }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .expect("replayed logout request");
    assert_eq!(replay.status(), StatusCode::NO_CONTENT);
}

#[tokio::test]
async fn refresh_retry_within_grace_keeps_the_rotated_session_alive() {
    let _env_guard = lock_local_iam_env();
    configure_desktop_e2e_env();

    let app = build_desktop_e2e_app().await;
    let pg = postgres_pool_for_tests().await;
    seed_desktop_e2e_fixtures(&pg).await;
    let (login_session, _) = login_desktop_e2e_session(&app).await;
    let old_refresh_token = login_session["refreshToken"]
        .as_str()
        .filter(|value| !value.is_empty())
        .expect("login refresh token")
        .to_owned();

    // The first refresh rotates the session and revokes the old row.
    let refreshed = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/auth/sessions/refresh")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({ "refreshToken": old_refresh_token }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .expect("refresh request");
    let refreshed_status = refreshed.status();
    let refreshed_body = read_json(refreshed).await;
    assert_eq!(
        refreshed_status,
        StatusCode::OK,
        "refresh failed: {}",
        serde_json::to_string(&refreshed_body).unwrap_or_default()
    );
    let new_auth_token = refreshed_body["data"]["authToken"]
        .as_str()
        .expect("rotated auth token")
        .to_owned();
    let new_access_token = refreshed_body["data"]["accessToken"]
        .as_str()
        .expect("rotated access token")
        .to_owned();

    // A client that timed out after the server committed the rotation retries
    // the old token. It must be rejected, but it must not be treated as theft:
    // the rotated session has to stay usable.
    let retry = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/auth/sessions/refresh")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({ "refreshToken": old_refresh_token }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .expect("refresh retry request");
    assert_eq!(retry.status(), StatusCode::UNAUTHORIZED);

    let active_sessions: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM iam_session s \
         JOIN iam_user u ON u.id = s.user_id AND u.tenant_id = s.tenant_id \
         WHERE u.email = $1 AND s.revoked_at IS NULL",
    )
    .bind(DESKTOP_E2E_USERNAME)
    .fetch_one(&pg)
    .await
    .expect("count active sessions");
    assert!(
        active_sessions >= 1,
        "the rotated session must survive a retried refresh"
    );

    let current = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/app/v3/api/auth/sessions/current")
                .header("authorization", format!("Bearer {new_auth_token}"))
                .header("access-token", new_access_token)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .expect("current session after refresh retry");
    assert_eq!(
        current.status(),
        StatusCode::OK,
        "a retried refresh must not revoke the rotated session"
    );
}

#[tokio::test]
async fn refresh_reuse_outside_the_grace_window_still_revokes_the_user_sessions() {
    let _env_guard = lock_local_iam_env();
    configure_desktop_e2e_env();
    // SAFETY: test setup runs single-threaded under the IAM env mutex.
    unsafe {
        std::env::set_var("SDKWORK_IAM_REFRESH_REUSE_GRACE_SECONDS", "0");
    }

    let app = build_desktop_e2e_app().await;
    let pg = postgres_pool_for_tests().await;
    seed_desktop_e2e_fixtures(&pg).await;
    let (login_session, _) = login_desktop_e2e_session(&app).await;
    let old_refresh_token = login_session["refreshToken"]
        .as_str()
        .expect("login refresh token")
        .to_owned();

    let refreshed = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/auth/sessions/refresh")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({ "refreshToken": old_refresh_token }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .expect("refresh request");
    assert_eq!(refreshed.status(), StatusCode::OK);

    let retry = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/auth/sessions/refresh")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({ "refreshToken": old_refresh_token }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .expect("refresh retry request");
    assert_eq!(retry.status(), StatusCode::UNAUTHORIZED);

    let active_sessions: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM iam_session s \
         JOIN iam_user u ON u.id = s.user_id AND u.tenant_id = s.tenant_id \
         WHERE u.email = $1 AND s.revoked_at IS NULL",
    )
    .bind(DESKTOP_E2E_USERNAME)
    .fetch_one(&pg)
    .await
    .expect("count active sessions");
    assert_eq!(
        active_sessions, 0,
        "reuse outside the grace window must revoke the user's sessions"
    );

    unsafe {
        std::env::remove_var("SDKWORK_IAM_REFRESH_REUSE_GRACE_SECONDS");
    }
}

#[tokio::test]
async fn admin_provider_catalog_entries_appear_on_the_login_surface() {
    let _env_guard = lock_local_iam_env();
    configure_desktop_e2e_env();

    let app = build_desktop_e2e_app().await;
    let pg = postgres_pool_for_tests().await;
    seed_desktop_e2e_fixtures(&pg).await;

    let tenant_id = DESKTOP_E2E_TENANT_ID;
    let runtime_app_id = platform_runtime_app_id_for_tenant(tenant_id);
    let provider_code = "custom_e2e_provider";
    let catalog_id = "cat_custom_e2e_provider";
    let integration_id = "int_custom_e2e_provider";
    let now = chrono::Utc::now().to_rfc3339();

    // The login provider list is policy-gated; enable OAuth login for this
    // tenant while the test runs, restoring the previous policy afterwards.
    let previous_policy: Option<String> = sqlx::query_scalar(
        "SELECT policy_json FROM iam_policy \
         WHERE tenant_id = $1 AND code = 'iam.account_binding' LIMIT 1",
    )
    .bind(tenant_id)
    .fetch_optional(&pg)
    .await
    .expect("read previous account binding policy");
    let mut policy = default_account_binding_policy();
    policy.oauth_login.enabled = true;
    let policy_json = serde_json::to_string(&policy).expect("serialize account binding policy");
    sqlx::query(
        "INSERT INTO iam_policy (id, tenant_id, code, name, policy_json, status, created_at, updated_at) \
         VALUES ('pol_desktop_e2e_account_binding', $1, 'iam.account_binding', 'Desktop E2E', $2, 'active', $3, $3) \
         ON CONFLICT (tenant_id, code) DO UPDATE SET policy_json = EXCLUDED.policy_json, updated_at = EXCLUDED.updated_at",
    )
    .bind(tenant_id)
    .bind(&policy_json)
    .bind(&now)
    .execute(&pg)
    .await
    .expect("enable OAuth login policy");

    sqlx::query("DELETE FROM iam_oauth_integration WHERE id = $1")
        .bind(integration_id)
        .execute(&pg)
        .await
        .expect("cleanup custom provider integration");
    sqlx::query("DELETE FROM iam_oauth_provider_catalog WHERE id = $1")
        .bind(catalog_id)
        .execute(&pg)
        .await
        .expect("cleanup custom provider catalog");

    sqlx::query(
        "INSERT INTO iam_oauth_provider_catalog (\
            id, uuid, owner_tenant_id, provider_code, provider_family, provider_name, \
            provider_display_name, region_group, protocol_family, \
            supported_capabilities_json, supported_surface_kinds_json, supported_flow_kinds_json, \
            status, sort_order, created_at, updated_at\
         ) VALUES ($1, $2, $3, $4, 'oauth2', 'Custom E2E', 'Custom E2E', 'global', 'oauth2', \
                   '[\"login\"]', '[\"web\"]', '[\"authorization_code\"]', 'active', 5, $5, $5)",
    )
    .bind(catalog_id)
    .bind("uuid_custom_e2e_provider")
    .bind(tenant_id)
    .bind(provider_code)
    .bind(&now)
    .execute(&pg)
    .await
    .expect("insert custom provider catalog");

    sqlx::query(
        "INSERT INTO iam_oauth_integration (\
            id, uuid, tenant_id, organization_id, app_id, environment, deployment_mode, \
            provider_code, provider_catalog_id, integration_code, display_name, \
            region_group, protocol_family, enabled, health_status, status, created_at, updated_at\
         ) VALUES ($1, $2, $3, '0', $4, 'test', 'saas', $5, $6, 'custom-e2e-provider', \
                   'Custom E2E', 'global', 'oauth2', 1, 'healthy', 'active', $7, $7)",
    )
    .bind(integration_id)
    .bind("uuid_custom_e2e_integration")
    .bind(tenant_id)
    .bind("0")
    .bind(provider_code)
    .bind(catalog_id)
    .bind(&now)
    .execute(&pg)
    .await
    .expect("insert custom provider integration");

    let access_token = bootstrap_access_token_jwt(tenant_id, &runtime_app_id);
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/app/v3/api/system/iam/runtime")
                .header("access-token", access_token)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .expect("runtime metadata request");
    let status = response.status();
    let body = read_json(response).await;
    assert_eq!(
        status,
        StatusCode::OK,
        "runtime metadata failed: {}",
        serde_json::to_string(&body).unwrap_or_default()
    );
    let providers = body["data"]["auth"]["oauthProviders"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    assert!(
        providers
            .iter()
            .any(|code| code.as_str() == Some(provider_code)),
        "admin-configured provider must appear on the login surface: {providers:?}"
    );

    // Restricting the admin allow-list must hide a provider even though its
    // catalog/integration rows stay enabled.
    let mut restricted_policy = policy.clone();
    restricted_policy.oauth_login.allowed_providers = vec!["github".to_string()];
    let restricted_policy_json =
        serde_json::to_string(&restricted_policy).expect("serialize restricted policy");
    sqlx::query(
        "UPDATE iam_policy SET policy_json = $2, updated_at = $3 \
         WHERE tenant_id = $1 AND code = 'iam.account_binding'",
    )
    .bind(tenant_id)
    .bind(&restricted_policy_json)
    .bind(&now)
    .execute(&pg)
    .await
    .expect("restrict OAuth login providers");

    let restricted_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/app/v3/api/system/iam/runtime")
                .header(
                    "access-token",
                    bootstrap_access_token_jwt(tenant_id, &runtime_app_id),
                )
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .expect("restricted runtime metadata request");
    let restricted_status = restricted_response.status();
    let restricted_body = read_json(restricted_response).await;
    assert_eq!(restricted_status, StatusCode::OK);
    let restricted_providers = restricted_body["data"]["auth"]["oauthProviders"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    assert!(
        !restricted_providers
            .iter()
            .any(|code| code.as_str() == Some(provider_code)),
        "allowedProviders must hide a provider from the login surface: {restricted_providers:?}"
    );

    // Disabling the provider integration in Admin must also hide it, even when
    // the policy allows it again.
    sqlx::query(
        "UPDATE iam_policy SET policy_json = $2, updated_at = $3 \
         WHERE tenant_id = $1 AND code = 'iam.account_binding'",
    )
    .bind(tenant_id)
    .bind(&policy_json)
    .bind(&now)
    .execute(&pg)
    .await
    .expect("restore account binding allow-list");
    sqlx::query("UPDATE iam_oauth_integration SET enabled = 0, updated_at = $2 WHERE id = $1")
        .bind(integration_id)
        .bind(&now)
        .execute(&pg)
        .await
        .expect("disable custom provider integration");

    let disabled_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/app/v3/api/system/iam/runtime")
                .header(
                    "access-token",
                    bootstrap_access_token_jwt(tenant_id, &runtime_app_id),
                )
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .expect("disabled provider runtime metadata request");
    let disabled_status = disabled_response.status();
    let disabled_body = read_json(disabled_response).await;
    assert_eq!(disabled_status, StatusCode::OK);
    let disabled_providers = disabled_body["data"]["auth"]["oauthProviders"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    assert!(
        !disabled_providers
            .iter()
            .any(|code| code.as_str() == Some(provider_code)),
        "a disabled provider integration must not appear on the login surface: {disabled_providers:?}"
    );

    // The master OAuth-login switch must hide every provider at once.
    let mut oauth_disabled_policy = policy.clone();
    oauth_disabled_policy.oauth_login.enabled = false;
    let oauth_disabled_policy_json =
        serde_json::to_string(&oauth_disabled_policy).expect("serialize disabled OAuth policy");
    sqlx::query(
        "UPDATE iam_policy SET policy_json = $2, updated_at = $3 \
         WHERE tenant_id = $1 AND code = 'iam.account_binding'",
    )
    .bind(tenant_id)
    .bind(&oauth_disabled_policy_json)
    .bind(&now)
    .execute(&pg)
    .await
    .expect("disable OAuth login policy");

    let oauth_disabled_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/app/v3/api/system/iam/runtime")
                .header(
                    "access-token",
                    bootstrap_access_token_jwt(tenant_id, &runtime_app_id),
                )
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .expect("OAuth-disabled runtime metadata request");
    let oauth_disabled_status = oauth_disabled_response.status();
    let oauth_disabled_body = read_json(oauth_disabled_response).await;
    assert_eq!(oauth_disabled_status, StatusCode::OK);
    let oauth_disabled_providers = oauth_disabled_body["data"]["auth"]["oauthProviders"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    assert!(
        oauth_disabled_providers.is_empty(),
        "oauth_login.enabled=false must hide every provider: {oauth_disabled_providers:?}"
    );

    // Restore the enabled policy for the cleanup assertions.
    sqlx::query(
        "UPDATE iam_policy SET policy_json = $2, updated_at = $3 \
         WHERE tenant_id = $1 AND code = 'iam.account_binding'",
    )
    .bind(tenant_id)
    .bind(&policy_json)
    .bind(&now)
    .execute(&pg)
    .await
    .expect("restore enabled OAuth policy");

    sqlx::query("DELETE FROM iam_oauth_integration WHERE id = $1")
        .bind(integration_id)
        .execute(&pg)
        .await
        .expect("cleanup custom provider integration");
    sqlx::query("DELETE FROM iam_oauth_provider_catalog WHERE id = $1")
        .bind(catalog_id)
        .execute(&pg)
        .await
        .expect("cleanup custom provider catalog");

    match previous_policy {
        Some(previous_policy) => {
            sqlx::query(
                "UPDATE iam_policy SET policy_json = $2, updated_at = $3 \
                 WHERE tenant_id = $1 AND code = 'iam.account_binding'",
            )
            .bind(tenant_id)
            .bind(previous_policy)
            .bind(&now)
            .execute(&pg)
            .await
            .expect("restore account binding policy");
        }
        None => {
            sqlx::query(
                "DELETE FROM iam_policy \
                 WHERE tenant_id = $1 AND code = 'iam.account_binding'",
            )
            .bind(tenant_id)
            .execute(&pg)
            .await
            .expect("delete temporary account binding policy");
        }
    }
}

#[tokio::test]
async fn concurrent_authorization_completions_approve_only_one_state() {
    let _env_guard = lock_local_iam_env();
    configure_desktop_e2e_env();

    let app = build_desktop_e2e_app().await;
    let pg = postgres_pool_for_tests().await;
    seed_desktop_e2e_fixtures(&pg).await;
    let (_, login_context) = login_desktop_e2e_session(&app).await;

    let client =
        resolve_relying_party_client(&pg, DESKTOP_E2E_CLIENT_APP_ID, Some(DESKTOP_E2E_TENANT_ID))
            .await
            .expect("resolve desktop e2e relying party client");
    sqlx::query("DELETE FROM iam_oauth_grant WHERE tenant_id = $1 AND oauth_client_id = $2")
        .bind(DESKTOP_E2E_TENANT_ID)
        .bind(&client.client_id)
        .execute(&pg)
        .await
        .expect("clear prior oauth grants");
    let (_verifier, code_challenge) =
        pkce_pair("desktop-concurrent-completion-verifier-sufficient-length");
    let authorize_request = AuthorizeRequest {
        client_id: DESKTOP_E2E_CLIENT_APP_ID.to_string(),
        redirect_uri: DESKTOP_E2E_REDIRECT_URI.to_string(),
        response_type: "code".to_string(),
        scope: "openid profile email".to_string(),
        state: Some("desktop-concurrent-completion-state".to_string()),
        code_challenge: Some(code_challenge),
        code_challenge_method: Some("S256".to_string()),
        tenant_id: Some(DESKTOP_E2E_TENANT_ID.to_string()),
    };
    let scopes =
        validate_authorize_request(&authorize_request, &client).expect("authorize request");
    let (state_id, _) =
        create_pending_authorization_state(&pg, &client, &authorize_request, &scopes)
            .await
            .expect("create concurrent-completion state");

    let (first, second) = tokio::join!(
        complete_authorization_state(&pg, &state_id, &login_context),
        complete_authorization_state(&pg, &state_id, &login_context),
    );
    assert!(
        first.is_ok() ^ second.is_ok(),
        "exactly one concurrent completion may approve the state"
    );

    let grant_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM iam_oauth_grant \
         WHERE tenant_id = $1 AND oauth_client_id = $2 AND provider_code = 'sdkwork'",
    )
    .bind(DESKTOP_E2E_TENANT_ID)
    .bind(&client.client_id)
    .fetch_one(&pg)
    .await
    .expect("count grants");
    assert_eq!(
        grant_count, 1,
        "a losing completion must not leave an orphan grant"
    );
}

#[tokio::test]
async fn desktop_exchange_rejects_an_expired_authorization_code() {
    let _env_guard = lock_local_iam_env();
    configure_desktop_e2e_env();

    let app = build_desktop_e2e_app().await;
    let pg = postgres_pool_for_tests().await;
    seed_desktop_e2e_fixtures(&pg).await;
    let (_, login_context) = login_desktop_e2e_session(&app).await;

    let client =
        resolve_relying_party_client(&pg, DESKTOP_E2E_CLIENT_APP_ID, Some(DESKTOP_E2E_TENANT_ID))
            .await
            .expect("resolve desktop e2e relying party client");
    let (code_verifier, code_challenge) =
        pkce_pair("desktop-expired-code-verifier-sufficient-length");
    let authorize_request = AuthorizeRequest {
        client_id: DESKTOP_E2E_CLIENT_APP_ID.to_string(),
        redirect_uri: DESKTOP_E2E_REDIRECT_URI.to_string(),
        response_type: "code".to_string(),
        scope: "openid profile email".to_string(),
        state: Some("desktop-expired-code-state".to_string()),
        code_challenge: Some(code_challenge),
        code_challenge_method: Some("S256".to_string()),
        tenant_id: Some(DESKTOP_E2E_TENANT_ID.to_string()),
    };
    let scopes =
        validate_authorize_request(&authorize_request, &client).expect("authorize request");
    let (state_id, _) =
        create_pending_authorization_state(&pg, &client, &authorize_request, &scopes)
            .await
            .expect("create expired-code state");
    let completion = complete_authorization_state(&pg, &state_id, &login_context)
        .await
        .expect("complete expired-code state");
    let authorization_code = completion.authorization_code;

    sqlx::query("UPDATE iam_oauth_authorization_state SET expires_at = $2 WHERE id = $1")
        .bind(&state_id)
        .bind("2000-01-01T00:00:00+00:00")
        .execute(&pg)
        .await
        .expect("expire authorization state");

    let (status, body) = redeem_desktop_session(
        &app,
        &authorization_code,
        &code_verifier,
        DESKTOP_E2E_REDIRECT_URI,
        None,
    )
    .await;
    assert_eq!(
        status,
        StatusCode::BAD_REQUEST,
        "an expired authorization code must be rejected: {}",
        serde_json::to_string(&body).unwrap_or_default()
    );
}

#[tokio::test]
async fn oauth_token_introspection_reports_the_grant_client_and_refresh_expiry() {
    let _env_guard = lock_local_iam_env();
    configure_desktop_e2e_env();

    let app = build_desktop_e2e_app().await;
    let pg = postgres_pool_for_tests().await;
    seed_desktop_e2e_fixtures(&pg).await;
    let (_, login_context) = login_desktop_e2e_session(&app).await;

    let client =
        resolve_relying_party_client(&pg, DESKTOP_E2E_CLIENT_APP_ID, Some(DESKTOP_E2E_TENANT_ID))
            .await
            .expect("resolve desktop e2e relying party client");
    let (code_verifier, code_challenge) =
        pkce_pair("desktop-introspection-verifier-with-sufficient-length");
    let authorize_request = AuthorizeRequest {
        client_id: DESKTOP_E2E_CLIENT_APP_ID.to_string(),
        redirect_uri: DESKTOP_E2E_REDIRECT_URI.to_string(),
        response_type: "code".to_string(),
        scope: "openid profile email".to_string(),
        state: Some("desktop-introspection-state".to_string()),
        code_challenge: Some(code_challenge),
        code_challenge_method: Some("S256".to_string()),
        tenant_id: Some(DESKTOP_E2E_TENANT_ID.to_string()),
    };
    let scopes =
        validate_authorize_request(&authorize_request, &client).expect("authorize request");
    let (state_id, _) =
        create_pending_authorization_state(&pg, &client, &authorize_request, &scopes)
            .await
            .expect("create introspection state");
    let completion = complete_authorization_state(&pg, &state_id, &login_context)
        .await
        .expect("complete introspection state");
    let tokens = exchange_authorization_code(
        &pg,
        &client,
        &completion.authorization_code,
        DESKTOP_E2E_REDIRECT_URI,
        Some(&code_verifier),
        None,
    )
    .await
    .expect("exchange introspection code");
    let access_token = tokens["access_token"].as_str().expect("access token");
    let refresh_token = tokens["refresh_token"].as_str().expect("refresh token");

    let access_introspection = introspect_oauth_token(
        &pg,
        access_token,
        Some(DESKTOP_E2E_CLIENT_APP_ID),
        Some(DESKTOP_E2E_TENANT_ID),
        None,
    )
    .await
    .expect("introspect access token");
    assert_eq!(access_introspection["active"], true);
    assert_eq!(access_introspection["client_id"], DESKTOP_E2E_CLIENT_APP_ID);

    let refresh_introspection = introspect_oauth_token(
        &pg,
        refresh_token,
        Some(DESKTOP_E2E_CLIENT_APP_ID),
        Some(DESKTOP_E2E_TENANT_ID),
        None,
    )
    .await
    .expect("introspect refresh token");
    assert_eq!(refresh_introspection["active"], true);
    assert_eq!(refresh_introspection["token_type"], "refresh_token");
    assert_eq!(
        refresh_introspection["client_id"],
        DESKTOP_E2E_CLIENT_APP_ID
    );

    revoke_oauth_token(
        &pg,
        access_token,
        Some(DESKTOP_E2E_CLIENT_APP_ID),
        Some(DESKTOP_E2E_TENANT_ID),
        None,
    )
    .await
    .expect("revoke oauth access token");
    let revoked_introspection = introspect_oauth_token(
        &pg,
        access_token,
        Some(DESKTOP_E2E_CLIENT_APP_ID),
        Some(DESKTOP_E2E_TENANT_ID),
        None,
    )
    .await
    .expect("introspect revoked token");
    assert_eq!(revoked_introspection["active"], false);
}

#[tokio::test]
async fn concurrent_authorization_code_redemptions_issue_only_one_session() {
    let _env_guard = lock_local_iam_env();
    configure_desktop_e2e_env();

    let app = build_desktop_e2e_app().await;
    let pg = postgres_pool_for_tests().await;
    seed_desktop_e2e_fixtures(&pg).await;
    let (_, login_context) = login_desktop_e2e_session(&app).await;

    let client =
        resolve_relying_party_client(&pg, DESKTOP_E2E_CLIENT_APP_ID, Some(DESKTOP_E2E_TENANT_ID))
            .await
            .expect("resolve desktop e2e relying party client");
    let (code_verifier, code_challenge) =
        pkce_pair("desktop-concurrent-redemption-verifier-sufficient-length");
    let authorize_request = AuthorizeRequest {
        client_id: DESKTOP_E2E_CLIENT_APP_ID.to_string(),
        redirect_uri: DESKTOP_E2E_REDIRECT_URI.to_string(),
        response_type: "code".to_string(),
        scope: "openid profile email".to_string(),
        state: Some("desktop-concurrent-redemption-state".to_string()),
        code_challenge: Some(code_challenge),
        code_challenge_method: Some("S256".to_string()),
        tenant_id: Some(DESKTOP_E2E_TENANT_ID.to_string()),
    };
    let scopes =
        validate_authorize_request(&authorize_request, &client).expect("authorize request");
    let (state_id, _) =
        create_pending_authorization_state(&pg, &client, &authorize_request, &scopes)
            .await
            .expect("create concurrent-redemption state");
    let completion = complete_authorization_state(&pg, &state_id, &login_context)
        .await
        .expect("complete concurrent-redemption state");
    let authorization_code = completion.authorization_code;

    let (first, second) = tokio::join!(
        redeem_desktop_session(
            &app,
            &authorization_code,
            &code_verifier,
            DESKTOP_E2E_REDIRECT_URI,
            None,
        ),
        redeem_desktop_session(
            &app,
            &authorization_code,
            &code_verifier,
            DESKTOP_E2E_REDIRECT_URI,
            None,
        ),
    );
    let mut statuses = [first.0, second.0];
    statuses.sort();
    assert_eq!(
        statuses,
        [StatusCode::OK, StatusCode::BAD_REQUEST],
        "exactly one concurrent redemption may succeed"
    );
}

#[tokio::test]
async fn desktop_exchange_rejects_a_redirect_uri_that_differs_from_the_code() {
    let _env_guard = lock_local_iam_env();
    configure_desktop_e2e_env();

    let app = build_desktop_e2e_app().await;
    let pg = postgres_pool_for_tests().await;
    seed_desktop_e2e_fixtures(&pg).await;
    let (_, login_context) = login_desktop_e2e_session(&app).await;

    let client =
        resolve_relying_party_client(&pg, DESKTOP_E2E_CLIENT_APP_ID, Some(DESKTOP_E2E_TENANT_ID))
            .await
            .expect("resolve desktop e2e relying party client");
    let (code_verifier, code_challenge) =
        pkce_pair("desktop-redirect-binding-verifier-with-sufficient-length");
    let authorize_request = AuthorizeRequest {
        client_id: DESKTOP_E2E_CLIENT_APP_ID.to_string(),
        redirect_uri: DESKTOP_E2E_REDIRECT_URI.to_string(),
        response_type: "code".to_string(),
        scope: "openid profile email".to_string(),
        state: Some("desktop-redirect-binding-state".to_string()),
        code_challenge: Some(code_challenge),
        code_challenge_method: Some("S256".to_string()),
        tenant_id: Some(DESKTOP_E2E_TENANT_ID.to_string()),
    };
    let scopes =
        validate_authorize_request(&authorize_request, &client).expect("authorize request");
    let (state_id, _) =
        create_pending_authorization_state(&pg, &client, &authorize_request, &scopes)
            .await
            .expect("create redirect-binding state");
    let completion = complete_authorization_state(&pg, &state_id, &login_context)
        .await
        .expect("complete redirect-binding state");
    let authorization_code = completion.authorization_code;

    let (status, body) = redeem_desktop_session(
        &app,
        &authorization_code,
        &code_verifier,
        "https://attacker.example/oauth/callback",
        None,
    )
    .await;
    assert_eq!(
        status,
        StatusCode::BAD_REQUEST,
        "a code redeemed with a different redirect URI must be rejected: {}",
        serde_json::to_string(&body).unwrap_or_default()
    );
}

#[tokio::test]
async fn hosted_authorization_bootstrap_creates_a_pending_state_without_redirecting() {
    let _env_guard = lock_local_iam_env();
    configure_desktop_e2e_env();

    let app = build_desktop_e2e_app().await;
    let pg = postgres_pool_for_tests().await;
    seed_desktop_e2e_fixtures(&pg).await;

    let (_verifier, code_challenge) = pkce_pair("hosted-bootstrap-verifier-with-sufficient-length");
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/oauth/authorizations")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "clientId": DESKTOP_E2E_CLIENT_APP_ID,
                        "responseType": "code",
                        "redirectUri": DESKTOP_E2E_REDIRECT_URI,
                        "scope": "openid profile email",
                        "state": "bootstrap-state",
                        "codeChallenge": code_challenge,
                        "codeChallengeMethod": "S256"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .expect("hosted authorization bootstrap request");

    let status = response.status();
    let location = response.headers().get("location").cloned();
    let body = read_json(response).await;
    assert_eq!(
        status,
        StatusCode::OK,
        "hosted authorization bootstrap failed: {}",
        serde_json::to_string(&body).unwrap_or_default()
    );
    assert!(
        location.is_none(),
        "the JSON bootstrap must not redirect the browser"
    );
    assert_eq!(body["code"].as_i64(), Some(0));
    let authorization_state_id = body["data"]["authorizationStateId"]
        .as_str()
        .filter(|value| !value.is_empty())
        .expect("bootstrap authorization state id")
        .to_owned();
    assert!(body["data"]["expiresAt"].as_str().is_some());

    let state_status: String =
        sqlx::query_scalar("SELECT status FROM iam_oauth_authorization_state WHERE id = $1")
            .bind(&authorization_state_id)
            .fetch_one(&pg)
            .await
            .expect("bootstrap state row");
    assert_eq!(state_status, "pending");

    // An unknown client is rejected before any state is created.
    let unknown_client = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/oauth/authorizations")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "clientId": "client-that-does-not-exist",
                        "responseType": "code",
                        "redirectUri": DESKTOP_E2E_REDIRECT_URI,
                        "scope": "openid profile email",
                        "state": "bootstrap-state",
                        "codeChallenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
                        "codeChallengeMethod": "S256"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .expect("unknown client bootstrap request");
    assert_eq!(unknown_client.status(), StatusCode::BAD_REQUEST);

    // Disabling the relying party in Admin must stop the hosted bootstrap too.
    let previous_runtime_config: sqlx::types::Json<Value> = sqlx::query_scalar(
        "SELECT runtime_config_json FROM iam_tenant_application \
         WHERE tenant_id = $1 AND app_id = $2 LIMIT 1",
    )
    .bind(DESKTOP_E2E_TENANT_ID)
    .bind(DESKTOP_E2E_CLIENT_APP_ID)
    .fetch_one(&pg)
    .await
    .expect("desktop relying party runtime config");
    let mut disabled_config = previous_runtime_config.0.clone();
    disabled_config["oauth"]["relyingParty"]["enabled"] = json!(false);
    sqlx::query(
        "UPDATE iam_tenant_application SET runtime_config_json = $3 \
         WHERE tenant_id = $1 AND app_id = $2",
    )
    .bind(DESKTOP_E2E_TENANT_ID)
    .bind(DESKTOP_E2E_CLIENT_APP_ID)
    .bind(sqlx::types::Json(&disabled_config))
    .execute(&pg)
    .await
    .expect("disable desktop relying party");

    let disabled_bootstrap = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/oauth/authorizations")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "clientId": DESKTOP_E2E_CLIENT_APP_ID,
                        "responseType": "code",
                        "redirectUri": DESKTOP_E2E_REDIRECT_URI,
                        "scope": "openid profile email",
                        "state": "bootstrap-state",
                        "codeChallenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
                        "codeChallengeMethod": "S256"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .expect("disabled relying party bootstrap request");
    assert_eq!(disabled_bootstrap.status(), StatusCode::BAD_REQUEST);

    sqlx::query(
        "UPDATE iam_tenant_application SET runtime_config_json = $3 \
         WHERE tenant_id = $1 AND app_id = $2",
    )
    .bind(DESKTOP_E2E_TENANT_ID)
    .bind(DESKTOP_E2E_CLIENT_APP_ID)
    .bind(sqlx::types::Json(&previous_runtime_config.0))
    .execute(&pg)
    .await
    .expect("restore desktop relying party");
}

#[tokio::test]
async fn desktop_browser_login_redeems_authorization_code_for_dual_token_session() {
    let _env_guard = lock_local_iam_env();
    configure_desktop_e2e_env();

    let app = build_desktop_e2e_app().await;
    let pg = postgres_pool_for_tests().await;
    let user_id = seed_desktop_e2e_fixtures(&pg).await;

    // 1. Browser leg: credential-entry password login.
    let (login_session, login_context) = login_desktop_e2e_session(&app).await;

    // 2. Desktop leg starts: public-client authorize with PKCE S256 and the
    //    deep-link redirect URI.
    let client =
        resolve_relying_party_client(&pg, DESKTOP_E2E_CLIENT_APP_ID, Some(DESKTOP_E2E_TENANT_ID))
            .await
            .expect("resolve desktop e2e relying party client");
    let (code_verifier, code_challenge) = pkce_pair("desktop-pkce-verifier-with-sufficient-length");
    let authorize_request = AuthorizeRequest {
        client_id: DESKTOP_E2E_CLIENT_APP_ID.to_string(),
        redirect_uri: DESKTOP_E2E_REDIRECT_URI.to_string(),
        response_type: "code".to_string(),
        scope: "openid profile email".to_string(),
        state: Some("desktop-e2e-state".to_string()),
        code_challenge: Some(code_challenge),
        code_challenge_method: Some("S256".to_string()),
        tenant_id: Some(DESKTOP_E2E_TENANT_ID.to_string()),
    };
    let scopes = validate_authorize_request(&authorize_request, &client)
        .expect("authorize desktop e2e request");
    let (authorization_state_id, _login_url) =
        create_pending_authorization_state(&pg, &client, &authorize_request, &scopes)
            .await
            .expect("create desktop e2e pending authorization state");

    // 3. Hosted login completes the authorization; the completion hands code +
    //    state back through the deep-link redirect URL. The session tokens the
    //    login issued are a real dual-token session for app-api calls.
    let access_token = login_session["accessToken"]
        .as_str()
        .filter(|value| !value.is_empty())
        .expect("login must return an access token");
    let auth_token = login_session["authToken"]
        .as_str()
        .filter(|value| !value.is_empty())
        .expect("login must return an auth token");
    let current = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/app/v3/api/auth/sessions/current")
                .header("authorization", format!("Bearer {auth_token}"))
                .header("access-token", access_token)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .expect("current session request");
    let current_status = current.status();
    let current_body = read_json(current).await;
    assert_eq!(
        current_status,
        StatusCode::OK,
        "the hosted-login session must authenticate app-api calls: {}",
        serde_json::to_string(&current_body).unwrap_or_default()
    );

    let completion =
        complete_authorization_over_http(&app, &authorization_state_id, &login_session).await;
    let authorization_code = completion["authorizationCode"]
        .as_str()
        .filter(|value| !value.is_empty())
        .expect("completion authorization code")
        .to_owned();
    let redirect_url = completion["redirectUrl"].as_str().expect("redirect url");
    assert!(
        redirect_url.starts_with(DESKTOP_E2E_REDIRECT_URI),
        "deep-link redirect must target the registered scheme: {redirect_url}"
    );
    assert!(
        redirect_url.contains(&format!("code={authorization_code}")),
        "deep-link redirect must carry the issued code: {redirect_url}"
    );
    assert!(
        redirect_url.contains("state=desktop-e2e-state"),
        "deep-link redirect must echo the request state: {redirect_url}"
    );

    // 4. The desktop app redeems the deep-link code for a dual-token session.
    let (status, body) = redeem_desktop_session(
        &app,
        &authorization_code,
        &code_verifier,
        DESKTOP_E2E_REDIRECT_URI,
        None,
    )
    .await;
    assert_eq!(
        status,
        StatusCode::OK,
        "desktop session redeem failed: {}",
        serde_json::to_string(&body).unwrap_or_default()
    );
    assert_eq!(body["code"].as_i64(), Some(0));
    let session = &body["data"];
    assert!(!session["authToken"].as_str().unwrap_or_default().is_empty());
    assert!(
        !session["accessToken"]
            .as_str()
            .unwrap_or_default()
            .is_empty(),
        "desktop redeem must return a dual-token session"
    );
    assert!(session["refreshToken"].as_str().is_some());
    // The desktop app persists this payload under its own home, so the
    // session id and the returned identity must travel with the tokens.
    assert!(
        !session["sessionId"].as_str().unwrap_or_default().is_empty(),
        "desktop redeem must return the session id"
    );
    assert_eq!(
        session["context"]["tenantId"],
        Value::String(DESKTOP_E2E_TENANT_ID.into())
    );
    assert_eq!(session["user"]["id"], Value::String(user_id.clone()));
    assert_eq!(
        session["context"]["organizationId"],
        Value::String("0".into())
    );

    // 4b. Redeeming the desktop session must not revoke the browser session
    //     that completed the authorization (and, by extension, must not sign
    //     the user out of other applications). Signing in again replaces only
    //     the previous session of the same application.
    let browser_after_desktop = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/app/v3/api/auth/sessions/current")
                .header("authorization", format!("Bearer {auth_token}"))
                .header("access-token", access_token)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .expect("browser session request after desktop redeem");
    let browser_after_desktop_status = browser_after_desktop.status();
    let browser_after_desktop_body = read_json(browser_after_desktop).await;
    assert_eq!(
        browser_after_desktop_status,
        StatusCode::OK,
        "the desktop session must not revoke the browser session: {}",
        serde_json::to_string(&browser_after_desktop_body).unwrap_or_default()
    );

    let desktop_session_app_id: String = sqlx::query_scalar(
        "SELECT s.app_id FROM iam_session s \
         JOIN iam_user u ON u.id = s.user_id AND u.tenant_id = s.tenant_id \
         WHERE u.email = $1 AND s.revoked_at IS NULL \
         ORDER BY s.created_at DESC LIMIT 1",
    )
    .bind(DESKTOP_E2E_USERNAME)
    .fetch_one(&pg)
    .await
    .expect("desktop session app id");
    assert_eq!(
        desktop_session_app_id, DESKTOP_E2E_CLIENT_APP_ID,
        "the redeemed session must be bound to the desktop relying party app"
    );

    // 5. The redeemed session exists as a real IAM session row.
    let session_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM iam_session s \
         JOIN iam_user u ON u.id = s.user_id AND u.tenant_id = s.tenant_id \
         WHERE u.email = $1",
    )
    .bind(DESKTOP_E2E_USERNAME)
    .fetch_one(&pg)
    .await
    .expect("count desktop e2e sessions");
    assert!(session_count >= 1, "desktop session row must persist");

    // 6. The authorization code is single-use: a replay with the correct
    //    verifier is rejected.
    let (replay_status, replay_body) = redeem_desktop_session(
        &app,
        &authorization_code,
        &code_verifier,
        DESKTOP_E2E_REDIRECT_URI,
        None,
    )
    .await;
    assert_eq!(
        replay_status,
        StatusCode::BAD_REQUEST,
        "replayed authorization code must be rejected: {}",
        serde_json::to_string(&replay_body).unwrap_or_default()
    );

    // 7. A fresh code with a wrong verifier is rejected (PKCE binding).
    let (verifier, challenge) = pkce_pair("desktop-pkce-verifier-with-sufficient-length");
    let (second_state_id, _) = create_pending_authorization_state(
        &pg,
        &client,
        &AuthorizeRequest {
            code_challenge: Some(challenge),
            ..authorize_request.clone()
        },
        &scopes,
    )
    .await
    .expect("create second desktop e2e authorization state");
    let second_completion = complete_authorization_state(&pg, &second_state_id, &login_context)
        .await
        .expect("complete second desktop e2e authorization state");
    let second_code = second_completion.authorization_code;
    let wrong_verifier = format!("{}wrong", verifier);
    let (pkce_status, pkce_body) = redeem_desktop_session(
        &app,
        &second_code,
        &wrong_verifier,
        DESKTOP_E2E_REDIRECT_URI,
        None,
    )
    .await;
    assert_eq!(
        pkce_status,
        StatusCode::BAD_REQUEST,
        "PKCE mismatch must be rejected: {}",
        serde_json::to_string(&pkce_body).unwrap_or_default()
    );
}

/// The platform's hosted login posts `email` + `password` without `grantType`;
/// the session bootstrap must treat that as the password grant.
#[tokio::test]
async fn hosted_login_body_without_grant_type_creates_a_session() {
    let _env_guard = lock_local_iam_env();
    configure_desktop_e2e_env();
    let app = build_desktop_e2e_app().await;
    let pg = postgres_pool_for_tests().await;
    let _ = seed_desktop_e2e_fixtures(&pg).await;

    let access_token = bootstrap_access_token_jwt(
        DESKTOP_E2E_TENANT_ID,
        platform_runtime_app_id_for_tenant(DESKTOP_E2E_TENANT_ID).as_str(),
    );
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/auth/sessions")
                .header("content-type", "application/json")
                .header("access-token", access_token)
                .body(Body::from(
                    json!({
                        "email": DESKTOP_E2E_USERNAME,
                        "password": DESKTOP_E2E_PASSWORD
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .expect("hosted login request");
    let status = response.status();
    let body = read_json(response).await;
    assert_eq!(
        status,
        StatusCode::OK,
        "the hosted login body must authenticate: {}",
        serde_json::to_string(&body).unwrap_or_default()
    );
    assert!(
        !body["data"]["authToken"]
            .as_str()
            .unwrap_or_default()
            .is_empty(),
        "hosted login must return the auth token"
    );
    assert!(
        !body["data"]["accessToken"]
            .as_str()
            .unwrap_or_default()
            .is_empty(),
        "hosted login must return the access token"
    );
}

/// RFC 8252 surface binding: a code issued for a web redirect must not be
/// redeemable as a desktop session, even with a valid PKCE verifier.
#[tokio::test]
async fn desktop_session_exchange_rejects_a_web_surface_code() {
    let _env_guard = lock_local_iam_env();
    configure_desktop_e2e_env();
    let app = build_desktop_e2e_app().await;
    let pg = postgres_pool_for_tests().await;
    let _ = seed_desktop_e2e_fixtures(&pg).await;
    let (_login_session, login_context) = login_desktop_e2e_session(&app).await;

    let client =
        resolve_relying_party_client(&pg, DESKTOP_E2E_CLIENT_APP_ID, Some(DESKTOP_E2E_TENANT_ID))
            .await
            .expect("resolve desktop e2e relying party client");
    let (verifier, challenge) = pkce_pair("desktop-pkce-verifier-with-sufficient-length");
    let web_request = AuthorizeRequest {
        client_id: DESKTOP_E2E_CLIENT_APP_ID.to_string(),
        redirect_uri: DESKTOP_E2E_WEB_REDIRECT_URI.to_string(),
        response_type: "code".to_string(),
        scope: "openid profile email".to_string(),
        state: Some("desktop-e2e-web-state".to_string()),
        code_challenge: Some(challenge),
        code_challenge_method: Some("S256".to_string()),
        tenant_id: Some(DESKTOP_E2E_TENANT_ID.to_string()),
    };
    let scopes =
        validate_authorize_request(&web_request, &client).expect("authorize web redirect request");
    let (web_state_id, _) = create_pending_authorization_state(&pg, &client, &web_request, &scopes)
        .await
        .expect("create web-surface authorization state");
    let completion = complete_authorization_state(&pg, &web_state_id, &login_context)
        .await
        .expect("complete web-surface authorization state");

    let (status, body) = redeem_desktop_session(
        &app,
        &completion.authorization_code,
        &verifier,
        DESKTOP_E2E_WEB_REDIRECT_URI,
        None,
    )
    .await;
    assert_eq!(
        status,
        StatusCode::BAD_REQUEST,
        "a web-surface code must not become a desktop session: {}",
        serde_json::to_string(&body).unwrap_or_default()
    );
    assert!(
        serde_json::to_string(&body)
            .unwrap_or_default()
            .contains("desktop redirect surface"),
        "the rejection must name the surface binding: {}",
        serde_json::to_string(&body).unwrap_or_default()
    );
}
