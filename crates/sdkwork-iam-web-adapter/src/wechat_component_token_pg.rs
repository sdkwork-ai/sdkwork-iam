//! PostgreSQL-backed component-token cache with cross-replica single flight.
//!
//! `iam_ephemeral_artifact` is the shared L2 store, so every replica sees the
//! same token. The hot path is a plain cache read. On a miss the caller enters a
//! transaction, takes `pg_advisory_xact_lock` for that cache key, re-reads the
//! token, and only then calls the provider. A second replica that lost the race
//! waits on the advisory lock, re-reads the freshly stored token, and returns it
//! without a second provider call.
//!
//! The transaction is deliberately held across the provider call: a component
//! token refresh is rare (roughly every 110 minutes per component), and the
//! alternative — a lock row plus heartbeat — adds failure modes without
//! improving correctness. The lock is released by commit, rollback, or a
//! dropped connection.
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde_json::Value;
use sha2::{Digest as Sha256Digest, Sha256};
use sqlx::postgres::PgRow;
use sqlx::types::Json;
use sqlx::{Executor, PgPool, Postgres, Row};

use crate::wechat_component_api::{
    component_token_is_usable, ComponentAccessToken, WechatComponentTransport,
};
use crate::wechat_component_token::{
    component_token_cache_key, component_token_cache_ttl_seconds, CachedComponentToken,
    ComponentTokenCache, WechatComponentTokenError, WechatComponentTokenService,
};

/// Tenant scope used for process-independent artifacts; matches the existing
/// WeChat token cache convention.
pub const COMPONENT_TOKEN_ARTIFACT_SCOPE: &str = "__local__";

/// Artifact kind for cached component tokens.
pub const COMPONENT_TOKEN_ARTIFACT_KIND: &str = "wechat_component_token";

/// Payload key inside `iam_ephemeral_artifact.payload_json`.
const PAYLOAD_TOKEN_FIELD: &str = "componentAccessToken";

/// The shared component-token cache.
pub struct PgComponentTokenCache {
    pool: PgPool,
}

impl PgComponentTokenCache {
    /// Builds the cache over the IAM database pool.
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// The underlying pool, used by the single-flight resolver.
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}

#[async_trait]
impl ComponentTokenCache for PgComponentTokenCache {
    async fn get(
        &self,
        key: &str,
    ) -> Result<Option<CachedComponentToken>, WechatComponentTokenError> {
        load_cached(&self.pool, key, Utc::now()).await
    }

    async fn put(
        &self,
        key: &str,
        token: CachedComponentToken,
    ) -> Result<(), WechatComponentTokenError> {
        let expires_at = DateTime::<Utc>::from_timestamp(token.expires_at, 0).ok_or_else(|| {
            WechatComponentTokenError::Store("cached token expiry is not a valid timestamp".into())
        })?;
        store_cached(&self.pool, key, &token.access_token, expires_at, Utc::now()).await
    }

    async fn remove(
        &self,
        key: &str,
    ) -> Result<Option<CachedComponentToken>, WechatComponentTokenError> {
        let row = sqlx::query(
            "DELETE FROM iam_ephemeral_artifact WHERE artifact_key = $1 \
             RETURNING payload_json, expires_at",
        )
        .bind(key)
        .fetch_optional(&self.pool)
        .await
        .map_err(store_error)?;
        decode_row(row)
    }
}

impl<T: WechatComponentTransport> WechatComponentTokenService<PgComponentTokenCache, T> {
    /// Resolves a component token with cross-replica single flight.
    ///
    /// Prefer this over [`WechatComponentTokenService::resolve`] in production:
    /// the plain `resolve` path has no shared lock and can issue duplicate
    /// refreshes when several replicas miss the cache together.
    pub async fn resolve_single_flight(
        &self,
        component_app_id: &str,
        component_app_secret: &str,
        component_verify_ticket: &str,
        now: i64,
    ) -> Result<ComponentAccessToken, WechatComponentTokenError> {
        let key = component_token_cache_key(component_app_id, component_app_secret);
        if let Some(cached) = self.cache().get(&key).await? {
            if component_token_is_usable(cached.expires_at, now) {
                return Ok(cached_to_access_token(cached, now));
            }
        }
        let now_at = DateTime::<Utc>::from_timestamp(now, 0).ok_or_else(|| {
            WechatComponentTokenError::Store("refresh timestamp is not valid".to_string())
        })?;
        let mut transaction = self.cache().pool().begin().await.map_err(store_error)?;
        sqlx::query("SELECT pg_advisory_xact_lock($1)")
            .bind(advisory_lock_key(&key))
            .execute(&mut *transaction)
            .await
            .map_err(store_error)?;
        if let Some(cached) = load_cached(&mut *transaction, &key, now_at).await? {
            if component_token_is_usable(cached.expires_at, now) {
                transaction.commit().await.map_err(store_error)?;
                return Ok(cached_to_access_token(cached, now));
            }
        }
        let token = self
            .api()
            .fetch_component_token(
                component_app_id,
                component_app_secret,
                component_verify_ticket,
            )
            .await?;
        let ttl = component_token_cache_ttl_seconds(token.expires_in);
        if ttl > 0 {
            let expires_at = now_at + chrono::Duration::seconds(ttl);
            store_cached(
                &mut *transaction,
                &key,
                &token.access_token,
                expires_at,
                now_at,
            )
            .await?;
        }
        transaction.commit().await.map_err(store_error)?;
        Ok(token)
    }
}

/// Derives a stable signed 64-bit advisory-lock key from a cache key.
///
/// @param key - the component token cache key.
/// @returns a deterministic value accepted by `pg_advisory_xact_lock`.
pub fn advisory_lock_key(key: &str) -> i64 {
    let digest = Sha256::digest(key.as_bytes());
    i64::from_be_bytes([
        digest[0], digest[1], digest[2], digest[3], digest[4], digest[5], digest[6], digest[7],
    ])
}

async fn load_cached<'e, E>(
    executor: E,
    key: &str,
    now: DateTime<Utc>,
) -> Result<Option<CachedComponentToken>, WechatComponentTokenError>
where
    E: Executor<'e, Database = Postgres>,
{
    let row = sqlx::query(
        "SELECT payload_json, expires_at FROM iam_ephemeral_artifact \
         WHERE artifact_key = $1 AND expires_at > $2",
    )
    .bind(key)
    .bind(now)
    .fetch_optional(executor)
    .await
    .map_err(store_error)?;
    decode_row(row)
}

async fn store_cached<'e, E>(
    executor: E,
    key: &str,
    access_token: &str,
    expires_at: DateTime<Utc>,
    now: DateTime<Utc>,
) -> Result<(), WechatComponentTokenError>
where
    E: Executor<'e, Database = Postgres>,
{
    sqlx::query(
        "INSERT INTO iam_ephemeral_artifact \
         (artifact_key, tenant_id, artifact_kind, payload_json, expires_at, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7) \
         ON CONFLICT (artifact_key) DO UPDATE SET \
           payload_json = EXCLUDED.payload_json, \
           expires_at = EXCLUDED.expires_at, \
           updated_at = EXCLUDED.updated_at",
    )
    .bind(key)
    .bind(COMPONENT_TOKEN_ARTIFACT_SCOPE)
    .bind(COMPONENT_TOKEN_ARTIFACT_KIND)
    .bind(Json(encode_payload(access_token)))
    .bind(expires_at)
    .bind(now)
    .bind(now)
    .execute(executor)
    .await
    .map_err(store_error)?;
    Ok(())
}

fn encode_payload(access_token: &str) -> Value {
    let mut payload = serde_json::Map::new();
    payload.insert(
        PAYLOAD_TOKEN_FIELD.to_string(),
        Value::String(access_token.to_string()),
    );
    Value::Object(payload)
}

fn decode_payload(payload: &Value) -> Result<String, WechatComponentTokenError> {
    payload
        .get(PAYLOAD_TOKEN_FIELD)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .ok_or_else(|| {
            WechatComponentTokenError::Store(
                "cached component token payload has no token".to_string(),
            )
        })
}

fn decode_row(
    row: Option<PgRow>,
) -> Result<Option<CachedComponentToken>, WechatComponentTokenError> {
    let Some(row) = row else {
        return Ok(None);
    };
    let payload: Json<Value> = row.try_get("payload_json").map_err(store_error)?;
    let expires_at: DateTime<Utc> = row.try_get("expires_at").map_err(store_error)?;
    let access_token = decode_payload(&payload.0)?;
    Ok(Some(CachedComponentToken {
        access_token,
        expires_at: expires_at.timestamp(),
    }))
}

fn cached_to_access_token(cached: CachedComponentToken, now: i64) -> ComponentAccessToken {
    ComponentAccessToken {
        access_token: cached.access_token,
        expires_in: (cached.expires_at - now).max(0),
    }
}

fn store_error(error: sqlx::Error) -> WechatComponentTokenError {
    WechatComponentTokenError::Store(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn advisory_lock_key_is_stable_and_distinct() {
        let first = advisory_lock_key("wechat_component_token:wxcomponent:abc");
        assert_eq!(
            first,
            advisory_lock_key("wechat_component_token:wxcomponent:abc")
        );
        assert_ne!(
            first,
            advisory_lock_key("wechat_component_token:wxcomponent:def")
        );
        assert_ne!(
            first,
            advisory_lock_key("wechat_component_token:wxother:abc")
        );
    }

    #[test]
    fn payload_round_trips_the_provider_token() {
        let payload = encode_payload("component-token");
        assert_eq!(payload["componentAccessToken"], "component-token");
        assert_eq!(
            decode_payload(&payload).expect("decode"),
            "component-token".to_string()
        );
    }

    #[test]
    fn payload_rejects_an_empty_token() {
        let payload = encode_payload("   ");
        assert!(matches!(
            decode_payload(&payload),
            Err(WechatComponentTokenError::Store(_))
        ));
    }
}
