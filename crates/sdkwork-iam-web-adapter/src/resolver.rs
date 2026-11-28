use async_trait::async_trait;
use sdkwork_database_sqlx::DatabasePool;
use sdkwork_web_core::{
    default_open_api_bearer_classifier, DefaultAccessTokenParser, DefaultApiKeyParser,
    DefaultAuthTokenParser, DefaultOAuthBearerParser, DefaultOpenApiWebRequestContextResolver,
    DefaultWebRequestContextResolver, JwtProductionClaimPolicy, OpenApiCredentialKind,
    OpenApiWebRequestParserResolver, ResolverProductionProfile, WebFrameworkError,
    WebRequestContextResolver, WebRequestPrincipal,
};
use sqlx::PgPool;
use std::sync::Arc;

use crate::api_key_lookup::IamApiKeyLookupService;
use crate::application_access_token::try_resolve_application_access_token_context;
use crate::application_scope::ApplicationOwnershipScope;
use crate::dev_runtime::allows_dev_authentication_fallback;
use crate::iam_session::{
    resolve_iam_app_context_from_access_token, resolve_iam_app_context_from_access_token_pool,
    resolve_iam_app_context_from_auth_token, resolve_iam_app_context_from_dual_tokens,
    resolve_iam_app_context_from_dual_tokens_pool, resolve_iam_app_context_from_oauth_bearer,
    resolve_iam_app_context_from_oauth_bearer_pool,
};
use crate::oauth_token_lookup::IamOAuthTokenLookupService;

type IamDatabaseOpenApiResolver = OpenApiWebRequestParserResolver<
    DefaultAuthTokenParser,
    DefaultAccessTokenParser,
    DefaultApiKeyParser,
    IamApiKeyLookupService,
    DefaultOAuthBearerParser,
    IamOAuthTokenLookupService,
>;

#[derive(Clone)]
pub struct IamDatabaseWebRequestContextResolver {
    iam_database_pool: Option<DatabasePool>,
    iam_pool: Option<Arc<PgPool>>,
    open_api_database: Option<IamDatabaseOpenApiResolver>,
    open_api_dev_fallback: DefaultOpenApiWebRequestContextResolver,
    jwt_fallback: DefaultWebRequestContextResolver,
    production_claim_policy: Option<JwtProductionClaimPolicy>,
}

/// Alias documenting IAM open-api multi-scheme resolver wiring.
pub type IamOpenApiWebRequestContextResolver = IamDatabaseWebRequestContextResolver;
/// Canonical default resolver for application integration.
pub type IamWebRequestContextResolver = IamDatabaseWebRequestContextResolver;

impl IamDatabaseWebRequestContextResolver {
    pub fn new(iam_pool: Option<Arc<PgPool>>) -> Self {
        let open_api_database = iam_pool.as_ref().map(|pool| {
            OpenApiWebRequestParserResolver::new(
                DefaultAuthTokenParser,
                DefaultAccessTokenParser,
                DefaultApiKeyParser,
                IamApiKeyLookupService::new(pool.clone()),
                DefaultOAuthBearerParser,
                IamOAuthTokenLookupService::new(pool.clone()),
            )
        });
        Self {
            iam_database_pool: None,
            iam_pool,
            open_api_database,
            open_api_dev_fallback: DefaultOpenApiWebRequestContextResolver::default(),
            jwt_fallback: DefaultWebRequestContextResolver::default(),
            production_claim_policy: None,
        }
    }

    pub fn from_database_pool(iam_database_pool: Option<DatabasePool>) -> Self {
        let iam_pool = iam_database_pool
            .as_ref()
            .and_then(DatabasePool::as_postgres)
            .cloned()
            .map(Arc::new);
        let mut resolver = Self::new(iam_pool);
        resolver.iam_database_pool = iam_database_pool;
        resolver
    }

    pub fn try_with_saas_production_claim_policy(
        mut self,
        policy: JwtProductionClaimPolicy,
    ) -> Result<Self, String> {
        if self.iam_pool.is_none() {
            return Err(
                "production IAM resolver requires an authoritative PostgreSQL pool".to_owned(),
            );
        }
        if !policy.has_saas_issuer_audience_allowlist() {
            return Err(
                "production IAM resolver requires non-empty issuer and audience allowlists"
                    .to_owned(),
            );
        }
        if !policy
            .expected_issuers
            .iter()
            .any(|issuer| issuer == crate::iam_session::LOCAL_SESSION_TOKEN_ISSUER)
        {
            return Err(format!(
                "production IAM issuer allowlist must include {}",
                crate::iam_session::LOCAL_SESSION_TOKEN_ISSUER,
            ));
        }
        self.production_claim_policy = Some(policy);
        Ok(self)
    }

    /// The audience allow-list is the host's own application identity. For a
    /// deployment access credential that identity is the installation's deploy
    /// application id (migration 0040), because the signed token's `app_id` and
    /// `aud` are both the deploy application. A host that only allows its IAM
    /// runtime app id therefore rejects a deployment credential instead of
    /// accepting the retired IAM application identity.
    fn validate_production_principal(
        &self,
        principal: WebRequestPrincipal,
    ) -> Result<WebRequestPrincipal, WebFrameworkError> {
        let Some(policy) = &self.production_claim_policy else {
            return Ok(principal);
        };
        if policy
            .expected_audiences
            .iter()
            .any(|audience| audience == principal.app_id())
        {
            Ok(principal)
        } else {
            Err(WebFrameworkError::invalid_credentials(
                "IAM credential audience is not allowed for this application host",
            ))
        }
    }

    /// Attaches the release scope of the application the credential names.
    ///
    /// `APPLICATION_IDENTITY_SPEC.md` §4.1: the scope is a property of the
    /// installation, and a data plane needs it to choose the isolation key
    /// (`(tenant_id, app_id)` versus the organization or user tuple). It is read
    /// from the installation — never from the caller — through the small
    /// positive cache, because the value is immutable for the installation's
    /// lifetime.
    ///
    /// When the anchor names no installation the credential is not a deployment
    /// credential (an IAM platform application, a framework-default parser's
    /// token): the legacy tenant/organization derivation is attached instead, and
    /// `USER` is never inferred.
    async fn with_application_scope(
        &self,
        mut principal: WebRequestPrincipal,
    ) -> Result<WebRequestPrincipal, WebFrameworkError> {
        let Some(pool) = self.iam_pool.as_deref() else {
            return Ok(principal);
        };
        if principal.subject.subject_type == sdkwork_web_core::WebSubjectType::User {
            crate::application_enterprise_order::ensure_user_enterprise_authorization(
                pool,
                principal.tenant_id(),
                principal.organization_id().unwrap_or("0"),
                principal.user_id(),
                principal.app_id(),
            )
            .await
            .map_err(|error| {
                tracing::warn!(
                    tenant_id = %principal.tenant_id(),
                    app_id = %principal.app_id(),
                    error = %error,
                    "IAM enterprise authorization rejected the credential",
                );
                WebFrameworkError::forbidden(error)
            })?;
        }
        let tenant_id = principal.tenant_id().to_owned();
        let app_id = principal.app_id().to_owned();
        match crate::application_registry::resolve_installation_ownership_scope(
            pool, &tenant_id, &app_id,
        )
        .await
        {
            Ok(Some(scope)) => {
                principal.app.ownership_scope = Some(scope.as_str().to_owned());
                Ok(principal)
            }
            Ok(None) => {
                let scope = ApplicationOwnershipScope::derive_from_organization_scope(
                    principal.organization_id(),
                );
                principal.app.ownership_scope = Some(scope.as_str().to_owned());
                Ok(principal)
            }
            Err(error) => {
                // A principal whose release scope cannot be read cannot be
                // filtered correctly, so it is rejected instead of being
                // authorized against a guessed tenant-wide key.
                tracing::warn!(
                    tenant_id = %tenant_id,
                    app_id = %app_id,
                    error = %error,
                    "IAM application release scope resolution failed",
                );
                Err(WebFrameworkError::invalid_credentials(
                    "IAM application release scope is unavailable for this credential",
                ))
            }
        }
    }

    /// Validates the production audience policy and attaches the application
    /// release scope.
    async fn authorize_principal(
        &self,
        principal: WebRequestPrincipal,
    ) -> Result<WebRequestPrincipal, WebFrameworkError> {
        let principal = self.validate_production_principal(principal)?;
        self.with_application_scope(principal).await
    }

    /// Projects a verified IAM context into the framework principal.
    async fn project_context(
        &self,
        context: sdkwork_iam_context_service::IamAppContext,
    ) -> Result<WebRequestPrincipal, WebFrameworkError> {
        self.authorize_principal(web_request_principal_from_iam(context))
            .await
    }

    /// Resolves a login `authToken` presented on the API-key channel.
    ///
    /// Only a credential that carries no API-key prefix enters this channel: a
    /// prefixed value is an API key by convention and is never looked up as a
    /// session. `Ok(None)` means "not a session credential", so the caller falls
    /// through to the API-key store rather than failing a request that an
    /// unprefixed key record could still serve.
    async fn resolve_login_token_credential(
        &self,
        raw_credential: &str,
    ) -> Result<Option<WebRequestPrincipal>, WebFrameworkError> {
        if is_api_key_credential(raw_credential) {
            return Ok(None);
        }
        let Some(pg) = self.iam_session_pool() else {
            return Ok(None);
        };
        let Some(context) = resolve_iam_app_context_from_auth_token(pg, raw_credential).await
        else {
            return Ok(None);
        };
        self.project_context(context).await.map(Some)
    }

    /// The PostgreSQL pool that owns the `iam_session` rows, when this
    /// composition has one.
    fn iam_session_pool(&self) -> Option<&PgPool> {
        self.iam_database_pool
            .as_ref()
            .and_then(DatabasePool::as_postgres)
            .or_else(|| self.iam_pool.as_deref())
    }

    /// Resolves a public application access token on the Access-Token channel.
    ///
    /// `APP_ACCESS_TOKEN_SPEC.md` §5: the credential is isolation-only input and
    /// is accepted only here — the auth and dual-token channels keep their
    /// verified-session contract, so a public application token is never
    /// promoted into a session. A `USER`-scoped installation contributes its
    /// owner as the credential subject (`APPLICATION_IDENTITY_SPEC.md` §4.1
    /// rule 10), and a token bound to any other subject is rejected.
    ///
    /// A rejection is final: the credential *is* an application token, so it is
    /// not handed to the development payload-only fallback. That fallback exists
    /// for a host without an IAM database, and letting it authorize a credential
    /// whose owner binding just failed would turn a fail-closed rejection into an
    /// anonymous acceptance.
    async fn resolve_public_application_token(
        &self,
        pg: &PgPool,
        raw_access_token: &str,
    ) -> Result<Option<WebRequestPrincipal>, WebFrameworkError> {
        match try_resolve_application_access_token_context(pg, raw_access_token).await {
            Ok(Some(context)) => Ok(Some(self.project_context(context).await?)),
            Ok(None) => Ok(None),
            Err(error) => {
                tracing::warn!(
                    error = %error,
                    "public application access token rejected",
                );
                Err(WebFrameworkError::invalid_credentials(
                    "invalid or expired IAM access token",
                ))
            }
        }
    }
}

fn iam_database_unavailable_error() -> WebFrameworkError {
    WebFrameworkError::invalid_credentials(
        "IAM database session resolution is unavailable in this deployment",
    )
}

#[async_trait]
impl WebRequestContextResolver for IamDatabaseWebRequestContextResolver {
    fn resolver_production_profile(&self) -> ResolverProductionProfile {
        if self.production_claim_policy.is_some() {
            ResolverProductionProfile::TenantBoundSaaS
        } else {
            ResolverProductionProfile::Unspecified
        }
    }

    fn jwt_production_claim_policy(&self) -> Option<JwtProductionClaimPolicy> {
        self.production_claim_policy.clone()
    }

    /// Resolves the API-key channel of an open-api request.
    ///
    /// The open-api surfaces publish ONE credential header and accept either
    /// credential kind on it: a platform API key (`sk-`/`sp-` prefixed) or a
    /// signed-in user's login `authToken`. The login-token alternative is
    /// resolved here rather than in each host's resolver wrapper, so every
    /// composition that mounts this resolver (the platform cloud gateway, a
    /// standalone application gateway, a single crate's served router) answers
    /// the same request the same way.
    async fn resolve_api_key(
        &self,
        raw_api_key: &str,
    ) -> Result<WebRequestPrincipal, WebFrameworkError> {
        if let Some(principal) = self.resolve_login_token_credential(raw_api_key).await? {
            return Ok(principal);
        }
        if let Some(resolver) = &self.open_api_database {
            return self
                .authorize_principal(resolver.resolve_api_key(raw_api_key).await?)
                .await;
        }
        if allows_dev_authentication_fallback() {
            return self
                .open_api_dev_fallback
                .resolve_api_key(raw_api_key)
                .await;
        }
        Err(iam_database_unavailable_error())
    }

    async fn resolve_oauth_bearer(
        &self,
        raw_bearer_token: &str,
    ) -> Result<WebRequestPrincipal, WebFrameworkError> {
        if let Some(resolver) = &self.open_api_database {
            return self
                .authorize_principal(resolver.resolve_oauth_bearer(raw_bearer_token).await?)
                .await;
        }
        if let Some(pool) = &self.iam_database_pool {
            if let Some(context) =
                resolve_iam_app_context_from_oauth_bearer_pool(pool, raw_bearer_token).await
            {
                return self.project_context(context).await;
            }
            if allows_dev_authentication_fallback() {
                return self
                    .open_api_dev_fallback
                    .resolve_oauth_bearer(raw_bearer_token)
                    .await;
            }
            return Err(WebFrameworkError::invalid_credentials(
                "invalid or expired IAM OAuth bearer token",
            ));
        }
        if let Some(pool) = &self.iam_pool {
            if let Some(context) =
                resolve_iam_app_context_from_oauth_bearer(pool, raw_bearer_token).await
            {
                return self.project_context(context).await;
            }
            return Err(WebFrameworkError::invalid_credentials(
                "invalid or expired IAM OAuth bearer token",
            ));
        }
        if allows_dev_authentication_fallback() {
            return self
                .open_api_dev_fallback
                .resolve_oauth_bearer(raw_bearer_token)
                .await;
        }
        Err(iam_database_unavailable_error())
    }

    /// Auth-token channel for [`RouteAuth::OpenApiBearerFlexible`]: a single
    /// bearer credential that is not an API key is resolved to the IAM user
    /// identity through the login session that issued it.
    ///
    /// The login `authToken` and an OAuth access token are distinct secrets of
    /// the same `iam_session` row (`auth_token_hash` versus
    /// `access_token_hash`), so the login token is looked up first. A credential
    /// that names no login session keeps resolving on the OAuth channel, which
    /// is where a public OAuth access token belongs.
    async fn resolve_bearer_auth_token(
        &self,
        raw_bearer_token: &str,
    ) -> Result<WebRequestPrincipal, WebFrameworkError> {
        if let Some(pg) = self.iam_session_pool() {
            if let Some(context) =
                resolve_iam_app_context_from_auth_token(pg, raw_bearer_token).await
            {
                return self.project_context(context).await;
            }
        }
        self.resolve_oauth_bearer(raw_bearer_token).await
    }

    async fn resolve_dual_token(
        &self,
        raw_auth_token: &str,
        raw_access_token: &str,
    ) -> Result<WebRequestPrincipal, WebFrameworkError> {
        if let Some(pool) = &self.iam_database_pool {
            return match resolve_iam_app_context_from_dual_tokens_pool(
                pool,
                raw_auth_token,
                raw_access_token,
            )
            .await
            {
                Some(context) => self.project_context(context).await,
                None => Err(WebFrameworkError::invalid_credentials(
                    "invalid or expired IAM session",
                )),
            };
        }
        let Some(pool) = &self.iam_pool else {
            if allows_dev_authentication_fallback() {
                return self
                    .jwt_fallback
                    .resolve_dual_token(raw_auth_token, raw_access_token)
                    .await;
            }
            return Err(iam_database_unavailable_error());
        };

        match resolve_iam_app_context_from_dual_tokens(pool, raw_auth_token, raw_access_token).await
        {
            Some(context) => self.project_context(context).await,
            None => Err(WebFrameworkError::invalid_credentials(
                "invalid or expired IAM session",
            )),
        }
    }

    async fn resolve_access_token(
        &self,
        raw_access_token: &str,
    ) -> Result<WebRequestPrincipal, WebFrameworkError> {
        if let Some(pool) = &self.iam_database_pool {
            if let Some(context) =
                resolve_iam_app_context_from_access_token_pool(pool, raw_access_token).await
            {
                return self.project_context(context).await;
            }
            // Public application access token (`token_class:application`): the
            // spec resolves it from its claims and the enabled tenant
            // application registry, never from a persisted session row
            // (`APP_ACCESS_TOKEN_SPEC.md` section 5). This is the credential the
            // packaged renderer carries before any interactive session exists.
            if let Some(pg) = pool.as_postgres() {
                if let Some(principal) = self
                    .resolve_public_application_token(pg, raw_access_token)
                    .await?
                {
                    return Ok(principal);
                }
            }
            if allows_dev_authentication_fallback() {
                return self
                    .jwt_fallback
                    .resolve_access_token(raw_access_token)
                    .await;
            }
            return Err(WebFrameworkError::invalid_credentials(
                "invalid or expired IAM access token",
            ));
        }
        if let Some(pool) = &self.iam_pool {
            if let Some(context) =
                resolve_iam_app_context_from_access_token(pool, raw_access_token).await
            {
                return self.project_context(context).await;
            }
            if let Some(principal) = self
                .resolve_public_application_token(pool.as_ref(), raw_access_token)
                .await?
            {
                return Ok(principal);
            }
            if allows_dev_authentication_fallback() {
                return self
                    .jwt_fallback
                    .resolve_access_token(raw_access_token)
                    .await;
            }
            return Err(WebFrameworkError::invalid_credentials(
                "invalid or expired IAM access token",
            ));
        }
        if allows_dev_authentication_fallback() {
            return self
                .jwt_fallback
                .resolve_access_token(raw_access_token)
                .await;
        }
        Err(iam_database_unavailable_error())
    }
}

/// Whether one credential presented on the API-key channel is an API key
/// (conventionally `sk-`/`sp-` prefixed) rather than a login `authToken`.
///
/// The classify rule is the framework's own, not a copy: the platform gateway
/// and Cloud Router segment the same credential value with the same classifier,
/// so a credential can never be an API key on one hop and a session on the next.
fn is_api_key_credential(raw_credential: &str) -> bool {
    matches!(
        default_open_api_bearer_classifier().classify(raw_credential),
        OpenApiCredentialKind::ApiKey
    )
}

pub fn web_request_principal_from_iam(
    context: sdkwork_iam_context_service::IamAppContext,
) -> WebRequestPrincipal {
    use sdkwork_iam_context_service::{
        AuthLevel, DeploymentMode, Environment, IamPrincipalKind, LoginScope,
    };
    let subject_type = match context.principal_kind {
        IamPrincipalKind::User => sdkwork_web_core::WebSubjectType::User,
        IamPrincipalKind::ServiceAccount => sdkwork_web_core::WebSubjectType::Service,
    };
    WebRequestPrincipal::builder()
        .tenant_id(context.tenant_id)
        .organization_id(context.organization_id)
        .login_scope(match context.login_scope {
            LoginScope::Tenant => sdkwork_web_core::WebLoginScope::Tenant,
            LoginScope::Organization => sdkwork_web_core::WebLoginScope::Organization,
        })
        .user_id(context.user_id)
        .session_id(Some(context.session_id))
        .app_id(context.app_id)
        .environment(match context.environment {
            Environment::Dev => sdkwork_web_core::WebEnvironment::Dev,
            Environment::Test => sdkwork_web_core::WebEnvironment::Test,
            Environment::Prod => sdkwork_web_core::WebEnvironment::Prod,
        })
        .deployment_mode(match context.deployment_mode {
            DeploymentMode::Saas => sdkwork_web_core::WebDeploymentMode::Saas,
            DeploymentMode::Local => sdkwork_web_core::WebDeploymentMode::Local,
            DeploymentMode::Private => sdkwork_web_core::WebDeploymentMode::Private,
        })
        .auth_level(match context.auth_level {
            AuthLevel::Anonymous => sdkwork_web_core::WebAuthLevel::Anonymous,
            AuthLevel::Password => sdkwork_web_core::WebAuthLevel::Password,
            AuthLevel::Mfa => sdkwork_web_core::WebAuthLevel::Mfa,
            AuthLevel::System => sdkwork_web_core::WebAuthLevel::System,
        })
        .data_scope(context.data_scope)
        .permission_scope(context.permission_scope)
        .subject_type(subject_type)
        // The display-name snapshot is already resolved by the IAM session
        // lookup (zero extra queries); downstream audit/log projections persist
        // it so request logs stay readable after user records change.
        .display_name(if context.display_name.is_empty() {
            None
        } else {
            Some(context.display_name)
        })
        .build()
}

pub(crate) fn iam_principal_record_from_context(
    context: &sdkwork_iam_context_service::IamAppContext,
    credential: &sdkwork_web_core::OAuthBearerCredential,
) -> sdkwork_web_core::OAuthPrincipalRecord {
    let principal = web_request_principal_from_iam(context.clone());
    sdkwork_web_core::OAuthPrincipalRecord {
        token_id: credential
            .metadata
            .get("jti")
            .cloned()
            .or_else(|| credential.metadata.get("token_id").cloned())
            .unwrap_or_else(|| context.session_id.clone()),
        client_id: credential.client_id.clone(),
        tenant_id: principal.tenant_id().to_owned(),
        organization_id: principal.organization_id().map(str::to_owned),
        user_id: principal.user_id().to_owned(),
        app_id: principal.app_id().to_owned(),
        environment: principal.app.environment,
        deployment_mode: principal.app.deployment_mode,
        data_scope: principal.scopes.data_scope.clone(),
        permission_scope: principal.scopes.permission_scope.clone(),
        subject_type: Some(
            match context.principal_kind {
                sdkwork_iam_context_service::IamPrincipalKind::User => "user",
                sdkwork_iam_context_service::IamPrincipalKind::ServiceAccount => "service",
            }
            .to_owned(),
        ),
        metadata: credential.metadata.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn production_policy() -> JwtProductionClaimPolicy {
        JwtProductionClaimPolicy::saas_production(
            vec![crate::iam_session::LOCAL_SESSION_TOKEN_ISSUER.to_owned()],
            vec!["sdkwork-community".to_owned()],
        )
    }

    #[test]
    fn production_profile_requires_an_authoritative_pool() {
        let error = IamDatabaseWebRequestContextResolver::new(None)
            .try_with_saas_production_claim_policy(production_policy())
            .err()
            .expect("missing pool must fail closed");
        assert!(error.contains("PostgreSQL pool"));
    }

    #[tokio::test]
    async fn production_profile_reports_session_revocation_and_claim_policy() {
        let pool = sqlx::postgres::PgPoolOptions::new()
            .connect_lazy("postgresql://sdkwork@127.0.0.1/sdkwork")
            .expect("lazy PostgreSQL pool");
        let resolver = IamDatabaseWebRequestContextResolver::new(Some(Arc::new(pool)))
            .try_with_saas_production_claim_policy(production_policy())
            .expect("production resolver");

        assert_eq!(
            ResolverProductionProfile::TenantBoundSaaS,
            resolver.resolver_production_profile(),
        );
        assert!(resolver
            .jwt_production_claim_policy()
            .is_some_and(|policy| policy.has_saas_issuer_audience_allowlist()));
        assert!(!resolver.uses_default_api_key_lookup());
        assert!(!resolver.uses_default_oauth_token_lookup());
    }

    #[test]
    fn only_unprefixed_credentials_enter_the_login_token_channel() {
        // The API-key channel publishes one header for both credential kinds. The
        // separator is the framework's own classifier, so a credential can never
        // be an API key on one hop and a session on the next.
        assert!(is_api_key_credential("sk-live-123"));
        assert!(is_api_key_credential("sp-tenant-123"));
        assert!(!is_api_key_credential(
            "eyJhbGciOiJIUzI1NiJ9.payload.signature"
        ));
        // The development claim-string form is not a session credential either;
        // the API-key channel keeps resolving it after this channel declines it.
        assert!(!is_api_key_credential("api_key_id=key-1;tenant_id=100001"));
    }

    #[tokio::test]
    async fn api_key_channel_declines_a_login_token_when_no_session_store_is_wired() {
        // A composition with no PostgreSQL pool cannot look a session up. The
        // credential must fall through to the API-key channel instead of failing
        // on the absent store, so a keyless/dev composition keeps working.
        let resolver = IamDatabaseWebRequestContextResolver::new(None);
        assert!(resolver
            .resolve_login_token_credential("login-token-without-a-prefix")
            .await
            .expect("no store is not an error")
            .is_none());
        assert!(resolver
            .resolve_login_token_credential("sk-live-123")
            .await
            .expect("prefixed credentials never enter the channel")
            .is_none());
    }
}
