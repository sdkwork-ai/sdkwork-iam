//! Shared PostgreSQL bootstrap helpers for backend-api integration tests.

use argon2::password_hash::{rand_core::OsRng, PasswordHasher, SaltString};
use argon2::Argon2;
use axum::Router;
use sdkwork_iam_bootstrap::{
    standard_role_id, upsert_postgres_standard_roles, DEFAULT_IAM_ORGANIZATION_ID,
    DEFAULT_IAM_TENANT_ID,
};
use sdkwork_iam_web_adapter::{
    enable_tenant_application, ensure_platform_tenant_application_with_deploy_application,
    provision_tenant_application, TenantApplicationProvisionCommand,
    SDKWORK_IAM_BOOTSTRAP_PASSWORD_ENV,
};
use sdkwork_routes_iam_backend_api::build_sdkwork_iam_backend_api_business_router_with_pool;
use sqlx::PgPool;
use uuid::Uuid;

pub const INTEGRATION_BOOTSTRAP_PASSWORD: &str = "BackendIntegration#2026";
pub const INTEGRATION_BOOTSTRAP_EMAIL: &str = "backend-integration-owner@sdkwork-iam.test";
pub const INTEGRATION_ORGANIZATION_ID: &str = "910001";
const INTEGRATION_ORGANIZATION_CODE: &str = "backend-integration";
/// Deploy application the integration installation serves; the delegated access
/// credential's `app_id`/`aud` is this value.
pub const INTEGRATION_DEPLOY_APPLICATION_ID: &str = "deploy_backend_integration";
const INTEGRATION_PLATFORM_DEPLOY_APPLICATION_ID: &str = "deploy_backend_integration_platform";

pub fn configure_backend_integration_runtime_env() {
    // SAFETY: backend integration tests run single-threaded under the IAM env mutex.
    unsafe {
        std::env::set_var("SDKWORK_ENV", "test");
        std::env::set_var("SDKWORK_DEPLOYMENT_MODE", "local");
        std::env::set_var(
            SDKWORK_IAM_BOOTSTRAP_PASSWORD_ENV,
            INTEGRATION_BOOTSTRAP_PASSWORD,
        );
        std::env::set_var("SDKWORK_IAM_RATE_LIMIT_MAX_REQUESTS", "10000");
        std::env::set_var("SDKWORK_IAM_RATE_LIMIT_WINDOW_SECONDS", "60");
    }
}

pub async fn seed_backend_integration_bootstrap_owner(pg: &PgPool) -> String {
    sdkwork_iam_bootstrap::upsert_postgres_default_subject(pg)
        .await
        .expect("seed default IAM tenant and organization");
    sdkwork_iam_bootstrap::import_postgres_default_iam_seed(pg)
        .await
        .expect("materialize IAM permission and role catalog for integration tests");
    upsert_postgres_standard_roles(pg, DEFAULT_IAM_TENANT_ID)
        .await
        .expect("seed standard IAM roles for integration tests");

    ensure_platform_tenant_application_with_deploy_application(
        pg,
        DEFAULT_IAM_TENANT_ID,
        INTEGRATION_PLATFORM_DEPLOY_APPLICATION_ID,
    )
    .await
    .expect("ensure platform tenant application for backend integration tests");
    ensure_integration_organization_and_tenant_application(pg)
        .await
        .expect("ensure integration organization tenant application");

    let password_hash = Argon2::default()
        .hash_password(
            INTEGRATION_BOOTSTRAP_PASSWORD.as_bytes(),
            &SaltString::generate(&mut OsRng),
        )
        .expect("hash bootstrap password for backend integration tests")
        .to_string();

    let now = chrono::Utc::now();
    let account_key = INTEGRATION_BOOTSTRAP_EMAIL.trim().to_ascii_lowercase();
    let user_id = format!("iamu_{}", Uuid::now_v7());

    sqlx::query(
        "DELETE FROM iam_role_binding WHERE tenant_id = $1 AND principal_id IN \
         (SELECT id FROM iam_organization_membership WHERE tenant_id = $1 AND user_id IN \
          (SELECT id FROM iam_user WHERE tenant_id = $1 AND LOWER(email) = $2))",
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&account_key)
    .execute(pg)
    .await
    .ok();

    sqlx::query(
        "DELETE FROM iam_organization_membership WHERE tenant_id = $1 AND user_id IN \
         (SELECT id FROM iam_user WHERE tenant_id = $1 AND LOWER(email) = $2)",
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&account_key)
    .execute(pg)
    .await
    .ok();

    sqlx::query(
        "DELETE FROM iam_credential WHERE tenant_id = $1 AND user_id IN \
         (SELECT id FROM iam_user WHERE tenant_id = $1 AND LOWER(email) = $2)",
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&account_key)
    .execute(pg)
    .await
    .ok();

    sqlx::query(
        "DELETE FROM iam_tenant_member WHERE tenant_id = $1 AND user_id IN \
         (SELECT id FROM iam_user WHERE tenant_id = $1 AND LOWER(email) = $2)",
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&account_key)
    .execute(pg)
    .await
    .ok();

    sqlx::query(
        "DELETE FROM iam_session WHERE tenant_id = $1 AND user_id IN \
         (SELECT id FROM iam_user WHERE tenant_id = $1 AND LOWER(email) = $2)",
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&account_key)
    .execute(pg)
    .await
    .ok();

    sqlx::query("DELETE FROM iam_user WHERE tenant_id = $1 AND LOWER(email) = $2")
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(&account_key)
        .execute(pg)
        .await
        .ok();

    sqlx::query(
        "INSERT INTO iam_user (id, tenant_id, username, display_name, email, phone, \
                email_verified, phone_verified, status, is_deleted, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, NULL, 1, 0, 'active', 0, $6, $6)",
    )
    .bind(&user_id)
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&account_key)
    .bind("Backend Integration Owner")
    .bind(INTEGRATION_BOOTSTRAP_EMAIL)
    .bind(&now)
    .execute(pg)
    .await
    .expect("insert backend integration bootstrap user");

    sqlx::query(
        "INSERT INTO iam_credential (id, tenant_id, user_id, credential_type, credential_hash, \
                failed_attempts, status, created_at, updated_at) \
         VALUES ($1, $2, $3, 'password', $4, 0, 'active', $5, $5)",
    )
    .bind(format!("iamc_{}", Uuid::now_v7()))
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&user_id)
    .bind(&password_hash)
    .bind(&now)
    .execute(pg)
    .await
    .expect("insert backend integration bootstrap credential");

    sqlx::query(
        "INSERT INTO iam_tenant_member (id, tenant_id, user_id, member_kind, status, joined_at, created_at, updated_at) \
         VALUES ($1, $2, $3, 'member', 'active', $4, $4, $4)",
    )
    .bind(format!("iamtm_{}", Uuid::now_v7()))
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&user_id)
    .bind(&now)
    .execute(pg)
    .await
    .expect("insert backend integration bootstrap tenant member");

    let membership_id = format!("iamom_owner_{user_id}");
    sqlx::query(
        "INSERT INTO iam_organization_membership (id, tenant_id, organization_id, user_id, \
         membership_kind, is_primary, status, joined_at, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, 'owner', 1, 'active', $5, $5, $5) \
         ON CONFLICT (tenant_id, organization_id, user_id, membership_kind) DO UPDATE SET \
         status = 'active', updated_at = EXCLUDED.updated_at",
    )
    .bind(&membership_id)
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(INTEGRATION_ORGANIZATION_ID)
    .bind(&user_id)
    .bind(&now)
    .execute(pg)
    .await
    .expect("insert backend integration bootstrap owner membership");

    let role_id = standard_role_id(DEFAULT_IAM_TENANT_ID, "org_admin");
    sqlx::query(
        "INSERT INTO iam_role_binding (id, tenant_id, organization_id, role_id, principal_kind, principal_id, \
         scope_kind, scope_id, effect, status, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, 'user', $5, 'organization', $3, 'allow', 'active', $6, $6) \
         ON CONFLICT (tenant_id, role_id, principal_kind, principal_id, scope_kind, scope_id) DO UPDATE SET \
         status = 'active', updated_at = EXCLUDED.updated_at",
    )
    .bind(format!("iamb_{user_id}_org_admin"))
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(INTEGRATION_ORGANIZATION_ID)
    .bind(&role_id)
    .bind(&user_id)
    .bind(&now)
    .execute(pg)
    .await
    .expect("bind org_admin role for backend integration bootstrap owner");

    user_id
}

async fn ensure_integration_organization_and_tenant_application(pg: &PgPool) -> Result<(), String> {
    let now = chrono::Utc::now();
    sqlx::query("DELETE FROM iam_organization WHERE tenant_id = $1 AND code = $2 AND id <> $3")
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(INTEGRATION_ORGANIZATION_CODE)
        .bind(INTEGRATION_ORGANIZATION_ID)
        .execute(pg)
        .await
        .map_err(|error| {
            format!("clear stale integration organization tenant/code rows failed: {error}")
        })?;

    // The organization primary key is tenant-scoped since migration
    // `0027_iam_organization_tenant_scoped_identity`; a bare
    // `ON CONFLICT (id)` no longer matches any unique constraint.
    sqlx::query(
        "INSERT INTO iam_organization (id, tenant_id, parent_organization_id, code, name, path, status, \
         organization_kind, tenant_boundary_kind, data_boundary_kind, app_boundary_enabled, verification_status, \
         created_at, updated_at) \
         VALUES ($1, $2, $3, $4, 'Backend Integration Organization', $5, 'active', 'team', 'exclusive', 'tenant', 0, \
         'verified', $6, $6) \
         ON CONFLICT (tenant_id, id) DO UPDATE SET status = 'active', updated_at = EXCLUDED.updated_at",
    )
    .bind(INTEGRATION_ORGANIZATION_ID)
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .bind(INTEGRATION_ORGANIZATION_CODE)
    .bind(format!("/{DEFAULT_IAM_ORGANIZATION_ID}/{INTEGRATION_ORGANIZATION_ID}"))
    .bind(&now)
    .execute(pg)
    .await
    .map_err(|error| format!("ensure integration organization failed: {error}"))?;

    let installation = provision_tenant_application(
        pg,
        &TenantApplicationProvisionCommand {
            tenant_id: DEFAULT_IAM_TENANT_ID.to_owned(),
            organization_id: INTEGRATION_ORGANIZATION_ID.to_owned(),
            app_id: Some("app_backend_integration".to_owned()),
            instance_key: "backend_integration_prod".to_owned(),
            display_name: "Backend Integration".to_owned(),
            environment: "production".to_owned(),
            application_type: Some("api".to_owned()),
            primary_domain: Some("backend-integration.localhost".to_owned()),
            access_permissions: vec![
                "iam:self".to_owned(),
                "iam.users.read".to_owned(),
                "iam.oauth.read".to_owned(),
            ],
            runtime_config: serde_json::json!({}),
            deploy_application_id: Some(INTEGRATION_DEPLOY_APPLICATION_ID.to_owned()),
            ownership_scope: Some("ORGANIZATION".to_owned()),
            owner_user_id: None,
            provisioning_idempotency_key: Some("backend-integration-910001".to_owned()),
        },
    )
    .await
    .map_err(|error| format!("provision integration organization application failed: {error}"))?;
    enable_tenant_application(pg, DEFAULT_IAM_TENANT_ID, &installation.id)
        .await
        .map_err(|error| format!("enable integration organization application failed: {error}"))?;
    Ok(())
}

pub async fn build_backend_integration_business_router() -> Router {
    let pool = sdkwork_database_sqlx::create_pool_from_env("IAM")
        .await
        .expect("connect backend integration PostgreSQL pool")
        .expect("backend integration PostgreSQL pool is configured");
    sdkwork_iam_database_host::ensure_iam_id_generator_initialized(&pool)
        .await
        .expect("initialize IAM id generator for backend integration tests");
    build_sdkwork_iam_backend_api_business_router_with_pool(pool)
        .expect("build backend integration business router")
}

pub fn integration_access_credential_request_body() -> String {
    serde_json::json!({
        "tenantId": DEFAULT_IAM_TENANT_ID,
        "organizationId": INTEGRATION_ORGANIZATION_ID,
        "appId": INTEGRATION_DEPLOY_APPLICATION_ID,
        "username": INTEGRATION_BOOTSTRAP_EMAIL,
        "password": INTEGRATION_BOOTSTRAP_PASSWORD,
    })
    .to_string()
}
