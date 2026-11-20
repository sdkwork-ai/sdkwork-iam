//! `auth_code` exchange: turn a customer's authorization into stored facts.
//!
//! The callback that receives `auth_code` is the only place a long-lived
//! `authorizer_refresh_token` enters the system. This module exchanges the code
//! with the provider, derives a persistence-ready grant (hashes and an encrypted
//! refresh token, never the raw access token), and hands it to a store port.
//!
//! Two facts are recorded deliberately:
//!
//! - The permission set (`func_info`) is whatever WeChat actually granted, which
//!   can be narrower than requested. Code must never infer capability from the
//!   requested scope.
//! - A missing `authorizer_refresh_token` is a real outcome: the customer must
//!   authorize again. The grant records its absence instead of inventing a
//!   refresh path that cannot work.
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde_json::json;
use sha2::{Digest as Sha256Digest, Sha256};
use sqlx::PgPool;

use sdkwork_iam_bootstrap::encode_signing_secret_ref;

use crate::wechat_component_api::{
    AuthorizerAuthorization, WechatComponentApi, WechatComponentApiError, WechatComponentTransport,
};
use crate::wechat_component_authorization::{
    validate_platform_for_authorization, ComponentPlatformConfig, ComponentPlatformConfigReader,
    WechatComponentAuthorizationError,
};
use crate::wechat_component_token::{WechatComponentTokenError, WechatComponentTokenService};
use crate::wechat_component_token_pg::PgComponentTokenCache;

/// Official-account resource kind.
pub const RESOURCE_ACCOUNT_KIND_OFFICIAL_ACCOUNT: &str = "official_account";
/// Mini-program resource kind.
pub const RESOURCE_ACCOUNT_KIND_MINI_PROGRAM: &str = "mini_program";
/// Authorization mode recorded for a component authorization-code exchange.
pub const AUTHORIZATION_MODE_OPERATOR_CODE: &str = "operator_authorization_code";
/// Access mode recorded for an operator-authorized account.
pub const ACCESS_MODE_OPERATOR_AUTHORIZED: &str = "operator_authorized_account";

/// A resource account kind that a component authorization may produce.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ResourceAccountKind {
    /// WeChat official account.
    OfficialAccount,
    /// WeChat mini program.
    MiniProgram,
}

impl ResourceAccountKind {
    /// The wire/storage value.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::OfficialAccount => RESOURCE_ACCOUNT_KIND_OFFICIAL_ACCOUNT,
            Self::MiniProgram => RESOURCE_ACCOUNT_KIND_MINI_PROGRAM,
        }
    }

    /// Parses the wire/storage value.
    pub fn from_wire(value: &str) -> Option<Self> {
        match value.trim() {
            RESOURCE_ACCOUNT_KIND_OFFICIAL_ACCOUNT => Some(Self::OfficialAccount),
            RESOURCE_ACCOUNT_KIND_MINI_PROGRAM => Some(Self::MiniProgram),
            _ => None,
        }
    }
}

/// Refresh an authorizer token this many seconds before expiry.
pub const AUTHORIZER_TOKEN_REFRESH_LEAD_SECONDS: i64 = 600;

/// One authorization ready for persistence.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AuthorizerGrant {
    /// Operator platform row id.
    pub platform_id: String,
    /// Customer tenant that owns the account.
    pub tenant_id: String,
    /// Owning organization.
    pub organization_id: String,
    /// IAM OAuth integration.
    pub integration_id: String,
    /// Component AppID that obtained the grant.
    pub component_app_id: String,
    /// Authorizer AppID.
    pub authorizer_app_id: String,
    /// `official_account` or `mini_program`.
    pub resource_account_kind: String,
    /// Display name snapshot.
    pub display_name: String,
    /// SHA-256 of the one-time authorization code.
    pub authorization_code_hash: String,
    /// SHA-256 of the short-lived authorizer access token.
    pub authorizer_access_token_hash: String,
    /// Raw refresh token; the store encrypts it. `None` means re-authorization
    /// is required.
    pub authorizer_refresh_token: Option<String>,
    /// Granted permission-set category ids.
    pub func_category_ids: Vec<i64>,
    /// Unix second when the exchange happened.
    pub authorized_at: i64,
    /// Unix second when the short-lived access token expires.
    pub expires_at: i64,
    /// Unix second when the refresh scheduler should act.
    pub next_refresh_at: i64,
}

/// The stored result of one exchange.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CompletedAuthorization {
    /// Resource account row id.
    pub resource_account_id: String,
    /// Resource authorization row id.
    pub authorization_id: String,
    /// Authorizer AppID.
    pub authorizer_app_id: String,
    /// Granted permission-set category ids.
    pub func_category_ids: Vec<i64>,
    /// Whether a refresh token was stored.
    pub refresh_token_present: bool,
    /// Unix second when the short-lived token expires.
    pub expires_at: i64,
}

/// A grant persistence failure.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum WechatComponentGrantError {
    /// The platform id does not exist.
    PlatformNotFound(String),
    /// The platform cannot authorize accounts.
    PlatformNotAuthorizable(&'static str),
    /// The resource kind is not supported.
    InvalidResourceKind(String),
    /// The authorization code is empty.
    InvalidAuthorizationCode,
    /// The provider call failed.
    Api(WechatComponentApiError),
    /// The token service failed.
    Token(WechatComponentTokenError),
    /// The persistence layer failed.
    Store(String),
}

impl std::fmt::Display for WechatComponentGrantError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::PlatformNotFound(id) => write!(f, "operator platform {id} not found"),
            Self::PlatformNotAuthorizable(detail) => {
                write!(f, "operator platform cannot authorize: {detail}")
            }
            Self::InvalidResourceKind(kind) => {
                write!(f, "resource account kind {kind} is not authorizable")
            }
            Self::InvalidAuthorizationCode => f.write_str("authorization code is empty"),
            Self::Api(error) => write!(f, "provider authorization exchange failed: {error}"),
            Self::Token(error) => write!(f, "component token failed: {error}"),
            Self::Store(detail) => write!(f, "grant persistence failed: {detail}"),
        }
    }
}

impl std::error::Error for WechatComponentGrantError {}

impl From<WechatComponentAuthorizationError> for WechatComponentGrantError {
    fn from(error: WechatComponentAuthorizationError) -> Self {
        match error {
            WechatComponentAuthorizationError::PlatformNotFound(id) => Self::PlatformNotFound(id),
            WechatComponentAuthorizationError::CustomizedPlatform(_) => {
                Self::PlatformNotAuthorizable("customized platform has no secret")
            }
            WechatComponentAuthorizationError::MissingSecret(kind) => {
                Self::PlatformNotAuthorizable(kind)
            }
            WechatComponentAuthorizationError::Store(detail) => Self::Store(detail),
            other => Self::Store(other.to_string()),
        }
    }
}

impl From<WechatComponentApiError> for WechatComponentGrantError {
    fn from(error: WechatComponentApiError) -> Self {
        Self::Api(error)
    }
}

impl From<WechatComponentTokenError> for WechatComponentGrantError {
    fn from(error: WechatComponentTokenError) -> Self {
        Self::Token(error)
    }
}

/// The persistence port for a completed authorization.
#[async_trait]
pub trait AuthorizerGrantStore: Send + Sync {
    /// Stores the account and its authorization atomically.
    async fn persist(
        &self,
        grant: &AuthorizerGrant,
    ) -> Result<CompletedAuthorization, WechatComponentGrantError>;
}

/// Inputs for one authorization-code exchange.
#[derive(Clone, Copy, Debug)]
pub struct AuthorizationCompletionRequest<'a> {
    /// Operator platform row id.
    pub platform_id: &'a str,
    /// One-time authorization code from the redirect.
    pub authorization_code: &'a str,
    /// `official_account` or `mini_program` the customer authorized.
    pub resource_account_kind: &'a str,
    /// Display name to snapshot; defaults to the authorizer AppID.
    pub display_name: Option<&'a str>,
    /// Current Unix second.
    pub now: i64,
}

/// Exchanges an authorization code and persists the resulting grant.
pub async fn complete_authorization<R, T, S>(
    reader: &R,
    tokens: &WechatComponentTokenService<PgComponentTokenCache, T>,
    api: &WechatComponentApi<T>,
    store: &S,
    request: &AuthorizationCompletionRequest<'_>,
) -> Result<CompletedAuthorization, WechatComponentGrantError>
where
    R: ComponentPlatformConfigReader,
    T: WechatComponentTransport,
    S: AuthorizerGrantStore,
{
    validate_resource_account_kind(request.resource_account_kind)?;
    if request.authorization_code.trim().is_empty() {
        return Err(WechatComponentGrantError::InvalidAuthorizationCode);
    }
    let config = reader.load(request.platform_id).await?.ok_or_else(|| {
        WechatComponentGrantError::PlatformNotFound(request.platform_id.to_string())
    })?;
    validate_platform_for_authorization(&config)?;
    let token = tokens
        .resolve_single_flight(
            &config.component_app_id,
            &config.component_app_secret,
            &config.component_verify_ticket,
            request.now,
        )
        .await?;
    let authorization = api
        .query_authorization(
            &token.access_token,
            &config.component_app_id,
            request.authorization_code,
        )
        .await?;
    let grant = build_authorizer_grant(
        &config,
        request.resource_account_kind,
        request.display_name,
        request.authorization_code,
        &authorization,
        request.now,
    )?;
    store.persist(&grant).await
}

/// Builds the persistence-ready grant. Pure so the hash, expiry, and
/// refresh-token rules are testable without a provider or a database.
pub fn build_authorizer_grant(
    config: &ComponentPlatformConfig,
    resource_account_kind: &str,
    display_name: Option<&str>,
    authorization_code: &str,
    authorization: &AuthorizerAuthorization,
    now: i64,
) -> Result<AuthorizerGrant, WechatComponentGrantError> {
    validate_resource_account_kind(resource_account_kind)?;
    if authorization_code.trim().is_empty() {
        return Err(WechatComponentGrantError::InvalidAuthorizationCode);
    }
    if authorization.authorizer_app_id.trim().is_empty() {
        return Err(WechatComponentGrantError::Store(
            "provider returned an empty authorizer appid".to_string(),
        ));
    }
    let display_name = display_name
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(&authorization.authorizer_app_id)
        .to_string();
    let expires_in = authorization.expires_in.max(0);
    let expires_at = now + expires_in;
    let next_refresh_at = now + (expires_in - AUTHORIZER_TOKEN_REFRESH_LEAD_SECONDS).max(60);
    Ok(AuthorizerGrant {
        platform_id: config.platform_id.clone(),
        tenant_id: config.tenant_id.clone(),
        organization_id: config.organization_id.clone(),
        integration_id: config.integration_id.clone(),
        component_app_id: config.component_app_id.clone(),
        authorizer_app_id: authorization.authorizer_app_id.clone(),
        resource_account_kind: resource_account_kind.to_string(),
        display_name,
        authorization_code_hash: sha256_hex(authorization_code),
        authorizer_access_token_hash: sha256_hex(&authorization.authorizer_access_token),
        authorizer_refresh_token: authorization.authorizer_refresh_token.clone(),
        func_category_ids: authorization
            .func_scopes
            .iter()
            .map(|scope| scope.category_id)
            .collect(),
        authorized_at: now,
        expires_at,
        next_refresh_at,
    })
}

/// Validates the resource kind a completion request may name.
pub fn validate_resource_account_kind(kind: &str) -> Result<(), WechatComponentGrantError> {
    ResourceAccountKind::from_wire(kind)
        .map(|_| ())
        .ok_or_else(|| WechatComponentGrantError::InvalidResourceKind(kind.to_string()))
}

/// PostgreSQL grant store.
pub struct PgAuthorizerGrantStore {
    pool: PgPool,
}

impl PgAuthorizerGrantStore {
    /// Builds the store over the IAM database pool.
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl AuthorizerGrantStore for PgAuthorizerGrantStore {
    async fn persist(
        &self,
        grant: &AuthorizerGrant,
    ) -> Result<CompletedAuthorization, WechatComponentGrantError> {
        let mut transaction = self.pool.begin().await.map_err(store_error)?;
        let now = DateTime::<Utc>::from_timestamp(grant.authorized_at, 0)
            .ok_or_else(|| WechatComponentGrantError::Store("invalid authorized_at".into()))?
            .to_rfc3339();
        let expires_at = DateTime::<Utc>::from_timestamp(grant.expires_at, 0)
            .ok_or_else(|| WechatComponentGrantError::Store("invalid expires_at".into()))?
            .to_rfc3339();
        let next_refresh_at = DateTime::<Utc>::from_timestamp(grant.next_refresh_at, 0)
            .ok_or_else(|| WechatComponentGrantError::Store("invalid next_refresh_at".into()))?
            .to_rfc3339();
        let func_json = json!(grant.func_category_ids).to_string();
        let account_code = format!(
            "wechat-{}-{}",
            grant.resource_account_kind, grant.authorizer_app_id
        );
        let resource_account_id: String = sqlx::query_scalar(
            "INSERT INTO iam_oauth_resource_account \
                (id, uuid, tenant_id, organization_id, integration_id, operator_platform_id, \
                 provider_code, resource_account_code, resource_account_kind, access_mode, \
                 display_name, provider_account_id, verification_status, authorization_status, \
                 capability_json, self_managed_config_status, operator_authorization_status, \
                 webhook_verify_status, domain_verify_status, last_authorized_at, enabled, \
                 status, created_at, updated_at) \
             VALUES ($1, $2, $3, $4, $5, $6, 'wechat', $7, $8, $9, $10, $11, \
                     'unknown', 'authorized', $12, 'not_required', 'authorized', \
                     'unknown', 'unknown', $13, 1, 'active', $13, $13) \
             ON CONFLICT (tenant_id, organization_id, provider_code, resource_account_kind, \
                          provider_account_id) \
             DO UPDATE SET operator_platform_id = EXCLUDED.operator_platform_id, \
                           display_name = EXCLUDED.display_name, \
                           authorization_status = 'authorized', \
                           operator_authorization_status = 'authorized', \
                           last_authorized_at = EXCLUDED.last_authorized_at, \
                           updated_at = EXCLUDED.updated_at, \
                           version = iam_oauth_resource_account.version + 1 \
             RETURNING id",
        )
        .bind(format!("iamra-{}", uuid::Uuid::now_v7()))
        .bind(uuid::Uuid::now_v7().to_string())
        .bind(&grant.tenant_id)
        .bind(&grant.organization_id)
        .bind(&grant.integration_id)
        .bind(&grant.platform_id)
        .bind(&account_code)
        .bind(&grant.resource_account_kind)
        .bind(ACCESS_MODE_OPERATOR_AUTHORIZED)
        .bind(&grant.display_name)
        .bind(&grant.authorizer_app_id)
        .bind(&func_json)
        .bind(&now)
        .fetch_one(&mut *transaction)
        .await
        .map_err(store_error)?;

        let refresh_secret_ref = grant
            .authorizer_refresh_token
            .as_deref()
            .map(|refresh| encode_signing_secret_ref(refresh.as_bytes()));
        let authorization_info = json!({
            "componentAppId": grant.component_app_id,
            "authorizerAppId": grant.authorizer_app_id,
            "funcCategoryIds": grant.func_category_ids,
            "authorizerAccessTokenHash": grant.authorizer_access_token_hash,
        })
        .to_string();

        let active_authorization_id = sqlx::query_scalar::<_, String>(
            "SELECT id FROM iam_oauth_resource_authorization \
             WHERE operator_platform_id = $1 AND resource_account_id = $2 AND status = 'active' \
             FOR UPDATE",
        )
        .bind(&grant.platform_id)
        .bind(&resource_account_id)
        .fetch_optional(&mut *transaction)
        .await
        .map_err(store_error)?;

        let authorization_id = match active_authorization_id {
            Some(authorization_id) => {
                sqlx::query(
                    "UPDATE iam_oauth_resource_authorization SET \
                        authorization_mode = $1, \
                        authorization_code_hash = $2, \
                        authorizer_access_token_hash = $3, \
                        authorizer_refresh_token_secret_ref = $4, \
                        authorized_scopes_json = $5, \
                        func_info_json = $5, \
                        authorization_info_json = $6, \
                        authorizer_appid = $7, \
                        authorization_source = $1, \
                        authorized_at = $8, \
                        expires_at = $9, \
                        last_refreshed_at = $8, \
                        next_refresh_at = $10, \
                        updated_at = $8, \
                        version = version + 1 \
                     WHERE id = $11",
                )
                .bind(AUTHORIZATION_MODE_OPERATOR_CODE)
                .bind(&grant.authorization_code_hash)
                .bind(&grant.authorizer_access_token_hash)
                .bind(&refresh_secret_ref)
                .bind(&func_json)
                .bind(&authorization_info)
                .bind(&grant.authorizer_app_id)
                .bind(&now)
                .bind(&expires_at)
                .bind(&next_refresh_at)
                .bind(&authorization_id)
                .execute(&mut *transaction)
                .await
                .map_err(store_error)?;
                authorization_id
            }
            None => {
                let authorization_id = format!("iamoa-{}", uuid::Uuid::now_v7());
                sqlx::query(
                    "INSERT INTO iam_oauth_resource_authorization \
                        (id, uuid, tenant_id, organization_id, integration_id, \
                         resource_account_id, operator_platform_id, provider_code, \
                         authorization_mode, authorization_code_hash, \
                         authorizer_access_token_hash, authorizer_refresh_token_secret_ref, \
                         authorized_scopes_json, func_info_json, authorization_info_json, \
                         authorizer_appid, authorization_source, authorized_at, expires_at, \
                         last_refreshed_at, next_refresh_at, status, created_at, updated_at) \
                     VALUES ($1, $2, $3, $4, $5, $6, $7, 'wechat', $8, $9, $10, $11, \
                             $12, $12, $13, $14, $8, $15, $16, $15, $17, 'active', $15, $15)",
                )
                .bind(&authorization_id)
                .bind(uuid::Uuid::now_v7().to_string())
                .bind(&grant.tenant_id)
                .bind(&grant.organization_id)
                .bind(&grant.integration_id)
                .bind(&resource_account_id)
                .bind(&grant.platform_id)
                .bind(AUTHORIZATION_MODE_OPERATOR_CODE)
                .bind(&grant.authorization_code_hash)
                .bind(&grant.authorizer_access_token_hash)
                .bind(&refresh_secret_ref)
                .bind(&func_json)
                .bind(&authorization_info)
                .bind(&grant.authorizer_app_id)
                .bind(&now)
                .bind(&expires_at)
                .bind(&next_refresh_at)
                .execute(&mut *transaction)
                .await
                .map_err(store_error)?;
                authorization_id
            }
        };
        transaction.commit().await.map_err(store_error)?;
        Ok(CompletedAuthorization {
            resource_account_id,
            authorization_id,
            authorizer_app_id: grant.authorizer_app_id.clone(),
            func_category_ids: grant.func_category_ids.clone(),
            refresh_token_present: grant.authorizer_refresh_token.is_some(),
            expires_at: grant.expires_at,
        })
    }
}

fn sha256_hex(value: &str) -> String {
    let digest = Sha256::digest(value.as_bytes());
    format!("{digest:x}")
}

fn store_error(error: sqlx::Error) -> WechatComponentGrantError {
    WechatComponentGrantError::Store(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::wechat_component_api::AuthorizationFuncScope;

    fn config() -> ComponentPlatformConfig {
        ComponentPlatformConfig {
            platform_id: "platform-1".to_string(),
            tenant_id: "tenant-1".to_string(),
            organization_id: "0".to_string(),
            integration_id: "integration-1".to_string(),
            component_app_id: "wxcomponent".to_string(),
            component_app_secret: "secret".to_string(),
            component_verify_ticket: "ticket".to_string(),
            platform_type: "platform".to_string(),
        }
    }

    fn authorization(refresh: Option<&str>, expires_in: i64) -> AuthorizerAuthorization {
        AuthorizerAuthorization {
            authorizer_app_id: "wxauthorizer".to_string(),
            authorizer_access_token: "authorizer-token".to_string(),
            expires_in,
            authorizer_refresh_token: refresh.map(str::to_string),
            func_scopes: vec![
                AuthorizationFuncScope { category_id: 18 },
                AuthorizationFuncScope { category_id: 30 },
            ],
        }
    }

    #[test]
    fn records_hashes_instead_of_tokens() {
        let grant = build_authorizer_grant(
            &config(),
            RESOURCE_ACCOUNT_KIND_MINI_PROGRAM,
            None,
            "auth-code",
            &authorization(Some("refresh-token"), 7200),
            1_700_000_000,
        )
        .expect("grant");
        assert_eq!(grant.authorizer_app_id, "wxauthorizer");
        assert_eq!(grant.display_name, "wxauthorizer");
        assert_ne!(grant.authorization_code_hash, "auth-code");
        assert_ne!(grant.authorizer_access_token_hash, "authorizer-token");
        assert_eq!(grant.authorization_code_hash.len(), 64);
        assert_eq!(grant.func_category_ids, vec![18, 30]);
        assert_eq!(grant.authorized_at, 1_700_000_000);
        assert_eq!(grant.expires_at, 1_700_007_200);
        assert_eq!(grant.next_refresh_at, 1_700_006_600);
    }

    #[test]
    fn keeps_a_missing_refresh_token_visible() {
        let grant = build_authorizer_grant(
            &config(),
            RESOURCE_ACCOUNT_KIND_OFFICIAL_ACCOUNT,
            Some("  My Account  "),
            "auth-code",
            &authorization(None, 7200),
            1_700_000_000,
        )
        .expect("grant");
        assert!(grant.authorizer_refresh_token.is_none());
        assert_eq!(grant.display_name, "My Account");
    }

    #[test]
    fn rejects_unsupported_resource_kinds_and_empty_codes() {
        assert!(matches!(
            build_authorizer_grant(
                &config(),
                "open_app",
                None,
                "auth-code",
                &authorization(None, 7200),
                0
            ),
            Err(WechatComponentGrantError::InvalidResourceKind(_))
        ));
        assert_eq!(
            build_authorizer_grant(
                &config(),
                RESOURCE_ACCOUNT_KIND_MINI_PROGRAM,
                None,
                "  ",
                &authorization(None, 7200),
                0
            ),
            Err(WechatComponentGrantError::InvalidAuthorizationCode)
        );
    }

    #[test]
    fn keeps_the_refresh_schedule_sane_for_short_lived_tokens() {
        let grant = build_authorizer_grant(
            &config(),
            RESOURCE_ACCOUNT_KIND_MINI_PROGRAM,
            None,
            "auth-code",
            &authorization(Some("refresh"), 120),
            1_000,
        )
        .expect("grant");
        assert_eq!(grant.expires_at, 1_120);
        assert_eq!(grant.next_refresh_at, 1_060);
    }
}
