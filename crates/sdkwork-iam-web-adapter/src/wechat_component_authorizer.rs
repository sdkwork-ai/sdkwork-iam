//! Authorizer access-token resolution.
//!
//! A component authorizes once; after that every provider call for the mini
//! program or official account needs a two-hour `authorizer_access_token`. The
//! refresh token is the long-lived credential and is stored encrypted; the
//! access token is treated as an ephemeral cache entry, never as durable state.
//!
//! Resolution is deliberately serialized per authorization row: WeChat returns a
//! **new refresh token** on every refresh, so two concurrent refreshes would race
//! and one could overwrite the other with an already-superseded token. The
//! transaction takes `pg_advisory_xact_lock` for the authorization, re-checks the
//! cache, refreshes only if needed, and commits.
use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::postgres::PgRow;
use sqlx::types::Json;
use sqlx::{Executor, PgPool, Postgres, Row};

use sdkwork_iam_bootstrap::{
    decode_signing_secret_ref, encode_signing_secret_ref, hash_secret_ref,
};

use crate::wechat_component_api::{
    WechatComponentApi, WechatComponentApiError, WechatComponentTransport,
};
use crate::wechat_component_authorization::{
    ComponentPlatformConfigReader, PgComponentPlatformConfigReader,
};
use crate::wechat_component_token::{WechatComponentTokenError, WechatComponentTokenService};
use crate::wechat_component_token_pg::{advisory_lock_key, PgComponentTokenCache};

/// Refresh an access token this many seconds before it expires.
pub const AUTHORIZER_TOKEN_SAFETY_MARGIN_SECONDS: i64 = 60;

/// Back off this long after a retryable refresh failure.
pub const AUTHORIZER_REFRESH_BACKOFF_SECONDS: i64 = 300;

/// Artifact kind for cached authorizer access tokens.
pub const AUTHORIZER_TOKEN_ARTIFACT_KIND: &str = "wechat_authorizer_token";

/// Tenant scope used for process-independent artifacts.
const ARTIFACT_SCOPE: &str = "__local__";

/// Payload field holding the access token.
const PAYLOAD_TOKEN_FIELD: &str = "accessToken";

const REFRESH_TOKEN_INVALID_CODES: [i64; 4] = [40001, 40014, 42001, 61023];

/// A usable authorizer access token.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AuthorizerTokenLease {
    /// Resource authorization row id.
    pub authorization_id: String,
    /// Authorizer AppID.
    pub authorizer_app_id: String,
    /// Two-hour access token.
    pub access_token: String,
    /// Unix second after which the token must not be used.
    pub expires_at: i64,
}

/// A token-resolution failure.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum WechatComponentAuthorizerError {
    /// The authorization row does not exist.
    NotFound(String),
    /// The authorization is not active (expired or revoked).
    NotActive {
        /// Authorization id.
        authorization_id: String,
        /// Stored status.
        status: String,
    },
    /// No refresh token is stored; the customer must authorize again.
    MissingRefreshToken(String),
    /// The provider rejected the refresh token.
    RefreshTokenInvalid {
        /// Authorization id.
        authorization_id: String,
        /// Provider error code.
        errcode: i64,
    },
    /// The provider call failed.
    Api(WechatComponentApiError),
    /// The component token failed.
    Token(WechatComponentTokenError),
    /// The store failed.
    Store(String),
}

impl std::fmt::Display for WechatComponentAuthorizerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NotFound(id) => write!(f, "resource authorization {id} not found"),
            Self::NotActive {
                authorization_id,
                status,
            } => write!(f, "resource authorization {authorization_id} is {status}"),
            Self::MissingRefreshToken(id) => {
                write!(f, "resource authorization {id} has no refresh token")
            }
            Self::RefreshTokenInvalid {
                authorization_id,
                errcode,
            } => write!(
                f,
                "resource authorization {authorization_id} refresh token was rejected ({errcode})"
            ),
            Self::Api(error) => write!(f, "authorizer token refresh failed: {error}"),
            Self::Token(error) => write!(f, "component token failed: {error}"),
            Self::Store(detail) => write!(f, "authorizer token store failed: {detail}"),
        }
    }
}

impl std::error::Error for WechatComponentAuthorizerError {}

/// True when the provider error means the stored refresh token is dead.
pub fn is_refresh_token_invalid_code(code: i64) -> bool {
    REFRESH_TOKEN_INVALID_CODES.contains(&code)
}

/// True when a cached access token is still safe to use.
pub fn authorizer_token_is_usable(expires_at: i64, now: i64) -> bool {
    now + AUTHORIZER_TOKEN_SAFETY_MARGIN_SECONDS < expires_at
}

/// The next refresh time for a freshly issued token.
pub fn next_authorizer_refresh_at(now: i64, expires_in: i64) -> i64 {
    now + (expires_in - 600).max(60)
}

struct AuthorizationRow {
    authorization_id: String,
    authorizer_app_id: String,
    operator_platform_id: String,
    refresh_token_ref: Option<String>,
    status: String,
}

/// Resolves authorizer access tokens for one database.
pub struct PgAuthorizerTokenService<T: WechatComponentTransport> {
    pool: PgPool,
    tokens: WechatComponentTokenService<PgComponentTokenCache, T>,
    api: WechatComponentApi<T>,
    reader: PgComponentPlatformConfigReader,
}

impl<T: WechatComponentTransport> PgAuthorizerTokenService<T> {
    /// Builds the service.
    pub fn new(
        pool: PgPool,
        tokens: WechatComponentTokenService<PgComponentTokenCache, T>,
        api: WechatComponentApi<T>,
    ) -> Self {
        let reader = PgComponentPlatformConfigReader::new(pool.clone());
        Self {
            pool,
            tokens,
            api,
            reader,
        }
    }

    /// Returns a usable access token, refreshing and caching one when needed.
    pub async fn resolve(
        &self,
        authorization_id: &str,
        now: i64,
    ) -> Result<AuthorizerTokenLease, WechatComponentAuthorizerError> {
        let cache_key = artifact_key(authorization_id);
        if let Some(cached) = load_artifact(&self.pool, &cache_key, now).await? {
            if authorizer_token_is_usable(cached.expires_at, now) {
                let authorization = self.load_authorization(authorization_id).await?;
                return Ok(AuthorizerTokenLease {
                    authorization_id: authorization.authorization_id,
                    authorizer_app_id: authorization.authorizer_app_id,
                    access_token: cached.access_token,
                    expires_at: cached.expires_at,
                });
            }
        }
        let now_at = DateTime::<Utc>::from_timestamp(now, 0)
            .ok_or_else(|| WechatComponentAuthorizerError::Store("invalid clock".into()))?;
        let mut transaction = self.pool.begin().await.map_err(store_error)?;
        sqlx::query("SELECT pg_advisory_xact_lock($1)")
            .bind(advisory_lock_key(&format!(
                "wechat_authorizer:{authorization_id}"
            )))
            .execute(&mut *transaction)
            .await
            .map_err(store_error)?;
        if let Some(cached) = load_artifact(&mut *transaction, &cache_key, now).await? {
            if authorizer_token_is_usable(cached.expires_at, now) {
                let authorization = load_authorization(&mut *transaction, authorization_id).await?;
                transaction.commit().await.map_err(store_error)?;
                return Ok(AuthorizerTokenLease {
                    authorization_id: authorization.authorization_id,
                    authorizer_app_id: authorization.authorizer_app_id,
                    access_token: cached.access_token,
                    expires_at: cached.expires_at,
                });
            }
        }
        let authorization = load_authorization(&mut *transaction, authorization_id).await?;
        if authorization.status != "active" {
            transaction.commit().await.map_err(store_error)?;
            return Err(WechatComponentAuthorizerError::NotActive {
                authorization_id: authorization.authorization_id,
                status: authorization.status,
            });
        }
        let refresh_ref = authorization.refresh_token_ref.clone().ok_or_else(|| {
            WechatComponentAuthorizerError::MissingRefreshToken(
                authorization.authorization_id.clone(),
            )
        })?;
        let refresh_token = decode_secret(&refresh_ref)?;
        let config = self
            .reader
            .load(&authorization.operator_platform_id)
            .await
            .map_err(|error| WechatComponentAuthorizerError::Store(error.to_string()))?
            .ok_or_else(|| {
                WechatComponentAuthorizerError::NotFound(authorization.authorization_id.clone())
            })?;
        let component_token = self
            .tokens
            .resolve_single_flight(
                &config.component_app_id,
                &config.component_app_secret,
                &config.component_verify_ticket,
                now,
            )
            .await
            .map_err(WechatComponentAuthorizerError::Token)?;
        let refreshed = match self
            .api
            .refresh_authorizer_token(
                &component_token.access_token,
                &config.component_app_id,
                &authorization.authorizer_app_id,
                &refresh_token,
            )
            .await
        {
            Ok(token) => token,
            Err(error) => {
                self.record_refresh_failure(&mut transaction, &authorization, &error, now)
                    .await?;
                transaction.commit().await.map_err(store_error)?;
                return Err(match error.provider_code() {
                    Some(errcode) if is_refresh_token_invalid_code(errcode) => {
                        WechatComponentAuthorizerError::RefreshTokenInvalid {
                            authorization_id: authorization.authorization_id.clone(),
                            errcode,
                        }
                    }
                    _ => WechatComponentAuthorizerError::Api(error),
                });
            }
        };
        let expires_at = now + refreshed.expires_in.max(0);
        let next_refresh_at = next_authorizer_refresh_at(now, refreshed.expires_in);
        let access_token_hash = hash_secret_ref(&refreshed.authorizer_access_token);
        let new_refresh_ref = refreshed
            .authorizer_refresh_token
            .as_deref()
            .map(|value| encode_signing_secret_ref(value.as_bytes()));
        sqlx::query(
            "UPDATE iam_oauth_resource_authorization SET \
                authorizer_refresh_token_secret_ref = COALESCE($2, authorizer_refresh_token_secret_ref), \
                authorizer_access_token_hash = $3, \
                last_refreshed_at = $4, \
                expires_at = $5, \
                next_refresh_at = $6, \
                last_refresh_error_code = NULL, \
                last_refresh_error_at = NULL, \
                status = 'active', \
                updated_at = $4, \
                version = version + 1 \
             WHERE id = $1",
        )
        .bind(&authorization.authorization_id)
        .bind(&new_refresh_ref)
        .bind(&access_token_hash)
        .bind(now_at.to_rfc3339())
        .bind(timestamp(expires_at)?.to_rfc3339())
        .bind(timestamp(next_refresh_at)?.to_rfc3339())
        .execute(&mut *transaction)
        .await
        .map_err(store_error)?;
        store_artifact(
            &mut *transaction,
            &cache_key,
            &refreshed.authorizer_access_token,
            timestamp(expires_at)?,
            now_at,
        )
        .await?;
        transaction.commit().await.map_err(store_error)?;
        Ok(AuthorizerTokenLease {
            authorization_id: authorization.authorization_id,
            authorizer_app_id: authorization.authorizer_app_id,
            access_token: refreshed.authorizer_access_token,
            expires_at,
        })
    }

    /// Refreshes every authorization whose `next_refresh_at` is due.
    ///
    /// @returns the number of rows refreshed successfully and the failures.
    pub async fn refresh_due(
        &self,
        limit: i64,
        now: i64,
    ) -> Result<(usize, Vec<WechatComponentAuthorizerError>), WechatComponentAuthorizerError> {
        let due: Vec<String> = sqlx::query_scalar(
            "SELECT id FROM iam_oauth_resource_authorization \
             WHERE status = 'active' AND next_refresh_at IS NOT NULL \
               AND next_refresh_at::timestamptz <= $1::timestamptz \
             ORDER BY next_refresh_at LIMIT $2",
        )
        .bind(timestamp(now)?.to_rfc3339())
        .bind(limit)
        .fetch_all(&self.pool)
        .await
        .map_err(store_error)?;
        let mut refreshed = 0usize;
        let mut failures = Vec::new();
        for authorization_id in due {
            match self.resolve(&authorization_id, now).await {
                Ok(_) => refreshed += 1,
                Err(error) => failures.push(error),
            }
        }
        Ok((refreshed, failures))
    }

    async fn load_authorization(
        &self,
        authorization_id: &str,
    ) -> Result<AuthorizationRow, WechatComponentAuthorizerError> {
        let row = sqlx::query(
            "SELECT id, authorizer_appid, operator_platform_id, \
                    authorizer_refresh_token_secret_ref, status \
             FROM iam_oauth_resource_authorization WHERE id = $1",
        )
        .bind(authorization_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(store_error)?
        .ok_or_else(|| WechatComponentAuthorizerError::NotFound(authorization_id.to_string()))?;
        decode_authorization_row(&row)
    }

    async fn record_refresh_failure(
        &self,
        transaction: &mut sqlx::Transaction<'_, Postgres>,
        authorization: &AuthorizationRow,
        error: &WechatComponentApiError,
        now: i64,
    ) -> Result<(), WechatComponentAuthorizerError> {
        let invalid = error
            .provider_code()
            .is_some_and(is_refresh_token_invalid_code);
        let next_status = if invalid { "expired" } else { "active" };
        let next_refresh_at = if invalid {
            None
        } else {
            Some(timestamp(now + AUTHORIZER_REFRESH_BACKOFF_SECONDS)?.to_rfc3339())
        };
        sqlx::query(
            "UPDATE iam_oauth_resource_authorization SET \
                status = $2, \
                last_refresh_error_code = $3, \
                last_refresh_error_at = $4, \
                next_refresh_at = COALESCE($5, next_refresh_at), \
                updated_at = $4, \
                version = version + 1 \
             WHERE id = $1",
        )
        .bind(&authorization.authorization_id)
        .bind(next_status)
        .bind(error.provider_code().map(|code| code.to_string()))
        .bind(timestamp(now)?.to_rfc3339())
        .bind(next_refresh_at)
        .execute(&mut **transaction)
        .await
        .map_err(store_error)?;
        Ok(())
    }
}

fn decode_authorization_row(
    row: &PgRow,
) -> Result<AuthorizationRow, WechatComponentAuthorizerError> {
    Ok(AuthorizationRow {
        authorization_id: row.try_get("id").map_err(store_error)?,
        authorizer_app_id: row.try_get("authorizer_appid").map_err(store_error)?,
        operator_platform_id: row.try_get("operator_platform_id").map_err(store_error)?,
        refresh_token_ref: row
            .try_get("authorizer_refresh_token_secret_ref")
            .map_err(store_error)?,
        status: row.try_get("status").map_err(store_error)?,
    })
}

async fn load_authorization<'e, E>(
    executor: E,
    authorization_id: &str,
) -> Result<AuthorizationRow, WechatComponentAuthorizerError>
where
    E: Executor<'e, Database = Postgres>,
{
    let row = sqlx::query(
        "SELECT id, authorizer_appid, operator_platform_id, \
                authorizer_refresh_token_secret_ref, status \
         FROM iam_oauth_resource_authorization WHERE id = $1 FOR UPDATE",
    )
    .bind(authorization_id)
    .fetch_optional(executor)
    .await
    .map_err(store_error)?
    .ok_or_else(|| WechatComponentAuthorizerError::NotFound(authorization_id.to_string()))?;
    decode_authorization_row(&row)
}

struct CachedToken {
    access_token: String,
    expires_at: i64,
}

async fn load_artifact<'e, E>(
    executor: E,
    key: &str,
    now: i64,
) -> Result<Option<CachedToken>, WechatComponentAuthorizerError>
where
    E: Executor<'e, Database = Postgres>,
{
    let now_at = timestamp(now)?;
    let row = sqlx::query(
        "SELECT payload_json, expires_at FROM iam_ephemeral_artifact \
         WHERE artifact_key = $1 AND expires_at > $2",
    )
    .bind(key)
    .bind(now_at)
    .fetch_optional(executor)
    .await
    .map_err(store_error)?;
    let Some(row) = row else {
        return Ok(None);
    };
    let payload: Json<Value> = row.try_get("payload_json").map_err(store_error)?;
    let expires_at: DateTime<Utc> = row.try_get("expires_at").map_err(store_error)?;
    let access_token = payload
        .0
        .get(PAYLOAD_TOKEN_FIELD)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            WechatComponentAuthorizerError::Store("cached authorizer token is empty".into())
        })?;
    Ok(Some(CachedToken {
        access_token: access_token.to_string(),
        expires_at: expires_at.timestamp(),
    }))
}

async fn store_artifact<'e, E>(
    executor: E,
    key: &str,
    access_token: &str,
    expires_at: DateTime<Utc>,
    now: DateTime<Utc>,
) -> Result<(), WechatComponentAuthorizerError>
where
    E: Executor<'e, Database = Postgres>,
{
    let mut payload = serde_json::Map::new();
    payload.insert(
        PAYLOAD_TOKEN_FIELD.to_string(),
        Value::String(access_token.to_string()),
    );
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
    .bind(ARTIFACT_SCOPE)
    .bind(AUTHORIZER_TOKEN_ARTIFACT_KIND)
    .bind(Json(Value::Object(payload)))
    .bind(expires_at)
    .bind(now)
    .bind(now)
    .execute(executor)
    .await
    .map_err(store_error)?;
    Ok(())
}

fn decode_secret(secret_ref: &str) -> Result<String, WechatComponentAuthorizerError> {
    let plaintext = decode_signing_secret_ref(secret_ref)
        .map_err(|error| WechatComponentAuthorizerError::Store(error.to_string()))?;
    String::from_utf8(plaintext)
        .map_err(|_| WechatComponentAuthorizerError::Store("refresh token is not utf-8".into()))
}

fn timestamp(epoch: i64) -> Result<DateTime<Utc>, WechatComponentAuthorizerError> {
    DateTime::<Utc>::from_timestamp(epoch, 0)
        .ok_or_else(|| WechatComponentAuthorizerError::Store("invalid timestamp".into()))
}

fn store_error(error: sqlx::Error) -> WechatComponentAuthorizerError {
    WechatComponentAuthorizerError::Store(error.to_string())
}

fn artifact_key(authorization_id: &str) -> String {
    format!("{ARTIFACT_SCOPE}:{AUTHORIZER_TOKEN_ARTIFACT_KIND}:{authorization_id}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_dead_refresh_tokens() {
        assert!(is_refresh_token_invalid_code(40001));
        assert!(is_refresh_token_invalid_code(42001));
        assert!(is_refresh_token_invalid_code(61023));
        assert!(!is_refresh_token_invalid_code(45009));
    }

    #[test]
    fn schedules_refresh_before_expiry() {
        assert_eq!(next_authorizer_refresh_at(1_000, 7_200), 7_600);
        assert_eq!(next_authorizer_refresh_at(1_000, 120), 1_060);
    }

    #[test]
    fn cached_token_needs_a_safety_margin() {
        assert!(authorizer_token_is_usable(1_000, 800));
        assert!(!authorizer_token_is_usable(1_000, 950));
    }

    #[test]
    fn artifact_key_is_stable_per_authorization() {
        assert_eq!(artifact_key("auth-1"), artifact_key("auth-1"));
        assert_ne!(artifact_key("auth-1"), artifact_key("auth-2"));
    }
}
