//! IAM implementation of the framework's authorization-scope port.
//!
//! The authority for `data_scope` / `permission_scope` is the `iam_session` row,
//! written at login, at context switch, and after an RBAC change. Tokens carry
//! identity only (IAM_SPEC §5.2), so any consumer that holds a verified
//! principal — and not the session row itself — resolves scope through this
//! source.
//!
//! The resolved scope is a projection, never a decision: this source does not
//! grant anything by itself. The framework's [`AuthorizationScopeProvider`]
//! owns caching, TTL, invalidation, and the fail-closed fallback.
//!
//! [`AuthorizationScopeProvider`]: sdkwork_web_core::AuthorizationScopeProvider

use async_trait::async_trait;
use sdkwork_web_core::{
    AuthorizationScopeSubject, DynamicAuthorizationScopeSource, WebAuthorizationScope,
    WebFrameworkError,
};
use sqlx::{types::Json, PgPool, Row};
use std::sync::Arc;

/// Row predicate kept byte-identical in spirit to the request-path session
/// lookup: a revoked, expired, or inactive-principal session has no scope.
const SCOPE_SELECT: &str = "SELECT s.data_scope_json, s.permission_scope_json, s.updated_at \
     FROM iam_session s \
     LEFT JOIN iam_user u ON s.principal_kind = 'user' \
       AND u.id = COALESCE(s.principal_id, s.user_id) AND u.tenant_id = s.tenant_id \
     LEFT JOIN iam_service_account sa ON s.principal_kind = 'service_account' \
       AND sa.id = s.principal_id AND sa.tenant_id = s.tenant_id \
     LEFT JOIN iam_service_account_credential sac ON sac.id = s.credential_id \
     WHERE s.id = $1 AND s.tenant_id = $2 \
       AND s.revoked_at IS NULL AND s.expires_at::timestamptz > $3::timestamptz \
       AND ((s.principal_kind = 'user' AND u.status = 'active' AND u.is_deleted = 0) \
            OR (s.principal_kind = 'service_account' AND sa.status = 'active' \
                AND sac.status = 'active' \
                AND (sac.expires_at IS NULL OR sac.expires_at > $3::timestamptz))) \
     LIMIT 1";

/// Loads authorization scope from the authoritative IAM session row.
#[derive(Clone)]
pub struct IamSessionAuthorizationScopeSource {
    pool: Arc<PgPool>,
}

impl IamSessionAuthorizationScopeSource {
    pub fn new(pool: Arc<PgPool>) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl DynamicAuthorizationScopeSource for IamSessionAuthorizationScopeSource {
    async fn resolve(
        &self,
        subject: &AuthorizationScopeSubject,
    ) -> Result<Option<WebAuthorizationScope>, WebFrameworkError> {
        let Some(session_id) = subject
            .session_id
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
        else {
            // No session bound to this principal (api key, OAuth client
            // credentials): the owning lookup already resolved scope from its
            // own record, so there is nothing to project here.
            return Ok(None);
        };

        let row = sqlx::query(SCOPE_SELECT)
            .bind(session_id)
            .bind(&subject.tenant_id)
            .bind(chrono::Utc::now())
            .fetch_optional(self.pool.as_ref())
            .await
            .map_err(|error| {
                WebFrameworkError::dependency_unavailable(format!(
                    "load IAM session authorization scope failed: {error}"
                ))
                .with_reason("iam-session-scope-load-failed")
            })?;

        let Some(row) = row else {
            return Ok(None);
        };

        let data_scope = json_string_vec(&row, 0);
        let permission_scope = json_string_vec(&row, 1);
        let updated_at: chrono::DateTime<chrono::Utc> = row
            .try_get(2)
            .map_err(|error| {
                WebFrameworkError::dependency_unavailable(format!(
                    "IAM session row is missing updated_at: {error}"
                ))
            })?;

        Ok(Some(
            WebAuthorizationScope::new(data_scope, permission_scope)
                .with_revision(updated_at.to_rfc3339()),
        ))
    }
}

fn json_string_vec(row: &sqlx::postgres::PgRow, index: usize) -> Vec<String> {
    if let Ok(Json(value)) = row.try_get::<Json<serde_json::Value>, _>(index) {
        return serde_json::from_value(value).unwrap_or_default();
    }
    if let Ok(text) = row.try_get::<String, _>(index) {
        return serde_json::from_str(&text).unwrap_or_default();
    }
    Vec::new()
}

/// Builds the framework authorization-scope provider bound to the IAM database
/// resolved from the process environment.
///
/// This is the single reuse point for every application that integrates
/// `sdkwork-web-framework` and needs authorization scope for a verified
/// principal without carrying it in the credential:
///
/// ```ignore
/// let provider = sdkwork_iam_web_adapter::iam_authorization_scope_provider_from_env().await;
/// let resolver = sdkwork_web_core::ServerResolvedScopeResolver::new(
///     inner_resolver,
///     std::sync::Arc::new(provider),
///     sdkwork_web_core::WebApiSurface::AppApi,
/// );
/// ```
///
/// An application that needs different cache semantics keeps this source and
/// rebuilds only the provider
/// ([`AuthorizationScopeProvider::new`](sdkwork_web_core::AuthorizationScopeProvider::new)),
/// or replaces the source with its own
/// [`DynamicAuthorizationScopeSource`] implementation.
///
/// When no IAM database is configured the provider is fail-closed
/// ([`AuthorizationScopeProvider::deny_all`](sdkwork_web_core::AuthorizationScopeProvider::deny_all));
/// there is no process-local scope authority to fall back to.
pub async fn iam_authorization_scope_provider_from_env(
) -> sdkwork_web_core::AuthorizationScopeProvider {
    use sdkwork_web_core::AuthorizationScopeProvider;

    let Some(pool) = crate::iam_database_env::resolve_iam_database_pool_from_env().await else {
        return AuthorizationScopeProvider::deny_all();
    };
    match pool.as_postgres() {
        Some(pg) => AuthorizationScopeProvider::server_resolved(Arc::new(
            IamSessionAuthorizationScopeSource::new(Arc::new(pg.clone())),
        )),
        None => AuthorizationScopeProvider::deny_all(),
    }
}
