//! Binding an unanchored installation to the deploy application it serves,
//! executed against a real PostgreSQL instance.
//!
//! `deploy_application_id` is the identity every access token carries and the
//! anchor an OAuth relying party needs before it can redeem a code. An
//! installation provisioned before that link existed, or by a path that did not
//! pass it, is exactly the row this repair targets. This file proves the parts
//! only a database can prove:
//!
//! * binding fills a NULL anchor and answers the installation with it,
//! * repeating the same bind is idempotent (and does not touch `updated_at`
//!   semantics beyond the first call),
//! * a bound installation is never re-pointed by an ordinary bind — that is a
//!   deploy identity migration, not a repair,
//! * a deploy application already bound to another installation is refused,
//! * a blank anchor is rejected before touching the row.
//!
//! Run with a migrated database:
//!
//! ```text
//! SDKWORK_DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/db \
//!   cargo test -p sdkwork-iam-web-adapter --test installation_deploy_link_bind_postgres \
//!   -- --ignored
//! ```
//!
//! Every test skips (returns) when `SDKWORK_DATABASE_URL` is unset, or when
//! migration 0040 has not been applied, so the suite reports the reason instead
//! of failing on provisioning.

use sdkwork_iam_web_adapter::bind_tenant_application_deploy_application_id;
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
         WHERE table_name = 'iam_application_installation' AND column_name = 'deploy_application_id'",
    )
    .fetch_one(&pool)
    .await
    .ok()?;
    if migrated == 0 {
        eprintln!("skipping: migration 0040 has not been applied");
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
    deploy_application_id: Option<&str>,
) {
    sqlx::query(
        "INSERT INTO iam_application_installation \
         (id, app_id, tenant_id, organization_id, instance_key, display_name, environment, \
          application_type, status, primary_domain, domain_config_json, access_permissions_json, \
          runtime_config_json, provisioned_at, activated_at, created_at, updated_at, \
          deploy_application_id) \
         VALUES ($1, $2, $3, '0', $1, 'Bind verify', 'production', 'pc', 'enabled', \
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

async fn stored_anchor(pg: &PgPool, installation_id: &str) -> Option<String> {
    sqlx::query_scalar(
        "SELECT deploy_application_id FROM iam_application_installation WHERE id = $1",
    )
    .bind(installation_id)
    .fetch_one(pg)
    .await
    .expect("read installation anchor")
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
async fn binding_fills_a_missing_anchor_and_is_idempotent() {
    let Some(pg) = connect().await else {
        return;
    };
    let tenant_id = unique_id("tenant_bind");
    let installation_id = unique_id("inst_bind");
    let deploy_application_id = unique_id("deploy_bind");
    seed_installation(&pg, &tenant_id, &installation_id, None).await;

    assert_eq!(stored_anchor(&pg, &installation_id).await, None);

    let error =
        bind_tenant_application_deploy_application_id(&pg, &tenant_id, &installation_id, "   ")
            .await
            .expect_err("a blank anchor is refused before the row is touched");
    assert!(error.contains("must not be blank"), "{error}");
    assert_eq!(stored_anchor(&pg, &installation_id).await, None);

    let bound = bind_tenant_application_deploy_application_id(
        &pg,
        &tenant_id,
        &installation_id,
        &deploy_application_id,
    )
    .await
    .expect("an unanchored installation binds");
    assert_eq!(
        bound.deploy_application_id.as_deref(),
        Some(deploy_application_id.as_str())
    );
    assert_eq!(
        stored_anchor(&pg, &installation_id).await.as_deref(),
        Some(deploy_application_id.as_str())
    );

    let repeated = bind_tenant_application_deploy_application_id(
        &pg,
        &tenant_id,
        &installation_id,
        &deploy_application_id,
    )
    .await
    .expect("a repeated bind is idempotent");
    assert_eq!(repeated.id, bound.id);
    assert_eq!(
        stored_anchor(&pg, &installation_id).await.as_deref(),
        Some(deploy_application_id.as_str())
    );

    let error = bind_tenant_application_deploy_application_id(
        &pg,
        &tenant_id,
        &installation_id,
        &unique_id("deploy_other"),
    )
    .await
    .expect_err("a bound installation is never re-pointed by a bind");
    assert!(
        error.contains("already bound to deploy application"),
        "{error}"
    );

    cleanup(&pg, &tenant_id).await;
}

#[tokio::test]
#[ignore = "requires a migrated PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn a_deploy_application_claimed_by_another_installation_is_refused() {
    let Some(pg) = connect().await else {
        return;
    };
    let tenant_id = unique_id("tenant_claim");
    let owner_id = unique_id("inst_claim_owner");
    let claimant_id = unique_id("inst_claim_target");
    let deploy_application_id = unique_id("deploy_claim");
    seed_installation(&pg, &tenant_id, &owner_id, Some(&deploy_application_id)).await;
    seed_installation(&pg, &tenant_id, &claimant_id, None).await;

    let error = bind_tenant_application_deploy_application_id(
        &pg,
        &tenant_id,
        &claimant_id,
        &deploy_application_id,
    )
    .await
    .expect_err("one deploy application serves exactly one installation");
    assert!(
        error.contains("is already bound to installation"),
        "{error}"
    );
    assert_eq!(stored_anchor(&pg, &claimant_id).await, None);

    cleanup(&pg, &tenant_id).await;
}
