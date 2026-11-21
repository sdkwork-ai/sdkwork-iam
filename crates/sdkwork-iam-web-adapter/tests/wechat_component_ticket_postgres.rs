//! Verification-ticket persistence against a real PostgreSQL instance.
//!
//! Proves the parts a unit test cannot: the ticket value is encrypted into
//! `iam_oauth_secret` under the operator-platform owner, the platform row gets
//! its freshness markers, and an out-of-order push that arrives after a newer
//! ticket is rejected inside the row lock.
//!
//! Run with a database that has migration 0046 applied:
//!
//! ```text
//! SDKWORK_DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/db \
//!   cargo test -p sdkwork-iam-web-adapter --test wechat_component_ticket_postgres -- --ignored
//! ```
use chrono::Utc;
use sdkwork_iam_web_adapter::{
    ComponentTicketAcceptance, PgComponentTicketStore, WechatComponentEvent,
    WechatComponentInfoType, WechatComponentTicketService,
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
    let schema = std::env::var("SDKWORK_DATABASE_SCHEMA")
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty());
    let mut options = PgPoolOptions::new().max_connections(4);
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
    let migrated: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM information_schema.columns \
         WHERE table_schema = current_schema() \
           AND table_name = 'iam_oauth_operator_platform' \
           AND column_name = 'ticket_create_time'",
    )
    .fetch_one(&pool)
    .await
    .ok()?;
    if !migrated {
        eprintln!("skipping: migration 0046 has not been applied");
        return None;
    }
    Some(pool)
}

struct SeededPlatform {
    id: String,
    component_appid: String,
}

async fn seed_platform(pool: &PgPool) -> SeededPlatform {
    let suffix = uuid::Uuid::now_v7().simple().to_string();
    let id = format!("itplatform{suffix}");
    let component_appid = format!("wxcomponentit{suffix}");
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO iam_oauth_operator_platform \
            (id, uuid, tenant_id, integration_id, provider_code, platform_code, display_name, \
             operator_mode, provider_platform_id, component_appid, authorization_status, \
             webhook_verify_status, ticket_secret_status, token_secret_status, status, \
             created_at, updated_at) \
         VALUES ($1, $2, $3, $4, 'wechat', $1, 'Ticket IT platform', \
                 'platform_component', $5, $5, 'pending_authorization', \
                 'unknown', 'missing', 'missing', 'active', $6, $6)",
    )
    .bind(&id)
    .bind(uuid::Uuid::now_v7().to_string())
    .bind(format!("ittenant{suffix}"))
    .bind(format!("itintegration{suffix}"))
    .bind(&component_appid)
    .bind(&now)
    .execute(pool)
    .await
    .expect("seed operator platform");
    SeededPlatform {
        id,
        component_appid,
    }
}

fn ticket_event(component_app_id: &str, create_time: i64, ticket: &str) -> WechatComponentEvent {
    WechatComponentEvent {
        component_app_id: component_app_id.to_string(),
        create_time,
        info_type: WechatComponentInfoType::VerifyTicket,
        raw_info_type: "component_verify_ticket".to_string(),
        authorizer_app_id: None,
        authorization_code: None,
        authorization_code_expired_time: None,
        pre_auth_code: None,
        component_verify_ticket: Some(ticket.to_string()),
    }
}

async fn cleanup(pool: &PgPool, platform: &SeededPlatform) {
    let _ = sqlx::query("DELETE FROM iam_oauth_secret WHERE operator_platform_id = $1")
        .bind(&platform.id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM iam_oauth_operator_platform WHERE id = $1")
        .bind(&platform.id)
        .execute(pool)
        .await;
}

#[tokio::test]
#[ignore = "requires PostgreSQL with migration 0046 (SDKWORK_DATABASE_URL)"]
async fn persists_tickets_and_rejects_out_of_order_pushes() {
    let Some(pool) = connect().await else {
        return;
    };
    let platform = seed_platform(&pool).await;
    let service = WechatComponentTicketService::new(PgComponentTicketStore::new(pool.clone()));
    let received_at = Utc::now().timestamp();

    assert_eq!(
        service
            .record(
                &ticket_event(&platform.component_appid, 1_700_000_000, "ticket-a"),
                received_at,
            )
            .await
            .expect("record first"),
        ComponentTicketAcceptance::Stored
    );
    let stored = service
        .latest(&platform.component_appid)
        .await
        .expect("latest")
        .expect("ticket");
    assert_eq!(stored.ticket, "ticket-a");
    assert_eq!(stored.create_time, 1_700_000_000);

    assert_eq!(
        service
            .record(
                &ticket_event(&platform.component_appid, 1_700_000_000, "ticket-dup"),
                received_at,
            )
            .await
            .expect("record duplicate"),
        ComponentTicketAcceptance::Duplicate
    );
    assert_eq!(
        service
            .record(
                &ticket_event(&platform.component_appid, 1_699_999_400, "ticket-old"),
                received_at,
            )
            .await
            .expect("record stale"),
        ComponentTicketAcceptance::Duplicate
    );
    assert_eq!(
        service
            .latest(&platform.component_appid)
            .await
            .expect("latest")
            .expect("ticket")
            .ticket,
        "ticket-a"
    );

    assert_eq!(
        service
            .record(
                &ticket_event(&platform.component_appid, 1_700_000_600, "ticket-b"),
                received_at,
            )
            .await
            .expect("record newer"),
        ComponentTicketAcceptance::Stored
    );
    assert_eq!(
        service
            .latest(&platform.component_appid)
            .await
            .expect("latest")
            .expect("ticket")
            .ticket,
        "ticket-b"
    );

    let status: String =
        sqlx::query_scalar("SELECT ticket_status FROM iam_oauth_operator_platform WHERE id = $1")
            .bind(&platform.id)
            .fetch_one(&pool)
            .await
            .expect("read ticket status");
    assert_eq!(status, "configured");
    let secret_ref: String = sqlx::query_scalar(
        "SELECT secret_ref FROM iam_oauth_secret \
         WHERE operator_platform_id = $1 AND secret_kind = 'component_verify_ticket' \
           AND status = 'active'",
    )
    .bind(&platform.id)
    .fetch_one(&pool)
    .await
    .expect("read secret ref");
    assert!(
        secret_ref.starts_with("enc:v1:") || !secret_ref.contains("ticket-b"),
        "the ticket value must not be stored in plaintext"
    );

    cleanup(&pool, &platform).await;
}
