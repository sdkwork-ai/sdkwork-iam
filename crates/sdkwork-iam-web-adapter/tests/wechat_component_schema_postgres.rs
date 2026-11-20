//! Schema proof for migration 0046, executed against a real PostgreSQL instance.
//!
//! The migration is applied inside one transaction and rolled back, so the
//! shared development database is never left modified: PostgreSQL DDL is
//! transactional. Running it twice inside the transaction proves the file is
//! re-runnable, which is the property the migration ledger relies on when a
//! partially applied deployment is retried.
//!
//! Run with a migrated database:
//!
//! ```text
//! SDKWORK_DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/db \
//!   cargo test -p sdkwork-iam-web-adapter --test wechat_component_schema_postgres -- --ignored
//! ```
use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Row};
use std::collections::HashSet;

const MIGRATION_SQL: &str = include_str!(
    "../../../database/migrations/postgres/0046_wechat_component_operator_platform.up.sql"
);

fn database_url() -> Option<String> {
    std::env::var("SDKWORK_DATABASE_URL")
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

async fn connect() -> Option<PgPool> {
    let url = database_url()?;
    let schema = std::env::var("SDKWORK_DATABASE_SCHEMA")
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty());
    let mut options = PgPoolOptions::new().max_connections(2);
    if let Some(schema) = schema {
        options = options.after_connect(move |connection, _meta| {
            let schema = schema.clone();
            Box::pin(async move {
                sqlx::query("SELECT set_config('search_path', $1, false)")
                    .bind(&schema)
                    .execute(&mut *connection)
                    .await?;
                Ok(())
            })
        });
    }
    let pool = options.connect(&url).await.ok()?;
    let present: bool =
        sqlx::query_scalar("SELECT to_regclass('iam_oauth_operator_platform') IS NOT NULL")
            .fetch_one(&pool)
            .await
            .ok()?;
    if !present {
        eprintln!("skipping: the IAM baseline has not been applied");
        return None;
    }
    Some(pool)
}

async fn columns_of(connection: &mut sqlx::PgConnection, table: &str) -> HashSet<String> {
    sqlx::query(
        "SELECT column_name FROM information_schema.columns \
         WHERE table_schema = current_schema() AND table_name = $1",
    )
    .bind(table)
    .fetch_all(connection)
    .await
    .expect("read columns")
    .into_iter()
    .map(|row| row.get::<String, _>("column_name"))
    .collect()
}

async fn indexes_of(connection: &mut sqlx::PgConnection, table: &str) -> HashSet<String> {
    sqlx::query(
        "SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() AND tablename = $1",
    )
    .bind(table)
    .fetch_all(connection)
    .await
    .expect("read indexes")
    .into_iter()
    .map(|row| row.get::<String, _>("indexname"))
    .collect()
}

#[tokio::test]
#[ignore = "requires a migrated PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn migration_adds_component_state_and_is_rerunnable() {
    let Some(pool) = connect().await else {
        return;
    };
    let mut transaction = pool.begin().await.expect("begin transaction");
    sqlx::raw_sql(MIGRATION_SQL)
        .execute(&mut *transaction)
        .await
        .expect("apply migration 0046");
    sqlx::raw_sql(MIGRATION_SQL)
        .execute(&mut *transaction)
        .await
        .expect("migration 0046 must be re-runnable");

    let platform_columns = columns_of(&mut transaction, "iam_oauth_operator_platform").await;
    for column in [
        "platform_type",
        "component_appid",
        "callback_public_id",
        "ticket_status",
        "ticket_create_time",
        "ticket_received_at",
        "ticket_expires_at",
        "component_token_expires_at",
        "full_release_status",
        "approved_permission_sets_json",
    ] {
        assert!(
            platform_columns.contains(column),
            "iam_oauth_operator_platform is missing {column}"
        );
    }

    let platform_indexes = indexes_of(&mut transaction, "iam_oauth_operator_platform").await;
    for index in [
        "uk_iam_oauth_operator_platform_callback",
        "uk_iam_oauth_operator_platform_component",
        "idx_iam_oauth_operator_platform_enabled",
        "idx_iam_oauth_operator_platform_authorization",
    ] {
        assert!(
            platform_indexes.contains(index),
            "iam_oauth_operator_platform is missing index {index}"
        );
    }

    let authorization_columns =
        columns_of(&mut transaction, "iam_oauth_resource_authorization").await;
    for column in ["authorizer_appid", "func_info_json", "authorization_source"] {
        assert!(
            authorization_columns.contains(column),
            "iam_oauth_resource_authorization is missing {column}"
        );
    }

    let callback_ledger =
        to_regclass_exists(&mut transaction, "iam_oauth_channel_callback_event").await;
    assert!(callback_ledger, "callback ledger table is missing");
    let inbox = to_regclass_exists(&mut transaction, "iam_oauth_authorizer_inbox").await;
    assert!(inbox, "authorizer inbox table is missing");

    let ledger_indexes = indexes_of(&mut transaction, "iam_oauth_channel_callback_event").await;
    assert!(
        ledger_indexes.contains("uk_iam_oauth_channel_callback_event_dedupe"),
        "callback ledger must dedupe on (callback_public_id, dedupe_key)"
    );

    if std::env::var("SDKWORK_APPLY_WECHAT_COMPONENT_MIGRATION").as_deref() == Ok("1") {
        transaction.commit().await.expect("commit migration");
        eprintln!("applied migration 0046 to the configured schema");
    } else {
        transaction.rollback().await.expect("roll back migration");
    }
}

async fn to_regclass_exists(connection: &mut sqlx::PgConnection, table: &str) -> bool {
    sqlx::query_scalar("SELECT to_regclass($1) IS NOT NULL")
        .bind(table)
        .fetch_one(connection)
        .await
        .expect("read regclass")
}
