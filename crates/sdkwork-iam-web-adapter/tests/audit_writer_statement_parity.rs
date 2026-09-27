//! Regression guard: IAM's audit writers must agree on one `iam_audit_event` statement.
//!
//! `sqlx` caches a prepared statement **per connection, keyed by the SQL text alone**
//! (`PgConnection::get_or_prepare`), sends every parameter with
//! `PgValueFormat::Binary`, and derives each placeholder's server-side type from the
//! `Parse` message it builds out of the bound Rust types (`PgArguments::add` →
//! `Encode::produces` → `prepare`). Two writers that share one SQL text but bind
//! `created_at` with different Rust types therefore break each other on any connection
//! both of them touch: the second writer gets `incorrect binary data format in bind
//! parameter 13` (`22P03`), or, in the opposite order, `invalid byte sequence for
//! encoding "UTF8"` (`22021`). Audit writes are best-effort, so those failures silently
//! dropped audit events instead of failing the request that produced them.
//!
//! That is exactly what happened while the App API kept a private copy of this INSERT
//! binding `chrono::DateTime<Utc>` (a `timestamptz` parameter) while the shared adapter
//! bound an RFC 3339 `String` (a `text` parameter). The writers below run in sequence on
//! a **single-connection** pool, which is the shape a real gateway process has: one
//! pool, both `/app/v3/api` and `/backend/v3/api` traffic, one statement cache per
//! connection.
//!
//! Runs against the workspace PostgreSQL profile; skipped when `SDKWORK_DATABASE_*` is
//! not configured, like the other IAM PostgreSQL integration suites.

use serde_json::json;
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::PgPool;
use std::str::FromStr;
use std::time::{SystemTime, UNIX_EPOCH};

use sdkwork_iam_web_adapter::{record_audit_event, record_audit_event_tx, record_security_event};

/// Connection options for the workspace profile, with `search_path` pinned explicitly so
/// the pool resolves the IAM tables regardless of the server's default schema.
fn connect_options() -> Option<PgConnectOptions> {
    let host = std::env::var("SDKWORK_DATABASE_HOST").ok()?;
    let port = std::env::var("SDKWORK_DATABASE_PORT").unwrap_or_else(|_| "5432".to_owned());
    let name = std::env::var("SDKWORK_DATABASE_NAME").ok()?;
    let user = std::env::var("SDKWORK_DATABASE_USERNAME").ok()?;
    let password = std::env::var("SDKWORK_DATABASE_PASSWORD").ok()?;
    let schema = std::env::var("SDKWORK_DATABASE_SCHEMA").unwrap_or_else(|_| "public".to_owned());
    let url = format!("postgresql://{user}:{password}@{host}:{port}/{name}");
    let options = PgConnectOptions::from_str(&url).ok()?;
    Some(options.options([("search_path", schema.as_str())]))
}

/// A pool with exactly one connection, so every writer below reuses the same
/// per-connection statement cache.
async fn single_connection_pool() -> Option<PgPool> {
    let options = connect_options()?;
    PgPoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await
        .ok()
}

fn unique_tenant(label: &str) -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_nanos())
        .unwrap_or_default();
    format!("parity-{label}-{}-{nanos}", std::process::id())
}

#[tokio::test]
async fn audit_writers_share_one_connection_without_statement_collisions() {
    let Some(pool) = single_connection_pool().await else {
        eprintln!(
            "SKIP audit_writers_share_one_connection_without_statement_collisions: \
             SDKWORK_DATABASE_* is not configured"
        );
        return;
    };

    let audit_tenant = unique_tenant("audit");
    let span_tenant = unique_tenant("span");

    let audit = record_audit_event(
        &pool,
        &audit_tenant,
        None,
        Some("parity-user"),
        "provider_account.create",
        "iam_provider_account",
        Some("parity-resource"),
        Some("parity-request"),
        "prod",
        json!({ "probe": "audit" }),
    )
    .await;
    assert!(audit.is_ok(), "shared audit writer failed: {audit:?}");

    // The transactional writer runs the same statement text through a different
    // function, so it must not disagree with the writer above about `created_at`.
    let mut connection = pool.acquire().await.expect("acquire the single connection");
    let transactional = record_audit_event_tx(
        &mut *connection,
        &audit_tenant,
        None,
        Some("parity-user"),
        "provider_account.update",
        "iam_provider_account",
        Some("parity-resource"),
        Some("parity-request"),
        "prod",
        json!({ "probe": "audit-tx" }),
    )
    .await;
    drop(connection);
    assert!(
        transactional.is_ok(),
        "transactional audit writer failed: {transactional:?}"
    );

    let security = record_security_event(
        &pool,
        &span_tenant,
        None,
        Some("parity-user"),
        "provider_account.create",
        "info",
        "prod",
        json!({ "probe": "security" }),
    )
    .await;
    assert!(
        security.is_ok(),
        "shared security-event writer failed: {security:?}"
    );

    // Both audit writers must have persisted a row, and every `created_at` must carry
    // the canonical RFC 3339 text form. The assignment-cast form PostgreSQL produces
    // for a `timestamptz` parameter (`2026-09-24 14:57:26.00401+00`) must not reappear.
    let timestamps: Vec<String> = sqlx::query_scalar(
        "SELECT created_at FROM iam_audit_event WHERE tenant_id = $1 ORDER BY created_at",
    )
    .bind(&audit_tenant)
    .fetch_all(&pool)
    .await
    .expect("read back audit timestamps");
    assert_eq!(
        timestamps.len(),
        2,
        "both audit writers must persist a row, saw {timestamps:?}"
    );
    for created_at in &timestamps {
        assert!(
            created_at.contains('T') && created_at.ends_with("+00:00"),
            "audit created_at must be RFC 3339 UTC text, got {created_at:?}"
        );
    }

    sqlx::query("DELETE FROM iam_audit_event WHERE tenant_id = $1")
        .bind(&audit_tenant)
        .execute(&pool)
        .await
        .expect("clean up audit parity rows");
    sqlx::query("DELETE FROM iam_security_event WHERE tenant_id = $1")
        .bind(&span_tenant)
        .execute(&pool)
        .await
        .expect("clean up security-event parity rows");
}
