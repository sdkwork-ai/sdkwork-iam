//! Fresh-cluster initialization regression.
//!
//! Proves that an **empty** PostgreSQL database becomes an operable IAM
//! deployment with one bootstrap pass: schema migration, default tenant/role
//! seeds, application registry registration/enablement, bootstrap admin user,
//! and claim-based public-token resolution.
//!
//! Run against a throwaway empty database:
//!
//! ```sh
//! SDKWORK_CLUSTER_REGRESSION_PG_URL='postgres://postgres:...@127.0.0.1:5432/fresh' \
//! SDKWORK_FRESH_CLUSTER_APP_ROOT='../sdkwork-cloudrouter/dist/application-registry' \
//! cargo run -p sdkwork-iam-database-host --example fresh_cluster_regression
//! ```
//!
//! The example never touches a non-empty database: it fails before writing when
//! the target already contains an `iam_tenant` table.
use anyhow::{bail, Context, Result};
use serde_json::Value;
use sqlx::PgPool;
use std::env;
use std::fs;
use std::path::PathBuf;

#[tokio::main]
async fn main() -> Result<()> {
    let database_url = env::var("SDKWORK_CLUSTER_REGRESSION_PG_URL")
        .context("SDKWORK_CLUSTER_REGRESSION_PG_URL is required")?;
    let app_root = PathBuf::from(
        env::var("SDKWORK_FRESH_CLUSTER_APP_ROOT")
            .context("SDKWORK_FRESH_CLUSTER_APP_ROOT is required")?,
    );
    let registry_path = app_root.join("application-registry.json");
    let registry: Value = serde_json::from_str(
        &fs::read_to_string(&registry_path)
            .with_context(|| format!("read registry {}", registry_path.display()))?,
    )?;
    let applications = registry["applications"]
        .as_array()
        .context("registry.applications must be an array")?;
    if applications.is_empty() {
        bail!("registry has no applications");
    }

    // Fresh-cluster lifecycle switches: this is the explicit install/ensure
    // phase, not a long-running gateway process.
    env::set_var("SDKWORK_DATABASE_ENGINE", "postgres");
    env::set_var("SDKWORK_DATABASE_URL", &database_url);
    // The workspace contract requires schema == database identity; derive both
    // from the throwaway database URL so the session gets a writable search_path.
    let database_identity = database_url
        .split('/')
        .next_back()
        .and_then(|tail| tail.split('?').next())
        .filter(|value| !value.is_empty())
        .context("database URL must name a database")?;
    env::set_var("SDKWORK_DATABASE_NAME", database_identity);
    env::set_var("SDKWORK_DATABASE_SCHEMA", database_identity);
    env::set_var("SDKWORK_DATABASE_MAX_CONNECTIONS", "5");
    env::set_var("SDKWORK_DATABASE_AUTO_MIGRATE", "true");
    env::set_var("SDKWORK_DATABASE_SEED_ON_BOOT", "true");
    env::set_var("SDKWORK_DATABASE_SEED_PROFILE", "operational");
    // Match the registry tokens materialized for production.
    env::set_var("SDKWORK_ENVIRONMENT", "production");
    env::set_var("SDKWORK_APP_ROOT", &app_root);
    env::set_var(
        "SDKWORK_IAM_SUPER_ADMIN_PASSWORD",
        "FreshClusterRegression!2026",
    );
    env::set_var(
        "SDKWORK_IAM_SIGNING_MASTER_SECRET",
        "fresh-cluster-regression-signing-master-secret",
    );

    let pool = sdkwork_database_sqlx::create_pool_from_env("IAM")
        .await
        .context("create IAM database pool")?
        .context("IAM database configuration is missing")?;

    // Guard: this regression requires an empty database (only the default
    // public schema exists). A reused database could hide a broken migration.
    let pg_probe: &PgPool = pool.as_postgres().context("expected PostgreSQL pool")?;
    let existing_iam_tables: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM information_schema.tables \
         WHERE table_schema = current_schema() AND table_name = 'iam_tenant'",
    )
    .fetch_one(pg_probe)
    .await
    .context("probe empty database")?;
    if existing_iam_tables != 0 {
        bail!("target database is not empty (iam_tenant already exists)");
    }

    let host = sdkwork_iam_database_host::bootstrap_iam_database(pool)
        .await
        .map_err(anyhow::Error::msg)
        .context("bootstrap IAM database on a fresh database")?;
    let pg: &PgPool = host.postgres_pool().map_err(anyhow::Error::msg)?;

    let tenants: i64 =
        sqlx::query_scalar("SELECT COUNT(*)::bigint FROM iam_tenant WHERE id = '100001'")
            .fetch_one(pg)
            .await
            .context("count default tenant")?;
    if tenants != 1 {
        bail!("default tenant 100001 was not seeded");
    }

    let admins: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM iam_user WHERE tenant_id = '100001' AND is_deleted = 0",
    )
    .fetch_one(pg)
    .await
    .context("count bootstrap administrators")?;
    if admins == 0 {
        bail!("bootstrap administrator user was not seeded");
    }

    let mut enabled_applications = 0usize;
    for application in applications {
        let app_id = application["appId"]
            .as_str()
            .context("registry application.appId")?;
        let status: Option<String> = sqlx::query_scalar(
            "SELECT status FROM iam_tenant_application \
             WHERE tenant_id = '100001' AND app_id = $1 LIMIT 1",
        )
        .bind(app_id)
        .fetch_optional(pg)
        .await
        .with_context(|| format!("read tenant application {app_id}"))?;
        if status.as_deref() != Some("enabled") {
            bail!("application {app_id} is not enabled after bootstrap: {status:?}");
        }
        enabled_applications += 1;
    }

    let duplicate_domains: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM (\
           SELECT primary_domain FROM iam_tenant_application \
           WHERE tenant_id = '100001' AND primary_domain IS NOT NULL \
           GROUP BY primary_domain HAVING COUNT(*) > 1\
         ) duplicates",
    )
    .fetch_one(pg)
    .await
    .context("check duplicate primary domains")?;
    if duplicate_domains != 0 {
        bail!("duplicate primary domains for tenant 100001: {duplicate_domains}");
    }

    let first_app_id = applications[0]["appId"]
        .as_str()
        .context("first registry appId")?;
    let token = registry["tokens"][first_app_id]["tokens"]["standalone"]
        .as_str()
        .with_context(|| format!("registry token for {first_app_id}"))?;
    let context = sdkwork_iam_web_adapter::resolve_application_access_token_context(pg, token)
        .await
        .with_context(|| format!("resolve public token for {first_app_id}"))?;
    if context.app_id != first_app_id {
        bail!(
            "token resolved to {} instead of {first_app_id}",
            context.app_id
        );
    }

    // Redeploy/restart convergence: the same bootstrap must be idempotent.
    let enabled_before: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM iam_tenant_application \
         WHERE tenant_id = '100001' AND status = 'enabled'",
    )
    .fetch_one(pg)
    .await
    .context("count enabled applications before rerun")?;
    let rerun = sdkwork_iam_database_host::bootstrap_iam_database(host.pool().clone())
        .await
        .map_err(anyhow::Error::msg)
        .context("rerun IAM bootstrap on the same database")?;
    let pg_rerun: &PgPool = rerun.postgres_pool().map_err(anyhow::Error::msg)?;
    let enabled_after: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM iam_tenant_application \
         WHERE tenant_id = '100001' AND status = 'enabled'",
    )
    .fetch_one(pg_rerun)
    .await
    .context("count enabled applications after rerun")?;
    if enabled_after != enabled_before {
        bail!("rerun changed enabled application count {enabled_before} -> {enabled_after}");
    }
    let tenants_after: i64 =
        sqlx::query_scalar("SELECT COUNT(*)::bigint FROM iam_tenant WHERE id = '100001'")
            .fetch_one(pg_rerun)
            .await
            .context("count tenants after rerun")?;
    if tenants_after != 1 {
        bail!("rerun duplicated the default tenant: {tenants_after}");
    }

    println!(
        "{}",
        serde_json::json!({
            "status": "ok",
            "tenants": tenants,
            "administrators": admins,
            "applicationsEnabled": enabled_applications,
            "tokenAppId": first_app_id,
        })
    );
    Ok(())
}
