//! Uninstall step of an installation, executed against a real PostgreSQL instance.
//!
//! `APPLICATION_FACTORY_DEPLOYMENT_SPEC.md` sections 3 and 9 make uninstall a
//! forward-only disable: the installation and every live environment of it stop
//! accepting credentials, and nothing is deleted. This file proves the parts only
//! a database can prove:
//!
//! * `disable_tenant_application` moves the installation *and* its live
//!   environments to `disabled` in one transaction,
//! * the same call is idempotent (a second call is `Ok` and changes nothing),
//! * no row is deleted — a soft-deleted environment row is left untouched, and
//!   the installation row survives so its history stays readable,
//! * the deploy-application anchor resolves to the same disable path, so the
//!   deploy uninstall flow does not need the IAM row id.
//!
//! Run with a migrated database:
//!
//! ```text
//! SDKWORK_DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/db \
//!   cargo test -p sdkwork-iam-web-adapter --test installation_disable_postgres -- --ignored
//! ```
//!
//! Every test skips (returns) when `SDKWORK_DATABASE_URL` is unset, or when
//! migration 0044/0039 has not been applied, so the suite reports the reason
//! instead of failing on provisioning.

use sdkwork_iam_web_adapter::{
    disable_tenant_application, disable_tenant_application_by_deploy_application_id,
};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

fn database_url() -> Option<String> {
    std::env::var("SDKWORK_DATABASE_URL")
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

async fn connect() -> Option<PgPool> {
    let url = database_url()?;
    let pool = PgPoolOptions::new()
        .max_connections(2)
        .connect(&url)
        .await
        .ok()?;
    let migrated: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::BIGINT FROM information_schema.columns \
         WHERE table_name = 'iam_application_installation_environment' AND column_name = 'env_status'",
    )
    .fetch_one(&pool)
    .await
    .ok()?;
    if migrated == 0 {
        eprintln!("skipping: migrations 0039/0044 have not been applied");
        return None;
    }
    Some(pool)
}

fn unique_id(prefix: &str) -> String {
    format!("{prefix}_{}", uuid::Uuid::now_v7().simple())
}

async fn seed_installation(
    pg: &PgPool,
    tenant_id: &str,
    installation_id: &str,
    deploy_application_id: &str,
) {
    sqlx::query(
        "INSERT INTO iam_application_installation \
         (id, app_id, tenant_id, organization_id, instance_key, display_name, environment, \
          application_type, status, primary_domain, domain_config_json, access_permissions_json, \
          runtime_config_json, provisioned_at, activated_at, created_at, updated_at, \
          deploy_application_id) \
         VALUES ($1, $2, $3, '0', $1, 'Disable verify', 'production', 'pc', 'enabled', \
                 NULL, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, \
                 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $4)",
    )
    .bind(installation_id)
    .bind(format!("app_{installation_id}"))
    .bind(tenant_id)
    .bind(deploy_application_id)
    .execute(pg)
    .await
    .expect("insert installation fixture");
}

async fn seed_environment(
    pg: &PgPool,
    tenant_id: &str,
    installation_id: &str,
    env_key: &str,
    env_status: &str,
    deleted: bool,
) -> String {
    let environment_id = unique_id(&format!("env_{env_key}"));
    sqlx::query(
        "INSERT INTO iam_application_installation_environment \
         (id, tenant_id, organization_id, installation_id, env_key, env_status, created_at, \
          updated_at, deleted_at) \
         VALUES ($1, $2, '0', $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, \
                 CASE WHEN $6 THEN CURRENT_TIMESTAMP ELSE NULL END)",
    )
    .bind(&environment_id)
    .bind(tenant_id)
    .bind(installation_id)
    .bind(env_key)
    .bind(env_status)
    .bind(deleted)
    .execute(pg)
    .await
    .expect("insert environment fixture");
    environment_id
}

async fn environment_status(pg: &PgPool, environment_id: &str) -> String {
    sqlx::query_scalar(
        "SELECT env_status FROM iam_application_installation_environment WHERE id = $1",
    )
    .bind(environment_id)
    .fetch_one(pg)
    .await
    .expect("read environment status")
}

async fn installation_status(pg: &PgPool, installation_id: &str) -> String {
    sqlx::query_scalar("SELECT status FROM iam_application_installation WHERE id = $1")
        .bind(installation_id)
        .fetch_one(pg)
        .await
        .expect("read installation status")
}

async fn cleanup(pg: &PgPool, tenant_id: &str) {
    // Migration 0045 replaced the cascading delete with RESTRICT, so the fixture
    // removes its own children; the rows it keeps are the ones under test.
    let _ = sqlx::query(
        "DELETE FROM iam_application_installation_credential WHERE tenant_id = $1 \
           AND installation_environment_id IN \
               (SELECT id FROM iam_application_installation_environment WHERE tenant_id = $1)",
    )
    .bind(tenant_id)
    .execute(pg)
    .await;
    let _ =
        sqlx::query("DELETE FROM iam_application_installation_environment WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(pg)
            .await;
    let _ = sqlx::query("DELETE FROM iam_application_installation WHERE tenant_id = $1")
        .bind(tenant_id)
        .execute(pg)
        .await;
}

#[tokio::test]
#[ignore = "requires a migrated PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn disabling_an_installation_disables_its_live_environments_and_deletes_nothing() {
    let Some(pg) = connect().await else {
        return;
    };
    let tenant_id = unique_id("tenant_disable");
    let installation_id = unique_id("inst_disable");
    seed_installation(&pg, &tenant_id, &installation_id, &unique_id("deploy")).await;
    let development = seed_environment(
        &pg,
        &tenant_id,
        &installation_id,
        "development",
        "active",
        false,
    )
    .await;
    let production = seed_environment(
        &pg,
        &tenant_id,
        &installation_id,
        "production",
        "active",
        false,
    )
    .await;
    let retired =
        seed_environment(&pg, &tenant_id, &installation_id, "staging", "active", true).await;

    let disabled = disable_tenant_application(&pg, &tenant_id, &installation_id)
        .await
        .expect("disable the installation");
    assert_eq!(disabled.status, "disabled");
    assert_eq!(installation_status(&pg, &installation_id).await, "disabled");
    assert_eq!(environment_status(&pg, &development).await, "disabled");
    assert_eq!(environment_status(&pg, &production).await, "disabled");
    assert_eq!(
        environment_status(&pg, &retired).await,
        "active",
        "a soft-deleted environment row is history, not a live registration"
    );

    // Idempotent: already disabled is still Ok and changes nothing.
    let again = disable_tenant_application(&pg, &tenant_id, &installation_id)
        .await
        .expect("a second disable is idempotent");
    assert_eq!(again.status, "disabled");
    assert_eq!(environment_status(&pg, &development).await, "disabled");

    // The uninstall path never deletes: the installation and all three
    // environment rows (including the soft-deleted one) are still there.
    let installations: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::BIGINT FROM iam_application_installation WHERE tenant_id = $1",
    )
    .bind(&tenant_id)
    .fetch_one(&pg)
    .await
    .expect("count installations");
    let environments: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::BIGINT FROM iam_application_installation_environment WHERE tenant_id = $1",
    )
    .bind(&tenant_id)
    .fetch_one(&pg)
    .await
    .expect("count environments");
    assert_eq!(installations, 1, "the installation row survives uninstall");
    assert_eq!(
        environments, 3,
        "no environment row is deleted by uninstall"
    );

    cleanup(&pg, &tenant_id).await;
}

#[tokio::test]
#[ignore = "requires a migrated PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn the_deploy_application_anchor_reaches_the_same_disable_path() {
    let Some(pg) = connect().await else {
        return;
    };
    let tenant_id = unique_id("tenant_anchor");
    let installation_id = unique_id("inst_anchor");
    let deploy_application_id = unique_id("deploy");
    seed_installation(&pg, &tenant_id, &installation_id, &deploy_application_id).await;
    let production = seed_environment(
        &pg,
        &tenant_id,
        &installation_id,
        "production",
        "active",
        false,
    )
    .await;

    let disabled = disable_tenant_application_by_deploy_application_id(
        &pg,
        &tenant_id,
        &deploy_application_id,
    )
    .await
    .expect("disable by deploy application anchor");
    assert_eq!(disabled.id, installation_id);
    assert_eq!(disabled.status, "disabled");
    assert_eq!(environment_status(&pg, &production).await, "disabled");

    // The same anchor is idempotent as well.
    disable_tenant_application_by_deploy_application_id(&pg, &tenant_id, &deploy_application_id)
        .await
        .expect("a second disable by anchor is idempotent");

    // An anchor that belongs to no installation of this tenant fails closed and
    // says so with the wording the management surface maps to 404.
    let error =
        disable_tenant_application_by_deploy_application_id(&pg, &tenant_id, &unique_id("deploy"))
            .await
            .expect_err("an unbound anchor must not disable another installation");
    assert!(error.contains("not found"), "{error}");
    assert_eq!(
        installation_status(&pg, &installation_id).await,
        "disabled",
        "the failed lookup must not touch the fixture installation"
    );

    cleanup(&pg, &tenant_id).await;
}

#[tokio::test]
#[ignore = "requires a migrated PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn a_missing_installation_is_reported_and_writes_nothing() {
    let Some(pg) = connect().await else {
        return;
    };
    let tenant_id = unique_id("tenant_missing");
    let error = disable_tenant_application(&pg, &tenant_id, &unique_id("inst_missing"))
        .await
        .expect_err("an unknown installation must be reported");
    assert!(error.contains("not found"), "{error}");
}
