//! Component-token cache against a real PostgreSQL instance.
//!
//! The unit tests prove the policy; this file proves the SQL and the
//! cross-replica single-flight contract:
//!
//! * a stored token round-trips and expired rows are never returned,
//! * remove returns the token exactly once,
//! * two concurrent misses produce exactly one provider call.
//!
//! Run with a migrated database:
//!
//! ```text
//! SDKWORK_DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/db \
//!   cargo test -p sdkwork-iam-web-adapter --test wechat_component_token_postgres -- --ignored
//! ```
//!
//! Every test skips (returns) when `SDKWORK_DATABASE_URL` is unset or the IAM
//! baseline is not applied, so the suite reports the reason instead of failing.
use async_trait::async_trait;
use sdkwork_iam_web_adapter::{
    now_epoch_seconds, CachedComponentToken, ComponentTokenCache, PgComponentTokenCache,
    WechatComponentApi, WechatComponentApiError, WechatComponentTokenService,
    WechatComponentTransport,
};
use serde_json::Value;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Duration;

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
    let present: bool =
        sqlx::query_scalar("SELECT to_regclass('iam_ephemeral_artifact') IS NOT NULL")
            .fetch_one(&pool)
            .await
            .ok()?;
    if !present {
        eprintln!("skipping: iam_ephemeral_artifact has not been created");
        return None;
    }
    Some(pool)
}

fn unique_component_app_id() -> String {
    format!("wxcomponentit{}", uuid::Uuid::now_v7().simple())
}

async fn delete_key(pool: &PgPool, key: &str) {
    let _ = sqlx::query("DELETE FROM iam_ephemeral_artifact WHERE artifact_key = $1")
        .bind(key)
        .execute(pool)
        .await;
}

#[tokio::test]
#[ignore = "requires a migrated PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn stores_loads_and_removes_component_tokens() {
    let Some(pool) = connect().await else {
        return;
    };
    let cache = PgComponentTokenCache::new(pool.clone());
    let key = format!(
        "wechat_component_token:it_{}",
        uuid::Uuid::now_v7().simple()
    );
    let expires_at = now_epoch_seconds() + 3_600;

    cache
        .put(
            &key,
            CachedComponentToken {
                access_token: "token-a".to_string(),
                expires_at,
            },
        )
        .await
        .expect("store token");
    let loaded = cache.get(&key).await.expect("load token").expect("token");
    assert_eq!(loaded.access_token, "token-a");
    assert!((loaded.expires_at - expires_at).abs() <= 1);

    let removed = cache
        .remove(&key)
        .await
        .expect("remove token")
        .expect("token");
    assert_eq!(removed.access_token, "token-a");
    assert!(cache.get(&key).await.expect("load removed").is_none());
    delete_key(&pool, &key).await;
}

#[tokio::test]
#[ignore = "requires a migrated PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn never_returns_an_expired_token() {
    let Some(pool) = connect().await else {
        return;
    };
    let cache = PgComponentTokenCache::new(pool.clone());
    let key = format!(
        "wechat_component_token:it_{}",
        uuid::Uuid::now_v7().simple()
    );
    cache
        .put(
            &key,
            CachedComponentToken {
                access_token: "expired".to_string(),
                expires_at: now_epoch_seconds() - 10,
            },
        )
        .await
        .expect("store token");
    assert!(cache.get(&key).await.expect("load token").is_none());
    delete_key(&pool, &key).await;
}

struct CountingTransport {
    calls: Arc<AtomicUsize>,
}

#[async_trait]
impl WechatComponentTransport for CountingTransport {
    async fn post_json(
        &self,
        _url: &str,
        _body: &Value,
    ) -> Result<String, WechatComponentApiError> {
        self.calls.fetch_add(1, Ordering::SeqCst);
        tokio::time::sleep(Duration::from_millis(150)).await;
        Ok(r#"{"component_access_token":"shared-token","expires_in":7200}"#.to_string())
    }
}

type TestService = WechatComponentTokenService<PgComponentTokenCache, CountingTransport>;

fn service(pool: &PgPool, calls: Arc<AtomicUsize>) -> TestService {
    WechatComponentTokenService::new(
        PgComponentTokenCache::new(pool.clone()),
        WechatComponentApi::with_base_url(CountingTransport { calls }, "http://127.0.0.1:9"),
    )
}

#[tokio::test]
#[ignore = "requires a migrated PostgreSQL (SDKWORK_DATABASE_URL)"]
async fn concurrent_misses_make_one_provider_call() {
    let Some(pool) = connect().await else {
        return;
    };
    let calls = Arc::new(AtomicUsize::new(0));
    let app_id = unique_component_app_id();
    let now = now_epoch_seconds();
    let first = service(&pool, calls.clone());
    let second = service(&pool, calls.clone());

    let (left, right) = tokio::join!(
        first.resolve_single_flight(&app_id, "secret", "ticket", now),
        second.resolve_single_flight(&app_id, "secret", "ticket", now),
    );
    let left = left.expect("first resolve");
    let right = right.expect("second resolve");
    assert_eq!(left.access_token, "shared-token");
    assert_eq!(right.access_token, "shared-token");
    assert_eq!(
        calls.load(Ordering::SeqCst),
        1,
        "advisory lock must collapse the concurrent refresh"
    );

    let key = sdkwork_iam_web_adapter::component_token_cache_key(&app_id, "secret");
    delete_key(&pool, &key).await;
}
