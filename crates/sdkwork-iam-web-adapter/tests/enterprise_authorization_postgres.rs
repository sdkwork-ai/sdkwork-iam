//! Enterprise order/seat authorization against PostgreSQL query semantics.
//!
//! Run with `SDKWORK_DATABASE_URL=... cargo test -p sdkwork-iam-web-adapter \
//! --test enterprise_authorization_postgres -- --ignored`.

use sdkwork_iam_web_adapter::ensure_user_enterprise_authorization;
use sqlx::{postgres::PgPoolOptions, PgPool};

async fn connect() -> Option<PgPool> {
    let url = std::env::var("SDKWORK_DATABASE_URL").ok()?;
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(url.trim())
        .await
        .ok()?;
    sqlx::query(
        "CREATE TEMP TABLE iam_tenant_application ( \
           tenant_id TEXT NOT NULL, deploy_application_id TEXT, deleted_at TIMESTAMPTZ)",
    )
    .execute(&pool)
    .await
    .expect("create temporary installations");
    sqlx::query(
        "CREATE TEMP TABLE iam_application_enterprise_order ( \
           id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, \
           enterprise_tenant_id TEXT NOT NULL, enterprise_organization_id TEXT NOT NULL, \
           authorization_mode TEXT NOT NULL, order_status TEXT NOT NULL, \
           expires_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ)",
    )
    .execute(&pool)
    .await
    .expect("create temporary orders");
    sqlx::query(
        "CREATE TEMP TABLE iam_application_enterprise_seat ( \
           tenant_id TEXT NOT NULL, order_id TEXT NOT NULL, user_id TEXT NOT NULL, \
           organization_id TEXT NOT NULL, seat_status TEXT NOT NULL)",
    )
    .execute(&pool)
    .await
    .expect("create temporary seats");
    // This focused authorization fixture replaces the migration-owned reconcile
    // function; lifecycle/trigger behavior is covered by migration integration tests.
    sqlx::query(
        "CREATE FUNCTION iam_reconcile_enterprise_seats(TEXT, TEXT, BOOLEAN, TEXT) \
         RETURNS VOID LANGUAGE sql AS 'SELECT NULL::void'",
    )
    .execute(&pool)
    .await
    .expect("create temporary reconcile function");
    Some(pool)
}

async fn seed_order(
    pg: &PgPool,
    id: &str,
    mode: &str,
    status: &str,
    organization_id: &str,
    expires_at: Option<&str>,
) {
    sqlx::query(
        "INSERT INTO iam_application_enterprise_order \
         VALUES ($1, 'publisher', 'deploy_app', 'enterprise', $2, $3, $4, $5::TIMESTAMPTZ, NULL)",
    )
    .bind(id)
    .bind(organization_id)
    .bind(mode)
    .bind(status)
    .bind(expires_at)
    .execute(pg)
    .await
    .expect("insert order");
}

async fn seed_seat(pg: &PgPool, order_id: &str, user_id: &str, organization_id: &str) {
    sqlx::query(
        "INSERT INTO iam_application_enterprise_seat VALUES ('enterprise', $1, $2, $3, 'active')",
    )
    .bind(order_id)
    .bind(user_id)
    .bind(organization_id)
    .execute(pg)
    .await
    .expect("insert seat");
}

async fn assert_authorized(pg: &PgPool, user_id: &str, organization_id: &str, allowed: bool) {
    let result = ensure_user_enterprise_authorization(
        pg,
        "enterprise",
        organization_id,
        user_id,
        "deploy_app",
    )
    .await;
    assert_eq!(result.is_ok(), allowed, "user={user_id} result={result:?}");
}

#[tokio::test]
#[ignore = "requires PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn enterprise_authorization_enforces_orders_seats_scope_and_expiry() {
    let Some(pg) = connect().await else {
        eprintln!("skipping: SDKWORK_DATABASE_URL is not configured");
        return;
    };
    sqlx::query("INSERT INTO iam_tenant_application VALUES ('enterprise', 'deploy_app', NULL)")
        .execute(&pg)
        .await
        .expect("insert installation");

    assert_authorized(&pg, "alice", "0", true).await;

    seed_order(&pg, "pending", "seat", "pending_authorization", "0", None).await;
    assert_authorized(&pg, "alice", "0", false).await;

    seed_order(&pg, "active", "seat", "active", "0", None).await;
    assert_authorized(&pg, "alice", "0", false).await;
    seed_seat(&pg, "active", "alice", "0").await;
    assert_authorized(&pg, "alice", "0", true).await;
    assert_authorized(&pg, "bob", "0", false).await;

    seed_order(&pg, "all", "all_members", "active", "0", None).await;
    assert_authorized(&pg, "bob", "0", true).await;

    seed_order(
        &pg,
        "expired",
        "all_members",
        "active",
        "0",
        Some("2020-01-01T00:00:00Z"),
    )
    .await;
    sqlx::query("UPDATE iam_application_enterprise_order SET order_status = 'terminated' WHERE id = 'active'")
        .execute(&pg)
        .await
        .expect("terminate seat order");
    sqlx::query(
        "UPDATE iam_application_enterprise_order SET order_status = 'terminated' WHERE id = 'all'",
    )
    .execute(&pg)
    .await
    .expect("terminate all-members order");
    assert_authorized(&pg, "bob", "0", false).await;

    seed_order(&pg, "scoped", "all_members", "active", "4200", None).await;
    assert_authorized(&pg, "bob", "0", false).await;
    assert_authorized(&pg, "bob", "4200", true).await;
    assert_authorized(&pg, "bob", "4201", false).await;

    sqlx::query("UPDATE iam_application_enterprise_order SET expires_at = NOW() - INTERVAL '1 second' WHERE id = 'scoped'")
        .execute(&pg)
        .await
        .expect("expire scoped order");
    assert_authorized(&pg, "bob", "4200", false).await;
}

#[tokio::test]
#[ignore = "requires PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn enterprise_authorization_does_not_cross_tenants() {
    let Some(pg) = connect().await else {
        eprintln!("skipping: SDKWORK_DATABASE_URL is not configured");
        return;
    };
    sqlx::query("INSERT INTO iam_tenant_application VALUES ('enterprise', 'deploy_app', NULL)")
        .execute(&pg)
        .await
        .expect("insert installation");
    seed_order(&pg, "active", "all_members", "active", "0", None).await;
    assert_authorized(&pg, "alice", "0", true).await;
    assert!(
        ensure_user_enterprise_authorization(&pg, "other", "0", "alice", "deploy_app")
            .await
            .is_ok()
    );
    assert!(
        ensure_user_enterprise_authorization(&pg, "enterprise", "0", "alice", "other_app")
            .await
            .is_ok()
    );
}
