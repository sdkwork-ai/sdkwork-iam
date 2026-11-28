//! PostgreSQL integration coverage for SDKWork IAM backend-api management routes.
//!
//! Run with `--test-threads 1` alongside other IAM backend integration tests.

use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use sdkwork_iam_bootstrap::DEFAULT_IAM_TENANT_ID;
use sdkwork_routes_iam_backend_api::build_sdkwork_iam_backend_api_router_from_env;
use serde_json::Value;
use sqlx::{PgPool, Row};
use std::sync::{Mutex, MutexGuard, OnceLock};
use tower::ServiceExt;
use uuid::Uuid;

#[path = "unified_database_env.rs"]
mod unified_database_env;

#[path = "backend_postgres_bootstrap.rs"]
mod backend_postgres_bootstrap;

fn local_iam_env_lock() -> &'static Mutex<()> {
    static ENV_LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    ENV_LOCK.get_or_init(|| Mutex::new(()))
}

fn lock_local_iam_env() -> MutexGuard<'static, ()> {
    local_iam_env_lock()
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

fn iam_postgres_url() -> Option<String> {
    unified_database_env::apply_workspace_postgres_env();
    std::env::var("SDKWORK_DATABASE_URL")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

async fn connect_iam_postgres() -> PgPool {
    let database_url =
        iam_postgres_url().expect("IAM postgres URL must be configured for integration tests");
    sqlx::postgres::PgPoolOptions::new()
        .max_connections(2)
        .connect(&database_url)
        .await
        .expect("connect postgres for backend IAM integration tests")
}

#[tokio::test]
async fn backend_postgres_router_wires_database_pool_for_user_list() {
    let _guard = lock_local_iam_env();
    let Some(_database_url) = iam_postgres_url() else {
        eprintln!(
            "SKIP backend_postgres_router_wires_database_pool_for_user_list: IAM postgres URL not configured"
        );
        return;
    };

    unified_database_env::apply_workspace_postgres_env();
    let pg = connect_iam_postgres().await;
    sdkwork_iam_bootstrap::upsert_postgres_default_subject(&pg)
        .await
        .expect("seed default IAM tenant and organization");

    let router = build_sdkwork_iam_backend_api_router_from_env().await;
    let (status, body_text, _payload) =
        request_backend_route(router, Method::GET, "/backend/v3/api/iam/users", None).await;

    assert_ne!(
        StatusCode::SERVICE_UNAVAILABLE,
        status,
        "backend user list must not fail with missing postgres pool: {body_text}"
    );
    assert_eq!(
        StatusCode::UNAUTHORIZED,
        status,
        "backend user list must require authenticated principal when postgres is wired: {body_text}"
    );
    assert!(
        body_text.contains("\"code\":40101")
            || body_text.contains("40101")
            || body_text.contains("iam_principal_required")
            || body_text.contains("missing-credentials")
            || body_text.contains("Unauthorized")
            || body_text.contains("Authentication required")
            || body_text.contains("Access-Token JWT"),
        "backend user list must fail closed on missing principal: {body_text}"
    );
}

#[tokio::test]
async fn backend_postgres_user_list_query_reads_seeded_directory_rows() {
    let _guard = lock_local_iam_env();
    let Some(_database_url) = iam_postgres_url() else {
        eprintln!(
            "SKIP backend_postgres_user_list_query_reads_seeded_directory_rows: IAM postgres URL not configured"
        );
        return;
    };

    unified_database_env::apply_workspace_postgres_env();
    let pg = connect_iam_postgres().await;
    sdkwork_iam_bootstrap::upsert_postgres_default_subject(&pg)
        .await
        .expect("seed default IAM tenant and organization");

    let unique = Uuid::now_v7().to_string();
    let user_id = format!("iamu_{unique}");
    let username = format!("backend-integration-{unique}");

    sqlx::query(
        "INSERT INTO iam_user (id, tenant_id, username, display_name, email, status, is_deleted, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, 'active', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    )
    .bind(&user_id)
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&username)
    .bind("Backend Integration User")
    .bind(format!("{username}@sdkwork-iam.test"))
    .execute(&pg)
    .await
    .expect("insert integration test user");

    let rows = sqlx::query(
        "SELECT id, tenant_id, username, display_name, email, phone, status \
         FROM iam_user \
         WHERE tenant_id = $1 AND COALESCE(is_deleted, 0) = 0 AND username = $2 \
         LIMIT 1",
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&username)
    .fetch_all(&pg)
    .await
    .expect("query seeded backend user rows");

    assert_eq!(
        1,
        rows.len(),
        "seeded user must be readable through postgres directory query"
    );
    assert_eq!(user_id, rows[0].get::<String, _>("id"));

    let _ = sqlx::query("DELETE FROM iam_user WHERE id = $1")
        .bind(&user_id)
        .execute(&pg)
        .await;
}

#[tokio::test]
async fn backend_postgres_authenticated_user_list_roundtrip() {
    use backend_postgres_bootstrap::{
        configure_backend_integration_runtime_env, integration_access_credential_request_body,
        seed_backend_integration_bootstrap_owner, INTEGRATION_BOOTSTRAP_EMAIL,
    };

    let _guard = lock_local_iam_env();
    let Some(_database_url) = iam_postgres_url() else {
        eprintln!(
            "SKIP backend_postgres_authenticated_user_list_roundtrip: IAM postgres URL not configured"
        );
        return;
    };

    unified_database_env::apply_workspace_postgres_env();
    configure_backend_integration_runtime_env();

    let pg = connect_iam_postgres().await;
    let seeded_user_id = seed_backend_integration_bootstrap_owner(&pg).await;

    let router = build_sdkwork_iam_backend_api_router_from_env().await;
    let credential_body = integration_access_credential_request_body();
    let (credential_status, credential_text, credential_payload) = request_backend_route(
        router.clone(),
        Method::POST,
        "/backend/v3/api/iam/access_credentials",
        Some(&credential_body),
    )
    .await;

    assert_eq!(
        StatusCode::OK,
        credential_status,
        "bootstrap access credential issuance must succeed: {credential_text}"
    );
    let access_token = credential_payload["data"]["accessToken"]
        .as_str()
        .or_else(|| credential_payload["data"]["accessCredential"].as_str())
        .expect("access credential response must include accessToken");
    let auth_token = credential_payload["data"]["authToken"]
        .as_str()
        .expect("access credential response must include authToken");

    let response = router
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/iam/users")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {auth_token}"))
                .header("access-token", access_token)
                .body(Body::from(String::new()))
                .unwrap(),
        )
        .await
        .unwrap();
    let list_status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let list_text = String::from_utf8(bytes.to_vec()).unwrap();
    let list_payload = serde_json::from_str(&list_text).unwrap_or(Value::Null);

    assert_eq!(
        StatusCode::OK,
        list_status,
        "authenticated backend user list must succeed: {list_text}"
    );
    assert_eq!(
        list_payload["code"], 0,
        "authenticated backend user list must return appbase success envelope: {list_text}"
    );

    let items = list_payload["data"]["items"]
        .as_array()
        .expect("authenticated backend user list must return page items");

    assert!(
        items.iter().any(|item| {
            item["id"].as_str() == Some(seeded_user_id.as_str())
                || item["email"].as_str() == Some(INTEGRATION_BOOTSTRAP_EMAIL)
        }),
        "authenticated backend user list must include seeded bootstrap owner: {list_text}"
    );
}

#[tokio::test]
async fn backend_postgres_role_binding_crud_enforces_patch_contract_and_audits() {
    use backend_postgres_bootstrap::{
        configure_backend_integration_runtime_env, integration_access_credential_request_body,
        seed_backend_integration_bootstrap_owner, INTEGRATION_ORGANIZATION_ID,
    };
    use sdkwork_iam_bootstrap::{standard_role_id, DEFAULT_IAM_ORGANIZATION_ID};

    let _guard = lock_local_iam_env();
    let Some(_database_url) = iam_postgres_url() else {
        eprintln!(
            "SKIP backend_postgres_role_binding_crud_enforces_patch_contract_and_audits: IAM postgres URL not configured"
        );
        return;
    };

    unified_database_env::apply_workspace_postgres_env();
    configure_backend_integration_runtime_env();
    let pg = connect_iam_postgres().await;
    let owner_id = seed_backend_integration_bootstrap_owner(&pg).await;
    let router = build_sdkwork_iam_backend_api_router_from_env().await;
    let credential_body = integration_access_credential_request_body();
    let (credential_status, credential_text, credential_payload) = request_backend_route(
        router.clone(),
        Method::POST,
        "/backend/v3/api/iam/access_credentials",
        Some(&credential_body),
    )
    .await;
    assert_eq!(StatusCode::OK, credential_status, "{credential_text}");
    let auth_token = credential_payload["data"]["authToken"]
        .as_str()
        .expect("auth token")
        .to_owned();
    let access_token = credential_payload["data"]["accessToken"]
        .as_str()
        .expect("access token")
        .to_owned();

    let membership_id = format!("iamom_owner_{owner_id}");
    let role_id = standard_role_id(DEFAULT_IAM_TENANT_ID, "org_admin");
    let create_body = serde_json::json!({
        "roleId": role_id,
        "principalKind": "organization_membership",
        "principalId": membership_id,
        "scopeKind": "organization",
        "scopeId": INTEGRATION_ORGANIZATION_ID,
        "effect": "allow",
        "dataScopeKind": "scope",
        "effectiveFrom": "2026-01-01T00:00:00Z",
        "effectiveTo": "2027-01-01T00:00:00Z"
    })
    .to_string();
    let invalid_scope_body = serde_json::json!({
        "roleId": role_id,
        "principalKind": "organization_membership",
        "principalId": membership_id,
        "scopeKind": "tenant",
        "scopeId": "0",
        "effect": "deny"
    })
    .to_string();
    let (status, text, _, _) = authenticated_backend_request(
        router.clone(),
        Method::POST,
        "/backend/v3/api/iam/role_bindings",
        &auth_token,
        &access_token,
        Some(&invalid_scope_body),
    )
    .await;
    assert_eq!(StatusCode::BAD_REQUEST, status, "{text}");

    let (status, text, payload, _) = authenticated_backend_request(
        router.clone(),
        Method::POST,
        "/backend/v3/api/iam/role_bindings",
        &auth_token,
        &access_token,
        Some(&create_body),
    )
    .await;
    assert_eq!(
        StatusCode::CREATED,
        status,
        "create must return 201: {text}"
    );
    assert_eq!(payload["code"], 0, "{text}");
    let binding_id = payload["data"]["item"]["id"]
        .as_str()
        .expect("created binding id")
        .to_owned();
    assert_eq!(payload["data"]["item"]["roleId"], role_id);
    assert!(payload["data"].get("items").is_none());

    let (status, text, _, _) = authenticated_backend_request(
        router.clone(),
        Method::PATCH,
        &format!("/backend/v3/api/iam/role_bindings/{binding_id}"),
        &auth_token,
        &access_token,
        Some("{}"),
    )
    .await;
    assert_eq!(StatusCode::BAD_REQUEST, status, "{text}");

    let invalid_window = serde_json::json!({
        "effectiveFrom": "2027-02-01T00:00:00Z",
        "effectiveTo": "2027-01-01T00:00:00Z"
    })
    .to_string();
    let (status, text, payload, content_type) = authenticated_backend_request(
        router.clone(),
        Method::PATCH,
        &format!("/backend/v3/api/iam/role_bindings/{binding_id}"),
        &auth_token,
        &access_token,
        Some(&invalid_window),
    )
    .await;
    assert_eq!(StatusCode::BAD_REQUEST, status, "{text}");
    assert_eq!(content_type.as_deref(), Some("application/problem+json"));
    assert!(payload["code"].as_i64().unwrap_or_default() > 0);

    let update_body = serde_json::json!({
        "effect": "deny",
        "dataScopeKind": "self",
        "effectiveFrom": null,
        "effectiveTo": null
    })
    .to_string();
    let (status, text, payload, _) = authenticated_backend_request(
        router.clone(),
        Method::PATCH,
        &format!("/backend/v3/api/iam/role_bindings/{binding_id}"),
        &auth_token,
        &access_token,
        Some(&update_body),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "{text}");
    assert_eq!(payload["data"]["item"]["effect"], "deny");
    assert_eq!(payload["data"]["item"]["id"], binding_id);
    assert_eq!(payload["data"]["item"]["tenantId"], DEFAULT_IAM_TENANT_ID);
    assert_eq!(
        payload["data"]["item"]["organizationId"],
        INTEGRATION_ORGANIZATION_ID
    );
    assert_eq!(payload["data"]["item"]["status"], "active");
    assert_eq!(payload["data"]["item"]["dataScopeKind"], "self");
    assert!(payload["data"]["item"]["effectiveFrom"].is_null());
    assert!(payload["data"]["item"]["effectiveTo"].is_null());
    assert_eq!(payload["data"]["item"]["roleId"], role_id);

    let (status, text, _, _) = authenticated_backend_request(
        router.clone(),
        Method::PATCH,
        &format!("/backend/v3/api/iam/role_bindings/{binding_id}"),
        &auth_token,
        &access_token,
        Some(r#"{"scopeKind":"tenant","scopeId":"iamorg-1"}"#),
    )
    .await;
    assert_eq!(StatusCode::BAD_REQUEST, status, "{text}");

    let (status, text, _, _) = authenticated_backend_request(
        router.clone(),
        Method::PATCH,
        &format!("/backend/v3/api/iam/role_bindings/{binding_id}"),
        &auth_token,
        &access_token,
        Some(r#"{"roleId":"role-immutable"}"#),
    )
    .await;
    assert_eq!(StatusCode::BAD_REQUEST, status, "{text}");

    // Organization-scoped callers cannot create or promote a tenant-wide grant.
    let (status, text, _, _) = authenticated_backend_request(
        router.clone(),
        Method::PATCH,
        &format!("/backend/v3/api/iam/role_bindings/{binding_id}"),
        &auth_token,
        &access_token,
        Some(r#"{"scopeKind":"tenant","scopeId":"0"}"#),
    )
    .await;
    assert_eq!(StatusCode::BAD_REQUEST, status, "{text}");
    let unchanged_scope: String = sqlx::query_scalar(
        "SELECT scope_kind FROM iam_role_binding WHERE tenant_id = $1 AND id = $2",
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&binding_id)
    .fetch_one(&pg)
    .await
    .expect("read binding after rejected tenant scope update");
    assert_eq!(unchanged_scope, "organization");

    // Another organization's active binding is indistinguishable from a
    // missing row for this organization-scoped caller.
    let foreign_binding_id = format!("iamrb-foreign-{}", Uuid::now_v7());
    sqlx::query(
        "INSERT INTO iam_role_binding \
         (id, tenant_id, organization_id, role_id, principal_kind, principal_id, scope_kind, scope_id, \
          effect, data_scope_kind, status, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, 'organization_membership', $5, 'organization', $3, 'deny', 'scope', \
                 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    )
    .bind(&foreign_binding_id)
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .bind(&role_id)
    .bind(&membership_id)
    .execute(&pg)
    .await
    .expect("seed foreign organization role binding");
    let (status, text, _, _) = authenticated_backend_request(
        router.clone(),
        Method::PATCH,
        &format!("/backend/v3/api/iam/role_bindings/{foreign_binding_id}"),
        &auth_token,
        &access_token,
        Some(r#"{"effect":"allow"}"#),
    )
    .await;
    assert_eq!(StatusCode::NOT_FOUND, status, "{text}");

    // SoD is evaluated against the merged final allow binding.
    let auditor_role_id = standard_role_id(DEFAULT_IAM_TENANT_ID, "org_auditor");
    let auditor_body = serde_json::json!({
        "roleId": auditor_role_id,
        "principalKind": "user",
        "principalId": owner_id,
        "scopeKind": "organization",
        "scopeId": INTEGRATION_ORGANIZATION_ID,
        "effect": "deny"
    })
    .to_string();
    let (status, text, auditor_payload, _) = authenticated_backend_request(
        router.clone(),
        Method::POST,
        "/backend/v3/api/iam/role_bindings",
        &auth_token,
        &access_token,
        Some(&auditor_body),
    )
    .await;
    assert_eq!(StatusCode::CREATED, status, "{text}");
    let auditor_binding_id = auditor_payload["data"]["item"]["id"]
        .as_str()
        .expect("auditor binding id")
        .to_owned();
    let (status, text, _, _) = authenticated_backend_request(
        router.clone(),
        Method::PATCH,
        &format!("/backend/v3/api/iam/role_bindings/{auditor_binding_id}"),
        &auth_token,
        &access_token,
        Some(r#"{"effect":"allow"}"#),
    )
    .await;
    assert_eq!(
        StatusCode::CONFLICT,
        status,
        "SoD must block final allow: {text}"
    );

    // Assigner scope is likewise rechecked when a denied binding becomes an
    // allow. This custom role carries a permission outside org_admin's scope.
    let unique = Uuid::now_v7().to_string();
    let custom_role_id = format!("role-assigner-{unique}");
    let custom_permission_id = format!("perm-assigner-{unique}");
    let custom_permission_code = format!("system.settings.write.{unique}");
    let custom_binding_id = format!("iamrb-assigner-{unique}");
    sqlx::query(
        "INSERT INTO iam_permission (id, code, name, resource, action, created_at) \
         VALUES ($1, $2, 'Assignee scope test', 'system.settings', 'write', CURRENT_TIMESTAMP)",
    )
    .bind(&custom_permission_id)
    .bind(&custom_permission_code)
    .execute(&pg)
    .await
    .expect("seed custom permission");
    sqlx::query(
        "INSERT INTO iam_role (id, tenant_id, code, name, status, created_at, updated_at) \
         VALUES ($1, $2, $3, 'Assignee scope test', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    )
    .bind(&custom_role_id)
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(format!("assigner_scope_{unique}"))
    .execute(&pg)
    .await
    .expect("seed custom role");
    sqlx::query(
        "INSERT INTO iam_role_permission (id, tenant_id, role_id, permission_id, created_at) \
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
    )
    .bind(format!("rp-assigner-{unique}"))
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&custom_role_id)
    .bind(&custom_permission_id)
    .execute(&pg)
    .await
    .expect("seed custom role permission");
    sqlx::query(
        "INSERT INTO iam_role_binding \
         (id, tenant_id, organization_id, role_id, principal_kind, principal_id, scope_kind, scope_id, \
          effect, data_scope_kind, status, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, 'user', $5, 'organization', $3, 'deny', 'scope', \
                 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    )
    .bind(&custom_binding_id)
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(INTEGRATION_ORGANIZATION_ID)
    .bind(&custom_role_id)
    .bind(&owner_id)
    .execute(&pg)
    .await
    .expect("seed custom denied binding");
    let (status, text, _, _) = authenticated_backend_request(
        router.clone(),
        Method::PATCH,
        &format!("/backend/v3/api/iam/role_bindings/{custom_binding_id}"),
        &auth_token,
        &access_token,
        Some(r#"{"effect":"allow"}"#),
    )
    .await;
    assert_eq!(
        StatusCode::FORBIDDEN,
        status,
        "assigner scope must block final allow: {text}"
    );

    let delete_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!("/backend/v3/api/iam/role_bindings/{binding_id}"))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {auth_token}"))
                .header("access-token", &access_token)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let delete_status = delete_response.status();
    let delete_bytes = delete_response
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    assert_eq!(StatusCode::NO_CONTENT, delete_status);
    assert!(
        delete_bytes.is_empty(),
        "delete must not return a JSON body"
    );
    let revoked: String =
        sqlx::query_scalar("SELECT status FROM iam_role_binding WHERE tenant_id = $1 AND id = $2")
            .bind(DEFAULT_IAM_TENANT_ID)
            .bind(&binding_id)
            .fetch_one(&pg)
            .await
            .expect("read revoked role binding");
    assert_eq!(revoked, "revoked");

    let (status, text, restored_payload, _) = authenticated_backend_request(
        router.clone(),
        Method::POST,
        "/backend/v3/api/iam/role_bindings",
        &auth_token,
        &access_token,
        Some(&create_body),
    )
    .await;
    assert_eq!(StatusCode::CREATED, status, "{text}");
    assert_eq!(restored_payload["data"]["item"]["id"], binding_id);
    assert_eq!(restored_payload["data"]["item"]["status"], "active");

    let (status, text, _, _) = authenticated_backend_request(
        router.clone(),
        Method::POST,
        "/backend/v3/api/iam/role_bindings",
        &auth_token,
        &access_token,
        Some(&create_body),
    )
    .await;
    assert_eq!(StatusCode::CONFLICT, status, "{text}");

    let (status, text, _, _) = authenticated_backend_request(
        router.clone(),
        Method::DELETE,
        &format!("/backend/v3/api/iam/role_bindings/{binding_id}"),
        &auth_token,
        &access_token,
        None,
    )
    .await;
    assert_eq!(StatusCode::NO_CONTENT, status, "{text}");

    let audit_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM iam_audit_event \
         WHERE tenant_id = $1 AND action = 'iam_role_binding.update' AND resource_id = $2",
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&binding_id)
    .fetch_one(&pg)
    .await
    .expect("count role binding update audit events");
    assert!(audit_count >= 1);

    for id in [
        &binding_id,
        &foreign_binding_id,
        &auditor_binding_id,
        &custom_binding_id,
    ] {
        sqlx::query("DELETE FROM iam_role_binding WHERE tenant_id = $1 AND id = $2")
            .bind(DEFAULT_IAM_TENANT_ID)
            .bind(id)
            .execute(&pg)
            .await
            .expect("remove role binding integration fixture");
    }
    sqlx::query("DELETE FROM iam_role_permission WHERE tenant_id = $1 AND role_id = $2")
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(&custom_role_id)
        .execute(&pg)
        .await
        .expect("remove custom role permission fixture");
    sqlx::query("DELETE FROM iam_role WHERE tenant_id = $1 AND id = $2")
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(&custom_role_id)
        .execute(&pg)
        .await
        .expect("remove custom role fixture");
    sqlx::query("DELETE FROM iam_permission WHERE id = $1")
        .bind(&custom_permission_id)
        .execute(&pg)
        .await
        .expect("remove custom permission fixture");
}

#[tokio::test]
async fn backend_postgres_oauth_lists_succeed_with_and_without_search_query() {
    use backend_postgres_bootstrap::{
        configure_backend_integration_runtime_env, integration_access_credential_request_body,
        seed_backend_integration_bootstrap_owner,
    };

    let _guard = lock_local_iam_env();
    let Some(_database_url) = iam_postgres_url() else {
        eprintln!(
            "SKIP backend_postgres_oauth_lists_succeed_with_and_without_search_query: IAM postgres URL not configured"
        );
        return;
    };

    unified_database_env::apply_workspace_postgres_env();
    configure_backend_integration_runtime_env();

    let pg = connect_iam_postgres().await;
    let _ = seed_backend_integration_bootstrap_owner(&pg).await;

    // Seed one integration row so the list has data to return.
    let integration_id = format!("iomi_{}", Uuid::now_v7());
    sqlx::query(
        "INSERT INTO iam_oauth_integration \
         (id, uuid, tenant_id, organization_id, app_id, environment, deployment_mode, \
          provider_code, provider_catalog_id, integration_code, display_name, purpose_json, \
          capability_json, region_group, protocol_family, account_operation_enabled, \
          operator_authorization_enabled, enabled, health_status, status, created_at, updated_at, version) \
         VALUES ($1, $2, $3, '0', '0', 'development', 'standalone', 'wechat', 'c_direct_0000000000', \
          'wechat-official', 'WeChat Official Account', '[]', '[]', 'cn', 'web_authorization', 0, 0, 1, \
          'healthy', 'enabled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)",
    )
    .bind(&integration_id)
    .bind(Uuid::now_v7().to_string())
    .bind(DEFAULT_IAM_TENANT_ID)
    .execute(&pg)
    .await
    .expect("insert integration test oauth integration row");

    let router = build_sdkwork_iam_backend_api_router_from_env().await;
    let credential_body = integration_access_credential_request_body();
    let (credential_status, credential_text, credential_payload) = request_backend_route(
        router.clone(),
        Method::POST,
        "/backend/v3/api/iam/access_credentials",
        Some(&credential_body),
    )
    .await;

    assert_eq!(
        StatusCode::OK,
        credential_status,
        "bootstrap access credential issuance must succeed: {credential_text}"
    );
    let access_token = credential_payload["data"]["accessToken"]
        .as_str()
        .or_else(|| credential_payload["data"]["accessCredential"].as_str())
        .expect("access credential response must include accessToken");
    let auth_token = credential_payload["data"]["authToken"]
        .as_str()
        .expect("access credential response must include authToken");

    // Regression: the oauth list SQL must bind the search placeholder even
    // when no `q` query parameter is supplied, or the positional binds shift
    // and the list endpoint fails with a 50001 internal error.
    for path in [
        "/backend/v3/api/iam/oauth/integrations",
        "/backend/v3/api/iam/oauth/resource_accounts",
        "/backend/v3/api/iam/oauth/integrations?q=wechat",
        "/backend/v3/api/iam/oauth/resource_accounts?q=wechat",
    ] {
        let response = router
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri(path)
                    .header("content-type", "application/json")
                    .header("authorization", format!("Bearer {auth_token}"))
                    .header("access-token", access_token)
                    .body(Body::from(String::new()))
                    .unwrap(),
            )
            .await
            .unwrap();
        let status = response.status();
        let bytes = response.into_body().collect().await.unwrap().to_bytes();
        let body_text = String::from_utf8(bytes.to_vec()).unwrap();
        let payload = serde_json::from_str(&body_text).unwrap_or(Value::Null);
        assert_eq!(
            StatusCode::OK,
            status,
            "authenticated oauth list must succeed for {path}: {body_text}"
        );
        assert_eq!(
            payload["code"], 0,
            "authenticated oauth list must return appbase success envelope for {path}: {body_text}"
        );
        let items = payload["data"]["items"]
            .as_array()
            .expect("oauth list must return page items");
        if path.starts_with("/backend/v3/api/iam/oauth/integrations") {
            assert!(
                items
                    .iter()
                    .any(|item| item["id"].as_str() == Some(integration_id.as_str())),
                "integrations list must include the seeded row: {body_text}"
            );
        }
    }

    let _ = sqlx::query("DELETE FROM iam_oauth_integration WHERE id = $1")
        .bind(&integration_id)
        .execute(&pg)
        .await;
}

#[tokio::test]
async fn backend_postgres_user_create_and_update_roundtrip_with_profile_fields() {
    use backend_postgres_bootstrap::{
        configure_backend_integration_runtime_env, integration_access_credential_request_body,
        seed_backend_integration_bootstrap_owner, INTEGRATION_ORGANIZATION_ID,
    };

    let _guard = lock_local_iam_env();
    let Some(_database_url) = iam_postgres_url() else {
        eprintln!(
            "SKIP backend_postgres_user_create_and_update_roundtrip_with_profile_fields: IAM postgres URL not configured"
        );
        return;
    };

    unified_database_env::apply_workspace_postgres_env();
    configure_backend_integration_runtime_env();

    let pg = connect_iam_postgres().await;
    seed_backend_integration_bootstrap_owner(&pg).await;

    // The shared harness scopes the integration owner to read-only directory
    // permissions; this roundtrip also exercises the create/update surface, so
    // widen the tenant application's access permissions before the credential
    // is issued.
    sqlx::query(
        "UPDATE iam_application_installation \
         SET access_permissions_json = '[\"iam:self\", \"iam.users.read\", \"iam.users.create\", \"iam.users.update\", \"iam.oauth.read\"]'::jsonb, updated_at = CURRENT_TIMESTAMP \
         WHERE tenant_id = $1 AND organization_id = $2",
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(INTEGRATION_ORGANIZATION_ID)
    .execute(&pg)
    .await
    .expect("widen integration tenant application access permissions for user create/update roundtrip");

    let router = build_sdkwork_iam_backend_api_router_from_env().await;
    let credential_body = integration_access_credential_request_body();
    let (credential_status, credential_text, credential_payload) = request_backend_route(
        router.clone(),
        Method::POST,
        "/backend/v3/api/iam/access_credentials",
        Some(&credential_body),
    )
    .await;

    assert_eq!(
        StatusCode::OK,
        credential_status,
        "bootstrap access credential issuance must succeed: {credential_text}"
    );
    let access_token = credential_payload["data"]["accessToken"]
        .as_str()
        .or_else(|| credential_payload["data"]["accessCredential"].as_str())
        .expect("access credential response must include accessToken");
    let auth_token = credential_payload["data"]["authToken"]
        .as_str()
        .expect("access credential response must include authToken");
    let auth_headers = move |request: axum::http::request::Builder| {
        request
            .header("content-type", "application/json")
            .header("authorization", format!("Bearer {auth_token}"))
            .header("access-token", access_token)
    };

    let unique = Uuid::now_v7().to_string();
    let username = format!("backend-profile-{unique}");
    let create_body = serde_json::json!({
        "username": username,
        "displayName": "Backend Profile User",
        "email": format!("{username}@sdkwork-iam.test"),
        "phone": "+8613800000000",
        "gender": "female",
        "birthDate": "1998-07-15",
        "country": "CN",
        "avatarUrl": "https://cdn.sdkwork.test/avatars/backend-profile.png",
        "initialPassword": "Initial#2026Pass",
    });

    let response = router
        .clone()
        .oneshot(
            auth_headers(
                Request::builder()
                    .method(Method::POST)
                    .uri("/backend/v3/api/iam/users"),
            )
            .body(Body::from(create_body.to_string()))
            .unwrap(),
        )
        .await
        .unwrap();
    let create_status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let create_text = String::from_utf8(bytes.to_vec()).unwrap();
    let create_payload = serde_json::from_str::<Value>(&create_text).unwrap_or(Value::Null);

    assert!(
        create_status.is_success(),
        "authenticated user create must succeed: {create_text}"
    );
    assert_eq!(
        create_payload["code"], 0,
        "user create must return appbase success envelope: {create_text}"
    );
    let created = create_payload["data"]
        .as_object()
        .expect("user create must return data");
    let created_user_id = created["userId"]
        .as_str()
        .or_else(|| created["id"].as_str())
        .expect("user create must return userId")
        .to_owned();
    assert_eq!(
        Some("female"),
        created["gender"].as_str(),
        "create must echo gender: {create_text}"
    );
    assert_eq!(
        Some("1998-07-15"),
        created["birthDate"].as_str(),
        "create must echo birthDate: {create_text}"
    );
    assert_eq!(
        Some("CN"),
        created["country"].as_str(),
        "create must echo country: {create_text}"
    );
    assert_eq!(
        Some("https://cdn.sdkwork.test/avatars/backend-profile.png"),
        created["avatarUrl"].as_str(),
        "create must echo avatarUrl: {create_text}"
    );

    let credential_row = sqlx::query(
        "SELECT credential_hash FROM iam_credential \
         WHERE tenant_id = $1 AND user_id = $2 AND credential_type = 'password' LIMIT 1",
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&created_user_id)
    .fetch_optional(&pg)
    .await
    .expect("query created password credential");

    let credential_hash = credential_row
        .expect("initial password must create an iam_credential row")
        .get::<String, _>("credential_hash");
    assert!(
        credential_hash.starts_with("$argon2"),
        "initial password must be stored as an argon2 hash: {credential_hash}"
    );

    let password_changed_row =
        sqlx::query("SELECT password_changed_at FROM iam_user WHERE tenant_id = $1 AND id = $2")
            .bind(DEFAULT_IAM_TENANT_ID)
            .bind(&created_user_id)
            .fetch_optional(&pg)
            .await
            .expect("query password_changed_at")
            .expect("created user row must exist");
    assert!(
        password_changed_row
            .get::<Option<String>, _>("password_changed_at")
            .is_some(),
        "initial password must stamp password_changed_at"
    );

    let update_body = serde_json::json!({
        "displayName": "Backend Profile User (updated)",
        "gender": "male",
        "birthDate": "1999-01-02",
        "country": "JP",
    });
    let response = router
        .clone()
        .oneshot(
            auth_headers(
                Request::builder()
                    .method(Method::PATCH)
                    .uri(format!("/backend/v3/api/iam/users/{created_user_id}").as_str()),
            )
            .body(Body::from(update_body.to_string()))
            .unwrap(),
        )
        .await
        .unwrap();
    let update_status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let update_text = String::from_utf8(bytes.to_vec()).unwrap();
    let update_payload = serde_json::from_str::<Value>(&update_text).unwrap_or(Value::Null);

    assert!(
        update_status.is_success(),
        "authenticated user update must succeed: {update_text}"
    );
    assert_eq!(
        Some("male"),
        update_payload["data"]["gender"].as_str(),
        "update must apply gender: {update_text}"
    );
    assert_eq!(
        Some("1999-01-02"),
        update_payload["data"]["birthDate"].as_str(),
        "update must apply birthDate: {update_text}"
    );
    assert_eq!(
        Some("JP"),
        update_payload["data"]["country"].as_str(),
        "update must apply country: {update_text}"
    );

    let list_response = router
        .clone()
        .oneshot(
            auth_headers(
                Request::builder()
                    .method(Method::GET)
                    .uri(format!("/backend/v3/api/iam/users?q={username}").as_str()),
            )
            .body(Body::from(String::new()))
            .unwrap(),
        )
        .await
        .unwrap();
    let list_status = list_response.status();
    let bytes = list_response
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let list_text = String::from_utf8(bytes.to_vec()).unwrap();
    let list_payload = serde_json::from_str::<Value>(&list_text).unwrap_or(Value::Null);

    assert_eq!(
        StatusCode::OK,
        list_status,
        "authenticated user list must succeed: {list_text}"
    );
    let items = list_payload["data"]["items"]
        .as_array()
        .expect("user list must return page items");
    let listed = items
        .iter()
        .find(|item| item["id"].as_str() == Some(created_user_id.as_str()))
        .expect("user list must include the created user");
    assert_eq!(
        Some("JP"),
        listed["country"].as_str(),
        "list must carry profile columns: {list_text}"
    );
    assert!(
        listed["avatarUrl"].is_string(),
        "list must carry the avatar delivery URL: {list_text}"
    );

    let _ = sqlx::query("DELETE FROM iam_credential WHERE tenant_id = $1 AND user_id = $2")
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(&created_user_id)
        .execute(&pg)
        .await;
    let _ = sqlx::query("DELETE FROM iam_user WHERE tenant_id = $1 AND id = $2")
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(&created_user_id)
        .execute(&pg)
        .await;
}

#[tokio::test]
async fn backend_postgres_role_resource_catalog_filters_and_relation_integrity() {
    use backend_postgres_bootstrap::{
        configure_backend_integration_runtime_env, integration_access_credential_request_body,
        seed_backend_integration_bootstrap_owner, INTEGRATION_ORGANIZATION_ID,
    };

    let _guard = lock_local_iam_env();
    let Some(_database_url) = iam_postgres_url() else {
        eprintln!(
            "SKIP backend_postgres_role_resource_catalog_filters_and_relation_integrity: IAM postgres URL not configured"
        );
        return;
    };
    unified_database_env::apply_workspace_postgres_env();
    configure_backend_integration_runtime_env();
    let pg = connect_iam_postgres().await;
    seed_backend_integration_bootstrap_owner(&pg).await;

    let unique = Uuid::now_v7().simple().to_string();
    let role_id = format!("iamr_resource_{unique}");
    let permission_ids = [
        format!("iamp_resource_a_{unique}"),
        format!("iamp_resource_b_{unique}"),
        format!("iamp_resource_c_{unique}"),
    ];
    let resources = [
        format!("resource-{unique}-a"),
        format!("resource-{unique}-b"),
        format!("resource-{unique}-b"),
    ];
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO iam_role (id, tenant_id, code, name, status, created_at, updated_at) \
         VALUES ($1, $2, $3, 'Resource Integration Role', 'active', $4, $4)",
    )
    .bind(&role_id)
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(format!("resource_integration_{unique}"))
    .bind(&now)
    .execute(&pg)
    .await
    .expect("insert resource integration role");
    for (index, permission_id) in permission_ids.iter().enumerate() {
        sqlx::query(
            "INSERT INTO iam_permission (id, code, name, resource, action, created_at) \
             VALUES ($1, $2, $3, $4, 'read', $5)",
        )
        .bind(permission_id)
        .bind(format!("iam.resource{index}.read.{unique}"))
        .bind(format!("Resource permission {index}"))
        .bind(&resources[index])
        .bind(&now)
        .execute(&pg)
        .await
        .expect("insert resource integration permission");
    }
    sqlx::query(
        "INSERT INTO iam_role_permission (id, tenant_id, role_id, permission_id, created_at) \
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(format!("iamrp_resource_{unique}"))
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&role_id)
    .bind(&permission_ids[0])
    .bind(&now)
    .execute(&pg)
    .await
    .expect("grant resource integration permission");

    let router = build_sdkwork_iam_backend_api_router_from_env().await;
    let (status, credential_text, credential) = request_backend_route(
        router.clone(),
        Method::POST,
        "/backend/v3/api/iam/access_credentials",
        Some(&integration_access_credential_request_body()),
    )
    .await;
    assert_eq!(
        StatusCode::OK,
        status,
        "credential issuance failed: {credential_text}"
    );
    let auth_token = credential["data"]["authToken"]
        .as_str()
        .expect("auth token");
    let access_token = credential["data"]["accessToken"]
        .as_str()
        .expect("access token");
    let prefix = format!("resource-{unique}");
    let page_router = router.clone();
    let get_page = |path: String| {
        let router = page_router.clone();
        async move { authenticated_get_page(router, &path, auth_token, access_token).await }
    };

    let (status, text, payload, _) = get_page(
        format!("/backend/v3/api/iam/permissions/resources?page=1&page_size=1&q={prefix}")
            .to_string(),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "{text}");
    assert_eq!(payload["data"]["pageInfo"]["totalItems"], "2");
    assert_eq!(payload["data"]["items"][0]["resource"], resources[0]);
    assert_eq!(payload["data"]["items"][0]["permissionCount"], "1");
    let (status, text, payload, _) = get_page(
        format!("/backend/v3/api/iam/permissions/resources?page=2&page_size=1&q={prefix}")
            .to_string(),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "{text}");
    assert_eq!(payload["data"]["items"][0]["resource"], resources[1]);
    assert_eq!(payload["data"]["items"][0]["permissionCount"], "2");

    let (status, text, payload, _) = get_page(
        format!(
            "/backend/v3/api/iam/permissions?page=1&page_size=20&resource={}",
            resources[1]
        )
        .to_string(),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "{text}");
    assert_eq!(payload["data"]["items"].as_array().map(Vec::len), Some(2));
    let (status, text, payload, _) = get_page(
        format!(
            "/backend/v3/api/iam/permissions?page=1&page_size=20&resource={}-A",
            prefix
        )
        .to_string(),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "{text}");
    assert_eq!(payload["data"]["items"], serde_json::json!([]));

    for (assigned, expected_ids) in [
        (true, vec![permission_ids[0].as_str()]),
        (
            false,
            vec![permission_ids[1].as_str(), permission_ids[2].as_str()],
        ),
    ] {
        let (status, text, payload, _) = get_page(format!(
            "/backend/v3/api/iam/permissions?page=1&page_size=20&role_id={role_id}&assigned={assigned}&q={unique}"
        ).to_string())
        .await;
        assert_eq!(StatusCode::OK, status, "{text}");
        let ids: Vec<&str> = payload["data"]["items"]
            .as_array()
            .expect("permission items")
            .iter()
            .map(|item| item["id"].as_str().expect("permission id"))
            .collect();
        assert_eq!(ids, expected_ids);
    }
    let (status, text, payload, _) = get_page(format!(
        "/backend/v3/api/iam/permissions?page=1&page_size=20&role_id=missing-{unique}&assigned=false&q={unique}"
    ).to_string())
    .await;
    assert_eq!(StatusCode::OK, status, "{text}");
    assert_eq!(payload["data"]["items"], serde_json::json!([]));
    let (status, text, payload, _) = get_page(
        format!(
            "/backend/v3/api/iam/roles/{role_id}/permissions?page=1&page_size=20&resource={}",
            resources[1]
        )
        .to_string(),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "{text}");
    assert_eq!(payload["data"]["items"], serde_json::json!([]));
    let (status, text, error_payload, content_type) =
        get_page("/backend/v3/api/iam/permissions/resources?page=1&page_size=201".to_owned()).await;
    assert_eq!(StatusCode::BAD_REQUEST, status, "{text}");
    assert_eq!(error_payload["code"], 40003);
    assert!(content_type.is_some_and(|value| value.starts_with("application/problem+json")));
    let (status, text, error_payload, _) =
        get_page("/backend/v3/api/iam/permissions?page=1&page_size=20&assigned=true".to_owned())
            .await;
    assert_eq!(StatusCode::BAD_REQUEST, status, "{text}");
    assert_eq!(error_payload["code"], 40003);

    let orphan_role_id = format!("iamr_other_tenant_{unique}");
    sqlx::query(
        "INSERT INTO iam_role (id, tenant_id, code, name, status, created_at, updated_at) \
         VALUES ($1, 'other-tenant', $2, 'Other Tenant Role', 'active', $3, $3)",
    )
    .bind(&orphan_role_id)
    .bind(format!("other_resource_{unique}"))
    .bind(&now)
    .execute(&pg)
    .await
    .expect("insert cross-tenant role fixture");
    let cross_tenant = sqlx::query(
        "INSERT INTO iam_role_permission (id, tenant_id, role_id, permission_id, created_at) \
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(format!("iamrp_cross_{unique}"))
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&orphan_role_id)
    .bind(&permission_ids[0])
    .bind(&now)
    .execute(&pg)
    .await;
    assert!(cross_tenant.as_ref().is_err_and(|error| {
        error
            .as_database_error()
            .is_some_and(|error| error.code().as_deref() == Some("23503"))
    }));
    let orphan_binding = sqlx::query(
        "INSERT INTO iam_role_binding (id, tenant_id, organization_id, role_id, principal_kind, principal_id, \
         scope_kind, scope_id, effect, status, created_at, updated_at) \
         VALUES ($1, $2, '0', $3, 'user', $4, 'tenant', '0', 'allow', 'active', $5, $5)",
    )
    .bind(format!("iamrb_cross_{unique}"))
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&orphan_role_id)
    .bind(format!("iamu_missing_{unique}"))
    .bind(&now)
    .execute(&pg)
    .await;
    assert!(orphan_binding.as_ref().is_err_and(|error| {
        error
            .as_database_error()
            .is_some_and(|error| error.code().as_deref() == Some("23503"))
    }));

    let binding_id = format!("iamrb_resource_{unique}");
    sqlx::query(
        "INSERT INTO iam_role_binding (id, tenant_id, organization_id, role_id, principal_kind, principal_id, \
         scope_kind, scope_id, effect, status, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, 'user', $5, 'organization', $3, 'allow', 'active', $6, $6)",
    )
    .bind(&binding_id)
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(INTEGRATION_ORGANIZATION_ID)
    .bind(&role_id)
    .bind(format!("iamu_missing_{unique}"))
    .bind(&now)
    .execute(&pg)
    .await
    .expect("insert role binding for delete regression");
    let duplicate_grant = sqlx::query(
        "INSERT INTO iam_role_permission (id, tenant_id, role_id, permission_id, created_at) \
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(format!("iamrp_duplicate_{unique}"))
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&role_id)
    .bind(&permission_ids[0])
    .bind(&now)
    .execute(&pg)
    .await;
    assert!(duplicate_grant.as_ref().is_err_and(|error| {
        error
            .as_database_error()
            .is_some_and(|error| error.code().as_deref() == Some("23505"))
    }));

    let (status, text, _, _) = authenticated_backend_request(
        router.clone(),
        Method::DELETE,
        &format!("/backend/v3/api/iam/roles/{role_id}"),
        auth_token,
        access_token,
        None,
    )
    .await;
    assert_eq!(StatusCode::NO_CONTENT, status, "{text}");
    let role_status: String =
        sqlx::query_scalar("SELECT status FROM iam_role WHERE tenant_id = $1 AND id = $2")
            .bind(DEFAULT_IAM_TENANT_ID)
            .bind(&role_id)
            .fetch_one(&pg)
            .await
            .expect("read soft-deleted role");
    assert_eq!(role_status, "disabled");
    let binding_status: String =
        sqlx::query_scalar("SELECT status FROM iam_role_binding WHERE tenant_id = $1 AND id = $2")
            .bind(DEFAULT_IAM_TENANT_ID)
            .bind(&binding_id)
            .fetch_one(&pg)
            .await
            .expect("read revoked role binding after role delete");
    assert_eq!(binding_status, "revoked");
    let retained_grants: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM iam_role_permission WHERE tenant_id = $1 AND role_id = $2",
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&role_id)
    .fetch_one(&pg)
    .await
    .expect("count retained role permissions after role delete");
    assert_eq!(retained_grants, 1);

    sqlx::query("DELETE FROM iam_role_binding WHERE tenant_id = $1 AND id = $2")
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(&binding_id)
        .execute(&pg)
        .await
        .ok();
    sqlx::query("DELETE FROM iam_role_permission WHERE tenant_id = $1 AND role_id = $2")
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(&role_id)
        .execute(&pg)
        .await
        .ok();
    sqlx::query("DELETE FROM iam_role WHERE id = $1")
        .bind(&role_id)
        .execute(&pg)
        .await
        .ok();
    sqlx::query("DELETE FROM iam_role WHERE id = $1")
        .bind(&orphan_role_id)
        .execute(&pg)
        .await
        .ok();
    for permission_id in &permission_ids {
        sqlx::query("DELETE FROM iam_permission WHERE id = $1")
            .bind(permission_id)
            .execute(&pg)
            .await
            .ok();
    }
}

async fn authenticated_get_page(
    router: axum::Router,
    path: &str,
    auth_token: &str,
    access_token: &str,
) -> (StatusCode, String, Value, Option<String>) {
    authenticated_backend_request(router, Method::GET, path, auth_token, access_token, None).await
}

async fn authenticated_backend_request(
    router: axum::Router,
    method: Method,
    path: &str,
    auth_token: &str,
    access_token: &str,
    body: Option<&str>,
) -> (StatusCode, String, Value, Option<String>) {
    let response = router
        .oneshot(
            Request::builder()
                .method(method)
                .uri(path)
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {auth_token}"))
                .header("access-token", access_token)
                .body(Body::from(body.unwrap_or_default().to_owned()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let body_text = String::from_utf8(bytes.to_vec()).unwrap();
    let payload = serde_json::from_str(&body_text).unwrap_or(Value::Null);
    (status, body_text, payload, content_type)
}

async fn request_backend_route(
    router: axum::Router,
    method: Method,
    path: &str,
    body: Option<&str>,
) -> (StatusCode, String, Value) {
    let response = router
        .oneshot(
            Request::builder()
                .method(method)
                .uri(path)
                .header("content-type", "application/json")
                .body(Body::from(body.unwrap_or_default().to_owned()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let body_text = String::from_utf8(bytes.to_vec()).unwrap();
    let payload = serde_json::from_str(&body_text).unwrap_or(Value::Null);
    (status, body_text, payload)
}
