//! Authorization entry for a WeChat component.
//!
//! The admin surface needs one thing from the authorization flow: a URL the
//! customer opens to grant the component access. Producing it requires the
//! component's own credentials (to mint a component token), the current
//! verification ticket, and the pre-authorization code — none of which may be
//! assembled in an HTTP handler, because the credentials are encrypted in
//! `iam_oauth_secret` and the token is cached and single-flighted.
//!
//! This module is that assembly point. It deliberately stops before
//! `api_query_auth`: the callback that receives `auth_code` is a different
//! transaction with different failure modes (tenant claiming, token storage),
//! and mixing the two would make the URL path depend on the callback path.
//!
//! A customized-type third-party platform (AppID only, no secret) can never
//! mint a component token, so it is rejected before any provider call instead of
//! failing later with an opaque provider error.
use async_trait::async_trait;
use sqlx::{PgPool, Row};

use sdkwork_iam_bootstrap::decode_signing_secret_ref;

use crate::wechat_component_api::{
    authorization_entry_url, WechatComponentApi, WechatComponentApiError,
    WechatComponentAuthorizationScope, WechatComponentAuthorizationSurface,
    WechatComponentTransport,
};
use crate::wechat_component_token::{WechatComponentTokenError, WechatComponentTokenService};
use crate::wechat_component_token_pg::PgComponentTokenCache;

/// The `platform_type` value that can mint a component token.
pub const PLATFORM_TYPE_PLATFORM: &str = "platform";

/// The `platform_type` value that cannot call the API.
pub const PLATFORM_TYPE_CUSTOMIZED: &str = "customized";

/// One operator platform's authorization-relevant configuration.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ComponentPlatformConfig {
    /// Operator platform row id.
    pub platform_id: String,
    /// Owning tenant.
    pub tenant_id: String,
    /// Owning organization.
    pub organization_id: String,
    /// The IAM OAuth integration that owns this channel.
    pub integration_id: String,
    /// Component AppID.
    pub component_app_id: String,
    /// Decrypted component AppSecret.
    pub component_app_secret: String,
    /// Decrypted latest verification ticket.
    pub component_verify_ticket: String,
    /// `platform` or `customized`.
    pub platform_type: String,
}

/// The reader port for platform configuration.
#[async_trait]
pub trait ComponentPlatformConfigReader: Send + Sync {
    /// Loads one platform, or `None` when it does not exist.
    async fn load(
        &self,
        platform_id: &str,
    ) -> Result<Option<ComponentPlatformConfig>, WechatComponentAuthorizationError>;
}

/// The authorization entry handed to the admin surface.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ComponentAuthorizationEntry {
    /// URL to open or encode as a QR code.
    pub url: String,
    /// Provider-declared lifetime of the embedded pre-authorization code.
    pub pre_auth_code_expires_in: i64,
}

/// An authorization-entry failure.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum WechatComponentAuthorizationError {
    /// The platform id does not exist.
    PlatformNotFound(String),
    /// A customized-type platform cannot mint a component token.
    CustomizedPlatform(String),
    /// A required secret is missing from `iam_oauth_secret`.
    MissingSecret(&'static str),
    /// The redirect URI is not absolute.
    InvalidRedirect(String),
    /// The provider call failed.
    Api(WechatComponentApiError),
    /// The token cache failed.
    Token(WechatComponentTokenError),
    /// The configuration store failed.
    Store(String),
}

impl std::fmt::Display for WechatComponentAuthorizationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::PlatformNotFound(id) => write!(f, "operator platform {id} not found"),
            Self::CustomizedPlatform(id) => write!(
                f,
                "operator platform {id} is customized-type and cannot authorize accounts"
            ),
            Self::MissingSecret(kind) => {
                write!(f, "operator platform is missing the {kind} secret")
            }
            Self::InvalidRedirect(detail) => write!(f, "redirect uri is invalid: {detail}"),
            Self::Api(error) => write!(f, "provider call failed: {error}"),
            Self::Token(error) => write!(f, "component token failed: {error}"),
            Self::Store(detail) => write!(f, "platform configuration store failed: {detail}"),
        }
    }
}

impl std::error::Error for WechatComponentAuthorizationError {}

/// Inputs for one authorization-entry request.
#[derive(Clone, Copy, Debug)]
pub struct AuthorizationEntryRequest<'a> {
    /// Operator platform row id.
    pub platform_id: &'a str,
    /// Absolute URL that receives `auth_code`.
    pub redirect_uri: &'a str,
    /// PC scan page or mobile bind page.
    pub surface: WechatComponentAuthorizationSurface,
    /// Accepted resource kinds.
    pub scope: WechatComponentAuthorizationScope,
    /// Current Unix second.
    pub now: i64,
}

/// Builds the authorization entry for one operator platform.
///
/// @param reader - loads the platform credentials.
/// @param tokens - component-token service (cached, single-flighted).
/// @param api - component API client sharing the same transport type.
/// @param request - platform id, redirect URI, surface, scope, and clock.
pub async fn begin_authorization<R, T>(
    reader: &R,
    tokens: &WechatComponentTokenService<PgComponentTokenCache, T>,
    api: &WechatComponentApi<T>,
    request: &AuthorizationEntryRequest<'_>,
) -> Result<ComponentAuthorizationEntry, WechatComponentAuthorizationError>
where
    R: ComponentPlatformConfigReader,
    T: WechatComponentTransport,
{
    let config = reader.load(request.platform_id).await?.ok_or_else(|| {
        WechatComponentAuthorizationError::PlatformNotFound(request.platform_id.to_string())
    })?;
    validate_platform_for_authorization(&config)?;
    let token = tokens
        .resolve_single_flight(
            &config.component_app_id,
            &config.component_app_secret,
            &config.component_verify_ticket,
            request.now,
        )
        .await
        .map_err(WechatComponentAuthorizationError::Token)?;
    let pre_auth = api
        .create_pre_auth_code(&token.access_token, &config.component_app_id)
        .await
        .map_err(WechatComponentAuthorizationError::Api)?;
    let url = authorization_entry_url(
        request.surface,
        &config.component_app_id,
        &pre_auth.pre_auth_code,
        request.redirect_uri,
        request.scope,
    )
    .map_err(map_api_error)?;
    Ok(ComponentAuthorizationEntry {
        url,
        pre_auth_code_expires_in: pre_auth.expires_in,
    })
}

/// Pure guard used before any provider call.
pub fn validate_platform_for_authorization(
    config: &ComponentPlatformConfig,
) -> Result<(), WechatComponentAuthorizationError> {
    if config.platform_type.trim() == PLATFORM_TYPE_CUSTOMIZED {
        return Err(WechatComponentAuthorizationError::CustomizedPlatform(
            config.platform_id.clone(),
        ));
    }
    if config.component_app_id.trim().is_empty() {
        return Err(WechatComponentAuthorizationError::Store(
            "component appid is empty".to_string(),
        ));
    }
    if config.component_app_secret.trim().is_empty() {
        return Err(WechatComponentAuthorizationError::MissingSecret(
            "component_app_secret",
        ));
    }
    if config.component_verify_ticket.trim().is_empty() {
        return Err(WechatComponentAuthorizationError::MissingSecret(
            "component_verify_ticket",
        ));
    }
    Ok(())
}

fn map_api_error(error: WechatComponentApiError) -> WechatComponentAuthorizationError {
    match error {
        WechatComponentApiError::InvalidRequest(detail) => {
            WechatComponentAuthorizationError::InvalidRedirect(detail)
        }
        other => WechatComponentAuthorizationError::Api(other),
    }
}

/// PostgreSQL reader for operator-platform credentials.
pub struct PgComponentPlatformConfigReader {
    pool: PgPool,
}

impl PgComponentPlatformConfigReader {
    /// Builds the reader over the IAM database pool.
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ComponentPlatformConfigReader for PgComponentPlatformConfigReader {
    async fn load(
        &self,
        platform_id: &str,
    ) -> Result<Option<ComponentPlatformConfig>, WechatComponentAuthorizationError> {
        let row = sqlx::query(
            "SELECT op.id, op.tenant_id, op.organization_id, op.integration_id, \
                    op.component_appid, op.platform_type, \
                    app_secret.secret_ref AS app_secret_ref, \
                    ticket.secret_ref AS ticket_ref \
             FROM iam_oauth_operator_platform op \
             LEFT JOIN LATERAL ( \
                SELECT secret_ref FROM iam_oauth_secret \
                WHERE operator_platform_id = op.id \
                  AND secret_kind = 'component_app_secret' \
                  AND status = 'active' \
                ORDER BY active_from DESC, updated_at DESC, id DESC \
                LIMIT 1 \
             ) app_secret ON TRUE \
             LEFT JOIN LATERAL ( \
                SELECT secret_ref FROM iam_oauth_secret \
                WHERE operator_platform_id = op.id \
                  AND secret_kind = 'component_verify_ticket' \
                  AND status = 'active' \
                ORDER BY active_from DESC, updated_at DESC, id DESC \
                LIMIT 1 \
             ) ticket ON TRUE \
             WHERE op.id = $1",
        )
        .bind(platform_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| WechatComponentAuthorizationError::Store(error.to_string()))?;
        let Some(row) = row else {
            return Ok(None);
        };
        let app_secret_ref: Option<String> = row
            .try_get("app_secret_ref")
            .map_err(|error| WechatComponentAuthorizationError::Store(error.to_string()))?;
        let ticket_ref: Option<String> = row
            .try_get("ticket_ref")
            .map_err(|error| WechatComponentAuthorizationError::Store(error.to_string()))?;
        let app_secret = app_secret_ref.ok_or(WechatComponentAuthorizationError::MissingSecret(
            "component_app_secret",
        ))?;
        let ticket = ticket_ref.ok_or(WechatComponentAuthorizationError::MissingSecret(
            "component_verify_ticket",
        ))?;
        let app_secret = decode_secret(&app_secret, "component_app_secret")?;
        let ticket = decode_secret(&ticket, "component_verify_ticket")?;
        Ok(Some(ComponentPlatformConfig {
            platform_id: row
                .try_get("id")
                .map_err(|error| WechatComponentAuthorizationError::Store(error.to_string()))?,
            tenant_id: row
                .try_get("tenant_id")
                .map_err(|error| WechatComponentAuthorizationError::Store(error.to_string()))?,
            organization_id: row
                .try_get("organization_id")
                .map_err(|error| WechatComponentAuthorizationError::Store(error.to_string()))?,
            integration_id: row
                .try_get("integration_id")
                .map_err(|error| WechatComponentAuthorizationError::Store(error.to_string()))?,
            component_app_id: row
                .try_get("component_appid")
                .map_err(|error| WechatComponentAuthorizationError::Store(error.to_string()))?,
            component_app_secret: app_secret,
            component_verify_ticket: ticket,
            platform_type: row
                .try_get("platform_type")
                .map_err(|error| WechatComponentAuthorizationError::Store(error.to_string()))?,
        }))
    }
}

fn decode_secret(
    secret_ref: &str,
    kind: &'static str,
) -> Result<String, WechatComponentAuthorizationError> {
    let plaintext = decode_signing_secret_ref(secret_ref).map_err(|error| {
        WechatComponentAuthorizationError::Store(format!("decode {kind} failed: {error}"))
    })?;
    String::from_utf8(plaintext)
        .map_err(|_| WechatComponentAuthorizationError::Store(format!("{kind} is not utf-8")))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config(platform_type: &str) -> ComponentPlatformConfig {
        ComponentPlatformConfig {
            platform_id: "platform-1".to_string(),
            tenant_id: "tenant-1".to_string(),
            organization_id: "0".to_string(),
            integration_id: "integration-1".to_string(),
            component_app_id: "wxcomponent".to_string(),
            component_app_secret: "secret".to_string(),
            component_verify_ticket: "ticket".to_string(),
            platform_type: platform_type.to_string(),
        }
    }

    #[test]
    fn accepts_a_platform_component() {
        assert!(validate_platform_for_authorization(&config(PLATFORM_TYPE_PLATFORM)).is_ok());
    }

    #[test]
    fn rejects_a_customized_platform_before_any_provider_call() {
        let error = validate_platform_for_authorization(&config(PLATFORM_TYPE_CUSTOMIZED))
            .expect_err("customized platform must not authorize");
        assert!(matches!(
            error,
            WechatComponentAuthorizationError::CustomizedPlatform(_)
        ));
    }

    #[test]
    fn rejects_missing_credentials() {
        let mut missing_secret = config(PLATFORM_TYPE_PLATFORM);
        missing_secret.component_app_secret = "  ".to_string();
        assert!(matches!(
            validate_platform_for_authorization(&missing_secret),
            Err(WechatComponentAuthorizationError::MissingSecret(
                "component_app_secret"
            ))
        ));
        let mut missing_ticket = config(PLATFORM_TYPE_PLATFORM);
        missing_ticket.component_verify_ticket = String::new();
        assert!(matches!(
            validate_platform_for_authorization(&missing_ticket),
            Err(WechatComponentAuthorizationError::MissingSecret(
                "component_verify_ticket"
            ))
        ));
    }
}
