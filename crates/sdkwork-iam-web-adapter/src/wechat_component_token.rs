//! Component-token cache and resolution service.
//!
//! WeChat issues a component access token for 7200 seconds and requires every
//! caller to cache it. Fetching one token per request burns the provider quota,
//! and a token fetched by two replicas at once is harmless but wasteful, so the
//! service separates the cache (a port) from the provider call (a transport):
//!
//! - `resolve` is the hot path: return a usable cached token, otherwise fetch,
//!   store, and return.
//! - `refresh` forces a provider call for the explicit "refresh now" admin
//!   action and for recovery after a `40001` style rejection.
//! - `invalidate` removes the cached token only when it is the token that
//!   failed, so a concurrent refresh is never discarded by a late failure.
//!
//! The cache key includes a fingerprint of the component secret, so rotating
//! the secret cannot silently keep serving a token minted for the old one.
//! A PostgreSQL-backed cache adds the cross-replica refresh lock; the in-memory
//! cache here is the process-local layer and the test double.
use std::collections::HashMap;
use std::sync::Mutex;

use async_trait::async_trait;
use sha2::{Digest as Sha256Digest, Sha256};

use crate::wechat_component_api::{
    component_token_is_usable, ComponentAccessToken, WechatComponentApi, WechatComponentApiError,
    WechatComponentTransport, COMPONENT_TOKEN_REFRESH_LEAD_SECONDS,
    COMPONENT_TOKEN_SAFETY_MARGIN_SECONDS,
};

/// A cached component token with its effective expiry.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CachedComponentToken {
    /// Provider token value.
    pub access_token: String,
    /// Unix second after which the token must not be used.
    pub expires_at: i64,
}

/// The cache port.
#[async_trait]
pub trait ComponentTokenCache: Send + Sync {
    /// Reads one cached token.
    async fn get(
        &self,
        key: &str,
    ) -> Result<Option<CachedComponentToken>, WechatComponentTokenError>;
    /// Stores one token, replacing any previous value.
    async fn put(
        &self,
        key: &str,
        token: CachedComponentToken,
    ) -> Result<(), WechatComponentTokenError>;
    /// Removes one token.
    async fn remove(
        &self,
        key: &str,
    ) -> Result<Option<CachedComponentToken>, WechatComponentTokenError>;
}

/// A component-token resolution failure.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum WechatComponentTokenError {
    /// The provider call failed.
    Api(WechatComponentApiError),
    /// The cache backend failed.
    Store(String),
}

impl std::fmt::Display for WechatComponentTokenError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Api(error) => write!(f, "component token provider call failed: {error}"),
            Self::Store(detail) => write!(f, "component token cache failed: {detail}"),
        }
    }
}

impl std::error::Error for WechatComponentTokenError {}

impl From<WechatComponentApiError> for WechatComponentTokenError {
    fn from(error: WechatComponentApiError) -> Self {
        Self::Api(error)
    }
}

/// Process-local token cache.
///
/// The mutex is held only for a synchronous map operation; no guard crosses an
/// `.await` boundary.
#[derive(Debug, Default)]
pub struct InMemoryComponentTokenCache {
    entries: Mutex<HashMap<String, CachedComponentToken>>,
}

impl InMemoryComponentTokenCache {
    /// Creates an empty cache.
    pub fn new() -> Self {
        Self::default()
    }

    /// Number of cached entries, for diagnostics and tests.
    pub fn len(&self) -> usize {
        self.entries
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .len()
    }

    /// True when no token is cached.
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

#[async_trait]
impl ComponentTokenCache for InMemoryComponentTokenCache {
    async fn get(
        &self,
        key: &str,
    ) -> Result<Option<CachedComponentToken>, WechatComponentTokenError> {
        let entries = self
            .entries
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        Ok(entries.get(key).cloned())
    }

    async fn put(
        &self,
        key: &str,
        token: CachedComponentToken,
    ) -> Result<(), WechatComponentTokenError> {
        self.entries
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .insert(key.to_string(), token);
        Ok(())
    }

    async fn remove(
        &self,
        key: &str,
    ) -> Result<Option<CachedComponentToken>, WechatComponentTokenError> {
        Ok(self
            .entries
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .remove(key))
    }
}

/// Resolves and caches component access tokens.
pub struct WechatComponentTokenService<C: ComponentTokenCache, T: WechatComponentTransport> {
    cache: C,
    api: WechatComponentApi<T>,
}

impl<C: ComponentTokenCache, T: WechatComponentTransport> WechatComponentTokenService<C, T> {
    /// Builds the service from a cache and a provider client.
    pub fn new(cache: C, api: WechatComponentApi<T>) -> Self {
        Self { cache, api }
    }

    /// Borrows the cache port (used by persistence-specific helpers).
    pub(crate) fn cache(&self) -> &C {
        &self.cache
    }

    /// Borrows the provider client.
    pub(crate) fn api(&self) -> &WechatComponentApi<T> {
        &self.api
    }

    /// Returns a usable component token, fetching and caching one on a miss.
    ///
    /// @param component_app_id - the component AppID.
    /// @param component_app_secret - the component secret, used only for the
    /// cache fingerprint.
    /// @param component_verify_ticket - the latest pushed verification ticket.
    /// @param now - current Unix second, injected for deterministic tests.
    pub async fn resolve(
        &self,
        component_app_id: &str,
        component_app_secret: &str,
        component_verify_ticket: &str,
        now: i64,
    ) -> Result<ComponentAccessToken, WechatComponentTokenError> {
        let key = component_token_cache_key(component_app_id, component_app_secret);
        if let Some(cached) = self.cache.get(&key).await? {
            if component_token_is_usable(cached.expires_at, now) {
                return Ok(ComponentAccessToken {
                    access_token: cached.access_token,
                    expires_in: (cached.expires_at - now).max(0),
                });
            }
        }
        let token = self
            .api
            .fetch_component_token(
                component_app_id,
                component_app_secret,
                component_verify_ticket,
            )
            .await?;
        self.cache_token(&key, &token, now).await?;
        Ok(token)
    }

    /// Forces a provider call and replaces the cached token.
    pub async fn refresh(
        &self,
        component_app_id: &str,
        component_app_secret: &str,
        component_verify_ticket: &str,
        now: i64,
    ) -> Result<ComponentAccessToken, WechatComponentTokenError> {
        let key = component_token_cache_key(component_app_id, component_app_secret);
        let token = self
            .api
            .fetch_component_token(
                component_app_id,
                component_app_secret,
                component_verify_ticket,
            )
            .await?;
        self.cache_token(&key, &token, now).await?;
        Ok(token)
    }

    /// Removes a cached token if it is the one that failed.
    ///
    /// @param failed_access_token - the token the provider just rejected.
    /// @returns true when a cached entry was removed.
    pub async fn invalidate(
        &self,
        component_app_id: &str,
        component_app_secret: &str,
        failed_access_token: &str,
    ) -> Result<bool, WechatComponentTokenError> {
        let key = component_token_cache_key(component_app_id, component_app_secret);
        let Some(cached) = self.cache.get(&key).await? else {
            return Ok(false);
        };
        if cached.access_token != failed_access_token {
            return Ok(false);
        }
        Ok(self.cache.remove(&key).await?.is_some())
    }

    async fn cache_token(
        &self,
        key: &str,
        token: &ComponentAccessToken,
        now: i64,
    ) -> Result<(), WechatComponentTokenError> {
        let ttl = component_token_cache_ttl_seconds(token.expires_in);
        if ttl <= 0 {
            return Ok(());
        }
        self.cache
            .put(
                key,
                CachedComponentToken {
                    access_token: token.access_token.clone(),
                    expires_at: now + ttl,
                },
            )
            .await
    }
}

/// The cache key for one component credential pair.
///
/// The secret fingerprint means a rotated secret starts from an empty cache
/// instead of reusing a token minted under the previous secret.
pub fn component_token_cache_key(component_app_id: &str, component_app_secret: &str) -> String {
    let fingerprint = secret_fingerprint(component_app_secret);
    format!(
        "wechat_component_token:{}:{}",
        component_app_id.trim(),
        fingerprint
    )
}

/// The effective cache lifetime for a provider lifetime.
///
/// @param expires_in - provider lifetime in seconds.
/// @returns seconds to cache, or 0 when the provider value is unusable.
pub fn component_token_cache_ttl_seconds(expires_in: i64) -> i64 {
    if expires_in <= 0 {
        return 0;
    }
    let ttl = expires_in - COMPONENT_TOKEN_REFRESH_LEAD_SECONDS;
    ttl.max(COMPONENT_TOKEN_SAFETY_MARGIN_SECONDS)
}

/// Current Unix second.
pub fn now_epoch_seconds() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}

fn secret_fingerprint(secret: &str) -> String {
    let digest = Sha256::digest(secret.as_bytes());
    let mut hex = String::with_capacity(32);
    for byte in &digest[..16] {
        hex.push_str(&format!("{byte:02x}"));
    }
    hex
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::wechat_component_api::WechatComponentApiError;
    use serde_json::Value;
    use std::sync::atomic::{AtomicUsize, Ordering};

    struct CountingTransport {
        response: String,
        calls: AtomicUsize,
    }

    impl CountingTransport {
        fn replies(body: &str) -> Self {
            Self {
                response: body.to_string(),
                calls: AtomicUsize::new(0),
            }
        }

        fn calls(&self) -> usize {
            self.calls.load(Ordering::SeqCst)
        }
    }

    #[async_trait]
    impl WechatComponentTransport for CountingTransport {
        async fn post_json(
            &self,
            _url: &str,
            _body: &Value,
        ) -> Result<String, WechatComponentApiError> {
            self.calls.fetch_add(1, Ordering::SeqCst);
            Ok(self.response.clone())
        }
    }

    fn service(
        cache: InMemoryComponentTokenCache,
        transport: CountingTransport,
    ) -> WechatComponentTokenService<InMemoryComponentTokenCache, CountingTransport> {
        WechatComponentTokenService::new(
            cache,
            WechatComponentApi::with_base_url(transport, "https://api.weixin.qq.com"),
        )
    }

    const NOW: i64 = 1_700_000_000;

    #[tokio::test]
    async fn resolves_from_cache_without_a_provider_call() {
        let cache = InMemoryComponentTokenCache::new();
        let key = component_token_cache_key("wxcomponent", "secret");
        cache
            .put(
                &key,
                CachedComponentToken {
                    access_token: "cached-token".to_string(),
                    expires_at: NOW + 3_600,
                },
            )
            .await
            .expect("seed cache");
        let service = service(
            cache,
            CountingTransport::replies(r#"{"component_access_token":"fresh","expires_in":7200}"#),
        );
        let token = service
            .resolve("wxcomponent", "secret", "ticket", NOW)
            .await
            .expect("token");
        assert_eq!(token.access_token, "cached-token");
        assert_eq!(service.api.transport().calls(), 0);
    }

    #[tokio::test]
    async fn fetches_and_caches_on_miss() {
        let cache = InMemoryComponentTokenCache::new();
        let service = service(
            cache,
            CountingTransport::replies(
                r#"{"component_access_token":"fresh-token","expires_in":7200}"#,
            ),
        );
        let token = service
            .resolve("wxcomponent", "secret", "ticket", NOW)
            .await
            .expect("token");
        assert_eq!(token.access_token, "fresh-token");
        assert_eq!(service.api.transport().calls(), 1);
        assert_eq!(service.cache.len(), 1);

        let again = service
            .resolve("wxcomponent", "secret", "ticket", NOW + 10)
            .await
            .expect("cached token");
        assert_eq!(again.access_token, "fresh-token");
        assert_eq!(service.api.transport().calls(), 1);
    }

    #[tokio::test]
    async fn refetches_when_cached_token_is_too_close_to_expiry() {
        let cache = InMemoryComponentTokenCache::new();
        let key = component_token_cache_key("wxcomponent", "secret");
        cache
            .put(
                &key,
                CachedComponentToken {
                    access_token: "stale".to_string(),
                    expires_at: NOW + 30,
                },
            )
            .await
            .expect("seed cache");
        let service = service(
            cache,
            CountingTransport::replies(r#"{"component_access_token":"new","expires_in":7200}"#),
        );
        let token = service
            .resolve("wxcomponent", "secret", "ticket", NOW)
            .await
            .expect("token");
        assert_eq!(token.access_token, "new");
        assert_eq!(service.api.transport().calls(), 1);
    }

    #[tokio::test]
    async fn provider_failure_does_not_cache_a_token() {
        let cache = InMemoryComponentTokenCache::new();
        let service = service(
            cache,
            CountingTransport::replies(r#"{"errcode":50001,"errmsg":"busy"}"#),
        );
        let error = service
            .resolve("wxcomponent", "secret", "ticket", NOW)
            .await
            .expect_err("provider failure");
        assert!(matches!(
            error,
            WechatComponentTokenError::Api(WechatComponentApiError::Provider { .. })
        ));
        assert!(service.cache.is_empty());
    }

    #[tokio::test]
    async fn refresh_bypasses_the_cache() {
        let cache = InMemoryComponentTokenCache::new();
        let key = component_token_cache_key("wxcomponent", "secret");
        cache
            .put(
                &key,
                CachedComponentToken {
                    access_token: "cached".to_string(),
                    expires_at: NOW + 3_600,
                },
            )
            .await
            .expect("seed cache");
        let service = service(
            cache,
            CountingTransport::replies(r#"{"component_access_token":"forced","expires_in":7200}"#),
        );
        let token = service
            .refresh("wxcomponent", "secret", "ticket", NOW)
            .await
            .expect("token");
        assert_eq!(token.access_token, "forced");
        assert_eq!(service.api.transport().calls(), 1);
    }

    #[tokio::test]
    async fn invalidate_removes_only_the_matching_token() {
        let cache = InMemoryComponentTokenCache::new();
        let key = component_token_cache_key("wxcomponent", "secret");
        cache
            .put(
                &key,
                CachedComponentToken {
                    access_token: "current".to_string(),
                    expires_at: NOW + 3_600,
                },
            )
            .await
            .expect("seed cache");
        let service = service(
            cache,
            CountingTransport::replies(r#"{"component_access_token":"unused","expires_in":7200}"#),
        );
        assert!(!service
            .invalidate("wxcomponent", "secret", "other-token")
            .await
            .expect("invalidate"));
        assert_eq!(service.cache.len(), 1);
        assert!(service
            .invalidate("wxcomponent", "secret", "current")
            .await
            .expect("invalidate"));
        assert!(service.cache.is_empty());
    }

    #[test]
    fn rotated_secret_uses_a_different_cache_key() {
        assert_ne!(
            component_token_cache_key("wxcomponent", "secret-a"),
            component_token_cache_key("wxcomponent", "secret-b")
        );
        assert_eq!(
            component_token_cache_key(" wxcomponent ", "secret-a"),
            component_token_cache_key("wxcomponent", "secret-a")
        );
    }

    #[test]
    fn cache_ttl_respects_lead_and_floor() {
        assert_eq!(component_token_cache_ttl_seconds(7_200), 6_600);
        assert_eq!(component_token_cache_ttl_seconds(0), 0);
        assert_eq!(component_token_cache_ttl_seconds(-1), 0);
        assert_eq!(
            component_token_cache_ttl_seconds(120),
            COMPONENT_TOKEN_SAFETY_MARGIN_SECONDS
        );
    }
}
