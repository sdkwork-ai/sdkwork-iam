//! End-to-end coverage for the desktop browser-login redeem leg:
//! `POST /app/v3/api/oauth/desktop_sessions` (`oauth.desktopSessions.create`).
//!
//! Flow under test (mirrors an Electron/Tauri system-browser login):
//! credential-entry password login → OAuth authorize (public client + PKCE
//! S256, deep-link redirect) → authorization completion → the desktop app
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
    ensure_platform_tenant_application, parse_relying_party_config,
    platform_runtime_app_id_for_tenant, resolve_relying_party_client, validate_authorize_request,
    AuthorizeRequest,
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
    // the fixture user only — never the shared default-tenant baseline).
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
            &argon2::password_hash::SaltString::generate(&mut argon2::password_hash::rand_core::OsRng),
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

    let runtime_config = json!({
        "oauth": {
            "relyingParty": {
                "enabled": true,
                "redirectUris": [DESKTOP_E2E_REDIRECT_URI],
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
) -> (StatusCode, Value) {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/oauth/desktop_sessions")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "clientId": DESKTOP_E2E_CLIENT_APP_ID,
                        "authorizationCode": authorization_code,
                        "codeVerifier": code_verifier,
                        "redirectUri": DESKTOP_E2E_REDIRECT_URI
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .expect("desktop session request");
    let status = response.status();
    (status, read_json(response).await)
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
    let client = resolve_relying_party_client(&pg, DESKTOP_E2E_CLIENT_APP_ID, Some(DESKTOP_E2E_TENANT_ID))
        .await
        .expect("resolve desktop e2e relying party client");
    let (code_verifier, code_challenge) =
        pkce_pair("desktop-pkce-verifier-with-sufficient-length");
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

    // 3. Hosted login completes the authorization; the completion hands
    //    code + state back through the deep-link redirect URL.
    let completion = complete_authorization_state(&pg, &authorization_state_id, &login_context)
        .await
        .expect("complete desktop e2e authorization state");
    assert!(
        completion.redirect_url.starts_with(DESKTOP_E2E_REDIRECT_URI),
        "deep-link redirect must target the registered scheme: {}",
        completion.redirect_url
    );

    // 4. The desktop app redeems the deep-link code for a dual-token session.
    let (status, body) = redeem_desktop_session(&app, &completion.authorization_code, &code_verifier)
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
        !session["accessToken"].as_str().unwrap_or_default().is_empty(),
        "desktop redeem must return a dual-token session"
    );
    assert!(session["refreshToken"].as_str().is_some());
    assert_eq!(session["context"]["tenantId"], Value::String(DESKTOP_E2E_TENANT_ID.into()));
    assert_eq!(session["user"]["id"], Value::String(user_id.clone()));
    assert_eq!(session["context"]["organizationId"], Value::String("0".into()));

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
    let (replay_status, replay_body) =
        redeem_desktop_session(&app, &completion.authorization_code, &code_verifier).await;
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
    let second_completion =
        complete_authorization_state(&pg, &second_state_id, &login_context)
            .await
            .expect("complete second desktop e2e authorization state");
    let wrong_verifier = format!("{}wrong", verifier);
    let (pkce_status, pkce_body) =
        redeem_desktop_session(&app, &second_completion.authorization_code, &wrong_verifier)
            .await;
    assert_eq!(
        pkce_status,
        StatusCode::BAD_REQUEST,
        "PKCE mismatch must be rejected: {}",
        serde_json::to_string(&pkce_body).unwrap_or_default()
    );
}
