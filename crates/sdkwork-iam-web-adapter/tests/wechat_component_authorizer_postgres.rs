//! Authorizer access-token resolution against a real PostgreSQL instance.
//!
//! Proves the two-hour token path: the first resolution refreshes with the stored
//! refresh token and caches the result; the second resolution returns the cached
//! token without another provider call; and the rotated refresh token replaces
//! the stored one.
//!
//! Run with a database that has migration 0046 applied:
//!
//! ```text
//! SDKWORK_DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/db \
//!   cargo test -p sdkwork-iam-web-adapter --test wechat_component_authorizer_postgres -- --ignored
//! ```
use async_trait::async_trait;
use chrono::Utc;
use sdkwork_iam_bootstrap::{
    decode_signing_secret_ref, encode_signing_secret_ref, hash_secret_ref,
};
use sdkwork_iam_web_adapter::{
    component_token_cache_key, now_epoch_seconds, PgAuthorizerTokenService, PgComponentTokenCache,
    WechatComponentApi, WechatComponentApiError, WechatComponentTokenService,
    WechatComponentTransport,
};
use serde_json::Value;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::collections::VecDeque;
use std::sync::atomic::{AtomicUsize, Ordering};
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

struct Seed {
    platform_id: String,
    component_appid: String,
    app_secret: String,
    resource_account_id: String,
    authorization_id: String,
}

async fn seed(pool: &PgPool) -> Seed {
    let suffix = uuid::Uuid::now_v7().simple().to_string();
    let platform_id = format!("itauthztoken{suffix}");
    let tenant_id = format!("itauthztenant{suffix}");
    let integration_id = format!("itauthzintegration{suffix}");
    let component_appid = format!("wxauthzit{suffix}");
    let app_secret = format!("authzsecret{suffix}");
    let resource_account_id = format!("itresource{suffix}");
    let authorization_id = format!("itauthorization{suffix}");
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO iam_oauth_operator_platform \
            (id, uuid, tenant_id, integration_id, provider_code, platform_code, display_name, \
             operator_mode, provider_platform_id, component_appid, platform_type, \
             authorization_status, webhook_verify_status, ticket_secret_status, \
             token_secret_status, status, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, 'wechat', $1, 'Authorizer IT platform', \
                 'platform_component', $5, $5, 'platform', 'pending_authorization', \
                 'unknown', 'missing', 'missing', 'active', $6, $6)",
    )
    .bind(&platform_id)
    .bind(uuid::Uuid::now_v7().to_string())
    .bind(&tenant_id)
    .bind(&integration_id)
    .bind(&component_appid)
    .bind(&now)
    .execute(pool)
    .await
    .expect("seed operator platform");
    seed_secret(
        pool,
        &platform_id,
        &tenant_id,
        "component_app_secret",
        &app_secret,
    )
    .await;
    seed_secret(
        pool,
        &platform_id,
        &tenant_id,
        "component_verify_ticket",
        "ticket-it",
    )
    .await;

    sqlx::query(
        "INSERT INTO iam_oauth_resource_account \
            (id, uuid, tenant_id, organization_id, integration_id, operator_platform_id, \
             provider_code, resource_account_code, resource_account_kind, access_mode, \
             display_name, provider_account_id, verification_status, authorization_status, \
             capability_json, self_managed_config_status, operator_authorization_status, \
             webhook_verify_status, domain_verify_status, enabled, status, created_at, updated_at) \
         VALUES ($1, $2, $3, '0', $4, $5, 'wechat', $1, 'mini_program', \
                 'operator_authorized_account', 'IT Mini Program', 'wxauthorizedit', \
                 'unknown', 'authorized', '[]', 'not_required', 'authorized', \
                 'unknown', 'unknown', 1, 'active', $6, $6)",
    )
    .bind(&resource_account_id)
    .bind(uuid::Uuid::now_v7().to_string())
    .bind(&tenant_id)
    .bind(&integration_id)
    .bind(&platform_id)
    .bind(&now)
    .execute(pool)
    .await
    .expect("seed resource account");

    let refresh_ref = encode_signing_secret_ref(b"old-refresh-token");
    sqlx::query(
        "INSERT INTO iam_oauth_resource_authorization \
            (id, uuid, tenant_id, organization_id, integration_id, resource_account_id, \
             operator_platform_id, provider_code, authorization_mode, \
             authorizer_access_token_hash, authorizer_refresh_token_secret_ref, \
             authorized_scopes_json, func_info_json, authorization_info_json, authorizer_appid, \
             authorization_source, authorized_at, expires_at, last_refreshed_at, next_refresh_at, \
             status, created_at, updated_at) \
         VALUES ($1, $2, $3, '0', $4, $5, $6, 'wechat', 'operator_authorization_code', \
                 'stale-hash', $7, '[18]', '[18]', '{}', 'wxauthorizedit', \
                 'operator_authorization_code', $8, $8, $8, $8, 'active', $8, $8)",
    )
    .bind(&authorization_id)
    .bind(uuid::Uuid::now_v7().to_string())
    .bind(&tenant_id)
    .bind(&integration_id)
    .bind(&resource_account_id)
    .bind(&platform_id)
    .bind(&refresh_ref)
    .bind(&now)
    .execute(pool)
    .await
    .expect("seed resource authorization");

    Seed {
        platform_id,
        component_appid,
        app_secret,
        resource_account_id,
        authorization_id,
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

async fn cleanup(pool: &PgPool, seed: &Seed) {
    let keys = [
        format!(
            "__local__:wechat_authorizer_token:{}",
            seed.authorization_id
        ),
        component_token_cache_key(&seed.component_appid, &seed.app_secret),
    ];
    for key in keys {
        let _ = sqlx::query("DELETE FROM iam_ephemeral_artifact WHERE artifact_key = $1")
            .bind(key)
            .execute(pool)
            .await;
    }
    let _ = sqlx::query("DELETE FROM iam_oauth_resource_authorization WHERE id = $1")
        .bind(&seed.authorization_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM iam_oauth_resource_account WHERE id = $1")
        .bind(&seed.resource_account_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM iam_oauth_secret WHERE operator_platform_id = $1")
        .bind(&seed.platform_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM iam_oauth_operator_platform WHERE id = $1")
        .bind(&seed.platform_id)
        .execute(pool)
        .await;
}

#[derive(Clone)]
struct CountingQueue {
    calls: Arc<AtomicUsize>,
    responses: Arc<Mutex<VecDeque<String>>>,
}

#[async_trait]
impl WechatComponentTransport for CountingQueue {
    async fn post_json(
        &self,
        _url: &str,
        _body: &Value,
    ) -> Result<String, WechatComponentApiError> {
        self.calls.fetch_add(1, Ordering::SeqCst);
        self.responses
            .lock()
            .expect("responses")
            .pop_front()
            .ok_or_else(|| WechatComponentApiError::Transport("no queued response".to_string()))
    }
}

#[tokio::test]
#[ignore = "requires PostgreSQL with migration 0046 (SDKWORK_DATABASE_URL)"]
async fn refreshes_once_then_serves_the_cached_token() {
    let Some(pool) = connect().await else {
        return;
    };
    let seed = seed(&pool).await;
    let calls = Arc::new(AtomicUsize::new(0));
    let transport = CountingQueue {
        calls: calls.clone(),
        responses: Arc::new(Mutex::new(VecDeque::from([
            r#"{"component_access_token":"component-token","expires_in":7200}"#.to_string(),
            r#"{"authorizer_access_token":"fresh-access-token","expires_in":7200,"authorizer_refresh_token":"new-refresh-token"}"#.to_string(),
        ]))),
    };
    let token_api = WechatComponentApi::with_base_url(transport.clone(), "http://127.0.0.1:9");
    let api = WechatComponentApi::with_base_url(transport, "http://127.0.0.1:9");
    let tokens =
        WechatComponentTokenService::new(PgComponentTokenCache::new(pool.clone()), token_api);
    let service = PgAuthorizerTokenService::new(pool.clone(), tokens, api);
    let now = now_epoch_seconds();

    let first = service
        .resolve(&seed.authorization_id, now)
        .await
        .expect("first resolution");
    assert_eq!(first.access_token, "fresh-access-token");
    assert_eq!(first.authorizer_app_id, "wxauthorizedit");
    assert_eq!(calls.load(Ordering::SeqCst), 2);

    let second = service
        .resolve(&seed.authorization_id, now + 10)
        .await
        .expect("cached resolution");
    assert_eq!(second.access_token, "fresh-access-token");
    assert_eq!(
        calls.load(Ordering::SeqCst),
        2,
        "the cached token must not trigger another provider call"
    );

    let stored_ref: String = sqlx::query_scalar(
        "SELECT authorizer_refresh_token_secret_ref FROM iam_oauth_resource_authorization \
         WHERE id = $1",
    )
    .bind(&seed.authorization_id)
    .fetch_one(&pool)
    .await
    .expect("read refresh ref");
    let rotated = decode_signing_secret_ref(&stored_ref).expect("decode refresh ref");
    assert_eq!(rotated, b"new-refresh-token");

    let status: String =
        sqlx::query_scalar("SELECT status FROM iam_oauth_resource_authorization WHERE id = $1")
            .bind(&seed.authorization_id)
            .fetch_one(&pool)
            .await
            .expect("read status");
    assert_eq!(status, "active");

    cleanup(&pool, &seed).await;
}
