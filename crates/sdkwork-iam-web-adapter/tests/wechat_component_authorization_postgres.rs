//! Authorization-entry assembly against a real PostgreSQL instance.
//!
//! Proves the pieces a unit test cannot: the component AppSecret and ticket are
//! read from `iam_oauth_secret` and decrypted, the cached component token is
//! minted through the provider client, and the returned URL carries the
//! pre-authorization code with an encoded redirect URI.
//!
//! Run with a database that has migration 0046 applied:
//!
//! ```text
//! SDKWORK_DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/db \
//!   cargo test -p sdkwork-iam-web-adapter --test wechat_component_authorization_postgres -- --ignored
//! ```
use async_trait::async_trait;
use chrono::Utc;
use sdkwork_iam_bootstrap::{encode_signing_secret_ref, hash_secret_ref};
use sdkwork_iam_web_adapter::{
    begin_authorization, component_token_cache_key, now_epoch_seconds, AuthorizationEntryRequest,
    PgComponentPlatformConfigReader, PgComponentTokenCache, WechatComponentApi,
    WechatComponentApiError, WechatComponentAuthorizationScope,
    WechatComponentAuthorizationSurface, WechatComponentTokenService, WechatComponentTransport,
};
use serde_json::Value;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

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
    app_secret: String,
}

async fn seed_platform(pool: &PgPool) -> SeededPlatform {
    let suffix = uuid::Uuid::now_v7().simple().to_string();
    let id = format!("itauthplatform{suffix}");
    let tenant_id = format!("ittenant{suffix}");
    let component_appid = format!("wxcomponentit{suffix}");
    let app_secret = format!("appsecret{suffix}");
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO iam_oauth_operator_platform \
            (id, uuid, tenant_id, integration_id, provider_code, platform_code, display_name, \
             operator_mode, provider_platform_id, component_appid, platform_type, \
             authorization_status, webhook_verify_status, ticket_secret_status, \
             token_secret_status, status, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, 'wechat', $1, 'Authorization IT platform', \
                 'platform_component', $5, $5, 'platform', 'pending_authorization', \
                 'unknown', 'missing', 'missing', 'active', $6, $6)",
    )
    .bind(&id)
    .bind(uuid::Uuid::now_v7().to_string())
    .bind(&tenant_id)
    .bind(format!("itintegration{suffix}"))
    .bind(&component_appid)
    .bind(&now)
    .execute(pool)
    .await
    .expect("seed operator platform");
    seed_secret(pool, &id, &tenant_id, "component_app_secret", &app_secret).await;
    seed_secret(
        pool,
        &id,
        &tenant_id,
        "component_verify_ticket",
        "ticket-it",
    )
    .await;
    SeededPlatform {
        id,
        component_appid,
        app_secret,
    }
}

async fn seed_secret(pool: &PgPool, platform_id: &str, tenant_id: &str, kind: &str, value: &str) {
    let secret_ref = encode_signing_secret_ref(value.as_bytes());
    let secret_hash = hash_secret_ref(&secret_ref);
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO iam_oauth_secret \
            (id, uuid, tenant_id, secret_owner_kind, secret_owner_id, operator_platform_id, \
             secret_kind, secret_ref, secret_hash, active_from, status, created_at, updated_at) \
         VALUES ($1, $2, $3, 'operator_platform', $4, $4, $5, $6, $7, $8, 'active', $8, $8)",
    )
    .bind(format!("iamos-{}", uuid::Uuid::now_v7()))
    .bind(uuid::Uuid::now_v7().to_string())
    .bind(tenant_id)
    .bind(platform_id)
    .bind(kind)
    .bind(&secret_ref)
    .bind(&secret_hash)
    .bind(&now)
    .execute(pool)
    .await
    .expect("seed secret");
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
    let key = component_token_cache_key(&platform.component_appid, &platform.app_secret);
    let _ = sqlx::query("DELETE FROM iam_ephemeral_artifact WHERE artifact_key = $1")
        .bind(key)
        .execute(pool)
        .await;
}

#[derive(Clone)]
struct QueueTransport {
    responses: Arc<Mutex<VecDeque<String>>>,
}

#[async_trait]
impl WechatComponentTransport for QueueTransport {
    async fn post_json(&self, url: &str, _body: &Value) -> Result<String, WechatComponentApiError> {
        let mut responses = self.responses.lock().expect("responses");
        if !url.contains("api_component_token") && !url.contains("api_create_preauthcode") {
            return Err(WechatComponentApiError::Transport(format!(
                "unexpected url {url}"
            )));
        }
        responses
            .pop_front()
            .ok_or_else(|| WechatComponentApiError::Transport("no queued response".to_string()))
    }
}

#[tokio::test]
#[ignore = "requires PostgreSQL with migration 0046 (SDKWORK_DATABASE_URL)"]
async fn builds_authorization_entry_from_encrypted_platform_secrets() {
    let Some(pool) = connect().await else {
        return;
    };
    let platform = seed_platform(&pool).await;
    let transport = QueueTransport {
        responses: Arc::new(Mutex::new(VecDeque::from([
            r#"{"component_access_token":"component-token","expires_in":7200}"#.to_string(),
            r#"{"pre_auth_code":"pre-auth-it","expires_in":600}"#.to_string(),
        ]))),
    };
    let token_api = WechatComponentApi::with_base_url(transport.clone(), "http://127.0.0.1:9");
    let api = WechatComponentApi::with_base_url(transport, "http://127.0.0.1:9");
    let tokens =
        WechatComponentTokenService::new(PgComponentTokenCache::new(pool.clone()), token_api);
    let reader = PgComponentPlatformConfigReader::new(pool.clone());

    let entry = begin_authorization(
        &reader,
        &tokens,
        &api,
        &AuthorizationEntryRequest {
            platform_id: &platform.id,
            redirect_uri: "https://example.com/oauth/wechat/callback?source=admin",
            surface: WechatComponentAuthorizationSurface::PcScan,
            scope: WechatComponentAuthorizationScope::Both,
            now: now_epoch_seconds(),
        },
    )
    .await
    .expect("authorization entry");

    assert!(entry
        .url
        .starts_with("https://mp.weixin.qq.com/cgi-bin/componentloginpage"));
    assert!(entry.url.contains("pre_auth_code=pre-auth-it"));
    assert!(entry.url.contains("auth_type=3"));
    assert!(entry.url.contains(
        "redirect_uri=https%3A%2F%2Fexample.com%2Foauth%2Fwechat%2Fcallback%3Fsource%3Dadmin"
    ));
    assert_eq!(entry.pre_auth_code_expires_in, 600);

    cleanup(&pool, &platform).await;
}
