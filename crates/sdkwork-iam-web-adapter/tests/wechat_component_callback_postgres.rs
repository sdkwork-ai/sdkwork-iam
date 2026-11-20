//! Callback configuration reader against a real PostgreSQL instance.
//!
//! Proves the opaque callback id resolves to the component AppID and the two
//! decrypted secrets the signature and AES layers need, and that an unknown id
//! resolves to `None` instead of an error.
//!
//! Run with a database that has migration 0046 applied:
//!
//! ```text
//! SDKWORK_DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/db \
//!   cargo test -p sdkwork-iam-web-adapter --test wechat_component_callback_postgres -- --ignored
//! ```
use chrono::Utc;
use sdkwork_iam_bootstrap::{encode_signing_secret_ref, hash_secret_ref};
use sdkwork_iam_web_adapter::{ComponentCallbackConfigReader, PgComponentCallbackConfigReader};
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
    let migrated: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM information_schema.columns \
         WHERE table_schema = current_schema() \
           AND table_name = 'iam_oauth_operator_platform' \
           AND column_name = 'callback_public_id'",
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

#[tokio::test]
#[ignore = "requires PostgreSQL with migration 0046 (SDKWORK_DATABASE_URL)"]
async fn resolves_callback_config_and_decrypts_secrets() {
    let Some(pool) = connect().await else {
        return;
    };
    let suffix = uuid::Uuid::now_v7().simple().to_string();
    let platform_id = format!("itcbplatform{suffix}");
    let tenant_id = format!("itcbtenant{suffix}");
    let component_appid = format!("wxcb{suffix}");
    let callback_public_id = format!("wxc{suffix}");
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO iam_oauth_operator_platform \
            (id, uuid, tenant_id, integration_id, provider_code, platform_code, display_name, \
             operator_mode, provider_platform_id, component_appid, platform_type, \
             callback_public_id, authorization_status, webhook_verify_status, \
             ticket_secret_status, token_secret_status, status, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, 'wechat', $1, 'Callback IT platform', \
                 'platform_component', $5, $5, 'platform', $6, 'pending_authorization', \
                 'unknown', 'missing', 'missing', 'active', $7, $7)",
    )
    .bind(&platform_id)
    .bind(uuid::Uuid::now_v7().to_string())
    .bind(&tenant_id)
    .bind(format!("itcbintegration{suffix}"))
    .bind(&component_appid)
    .bind(&callback_public_id)
    .bind(&now)
    .execute(&pool)
    .await
    .expect("seed platform");
    for (kind, value) in [
        ("component_callback_token", "callback-token-it"),
        (
            "encoding_aes_key",
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        ),
    ] {
        let secret_ref = encode_signing_secret_ref(value.as_bytes());
        let secret_hash = hash_secret_ref(&secret_ref);
        sqlx::query(
            "INSERT INTO iam_oauth_secret \
                (id, uuid, tenant_id, secret_owner_kind, secret_owner_id, operator_platform_id, \
                 secret_kind, secret_ref, secret_hash, active_from, status, created_at, updated_at) \
             VALUES ($1, $2, $3, 'operator_platform', $4, $4, $5, $6, $7, $8, 'active', $8, $8)",
        )
        .bind(format!("iamos-{}", uuid::Uuid::now_v7()))
        .bind(uuid::Uuid::now_v7().to_string())
        .bind(&tenant_id)
        .bind(&platform_id)
        .bind(kind)
        .bind(&secret_ref)
        .bind(&secret_hash)
        .bind(&now)
        .execute(&pool)
        .await
        .expect("seed secret");
    }

    let reader = PgComponentCallbackConfigReader::new(pool.clone());
    let config = reader
        .load(&callback_public_id)
        .await
        .expect("load")
        .expect("configured callback");
    assert_eq!(config.platform_id, platform_id);
    assert_eq!(config.tenant_id, tenant_id);
    assert_eq!(config.component_app_id, component_appid);
    assert_eq!(config.callback_token, "callback-token-it");
    assert_eq!(
        config.encoding_aes_key,
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    );

    assert!(reader.load("wxcunknown").await.expect("load").is_none());

    let _ = sqlx::query("DELETE FROM iam_oauth_secret WHERE operator_platform_id = $1")
        .bind(&platform_id)
        .execute(&pool)
        .await;
    let _ = sqlx::query("DELETE FROM iam_oauth_operator_platform WHERE id = $1")
        .bind(&platform_id)
        .execute(&pool)
        .await;
}
