//! Admin-scoped delegated access token issuance for backend IAM operators.

use crate::application_registry::{
    intersect_permission_scopes, resolve_access_token_app_id,
    resolve_tenant_application, resolve_tenant_application_by_deploy_application_id,
};
use crate::application_scope::{
    ensure_requested_scope_matches_installation, ensure_subject_is_installation_owner,
    ApplicationOwnershipScope,
};
use crate::iam_database_env::resolve_iam_database_pool_from_env;
use crate::installation_lifecycle::ensure_installation_environment_active;
use crate::is_blank;
use crate::super_admin_auth::AccessTokenActor;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use hmac::{Hmac, Mac};
use rand_core::{OsRng, RngCore};
use sdkwork_iam_context_service::{
    AuthLevel, DeploymentMode, Environment, IamAppContext, LoginScope,
};
use sdkwork_web_core::stamp_token_version;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use sqlx::{types::Json, PgPool, Row};

use sdkwork_iam_bootstrap::resolve_session_scopes as bootstrap_resolve_session_scopes;

pub const IAM_ACCESS_CREDENTIALS_CREATE_PERMISSION: &str = "iam.access_credentials.create";

const LOCAL_TOKEN_TTL_SECONDS: u128 = 60 * 60;

/// Expiry sentinel for a credential that never expires.
///
/// The deployed portal receives the application access credential before any
/// interactive session exists; it is isolation material, not a session
/// lifetime, so its default expiry is `0` ("no expiry"). A non-zero TTL remains
/// available for operator-issued delegated credentials.
pub const NO_EXPIRY_EPOCH_SECONDS: i64 = 0;

fn no_expiry_timestamp() -> chrono::DateTime<chrono::Utc> {
    chrono::DateTime::<chrono::Utc>::UNIX_EPOCH
}

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccessCredentialCreateRequest {
    pub tenant_id: String,
    pub organization_id: String,
    /// IAM tenant application row selector.
    pub tenant_application_id: Option<String>,
    /// Installation deploy application anchor selector. Resolved against
    /// `iam_application_installation.deploy_application_id`; the IAM runtime app id is
    /// not accepted as a token subject.
    pub app_id: Option<String>,
    pub instance_key: Option<String>,
    /// Release scope the caller declares. It is a **declaration to be checked**,
    /// never a selector: the installation decides the level, and a value that
    /// disagrees with the installation fails closed
    /// (`APPLICATION_IDENTITY_SPEC.md` 搂4.1 rule 3).
    pub ownership_scope: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IssuedAccessCredential {
    pub access_credential: String,
    pub auth_token: String,
    pub session_id: String,
    pub tenant_id: String,
    pub organization_id: String,
    /// Subject written into the signed tokens' `app_id`/`aud`: the
    /// installation's deploy application id, mirroring `iam_session.app_id`.
    pub app_id: String,
    /// IAM tenant application row that issued the credential.
    pub tenant_application_id: String,
    /// Release scope the credential was signed for, read from the installation.
    pub ownership_scope: ApplicationOwnershipScope,
    /// Installation lifecycle environment the credential was gated on
    /// (`development`, `production`, ...). This is the exact key the
    /// installation registered, not the coarse token claim.
    pub environment: String,
    pub expires_at: String,
}

#[derive(Clone)]
pub(crate) struct TenantSigningKey {
    pub(crate) kid: String,
    pub(crate) secret: Vec<u8>,
}

pub fn principal_has_permission(permission_scope: &[String], permission: &str) -> bool {
    sdkwork_iam_context_service::has_permission_in_scope(permission_scope, permission)
}

pub fn parse_access_credential_create_request(
    body: &Value,
) -> Result<AccessCredentialCreateRequest, String> {
    let tenant_id = read_required_string(body, &["tenantId", "tenant_id"])?;
    let organization_id = read_required_string(body, &["organizationId", "organization_id"])?;
    let tenant_application_id =
        read_optional_string(body, &["tenantApplicationId", "tenant_application_id"]);
    let app_id = read_optional_string(body, &["appId", "app_id"]);
    let instance_key = read_optional_string(body, &["instanceKey", "instance_key"]);
    let ownership_scope = read_optional_string(body, &["ownershipScope", "ownership_scope"]);

    if tenant_application_id.is_none() && app_id.is_none() && instance_key.is_none() {
        return Err("tenantApplicationId, appId, or instanceKey is required".to_string());
    }

    Ok(AccessCredentialCreateRequest {
        tenant_id,
        organization_id,
        tenant_application_id,
        app_id,
        instance_key,
        ownership_scope,
    })
}

/// Resolves the installation an access-credential request addresses.
///
/// `appId` is the installation's deploy application anchor (the registration
/// plane speaks the same identity as the token), while
/// `tenantApplicationId`/`instanceKey` still address the row directly. Every
/// caller resolves through here so the backend operator path and the
/// user-facing application-token path cannot disagree about which installation a
/// request names.
pub async fn resolve_installation_for_access_credential(
    pg: &PgPool,
    tenant_id: &str,
    request: &AccessCredentialCreateRequest,
) -> Result<crate::application_registry::TenantApplication, String> {
    let tenant_application = match request
        .tenant_application_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        Some(tenant_application_id) => {
            resolve_tenant_application(pg, tenant_id, Some(tenant_application_id), None, None)
                .await?
        }
        None => match request
            .app_id
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            Some(deploy_application_id) => {
                resolve_tenant_application_by_deploy_application_id(
                    pg,
                    tenant_id,
                    deploy_application_id,
                )
                .await?
            }
            None => {
                resolve_tenant_application(
                    pg,
                    tenant_id,
                    None,
                    None,
                    request.instance_key.as_deref(),
                )
                .await?
            }
        },
    }
    .ok_or_else(|| {
        "tenant application was not found; register application and provision tenant application before issuing access credential".to_string()
    })?;
    Ok(tenant_application)
}

/// Issues a delegated access credential whose subject is the installation's
/// deploy application.
///
/// The IAM runtime `app_id` selects the tenant application row; the signed
/// token's `app_id`/`aud` are that row's `deploy_application_id`, so a host can
/// scope the credential to the deployment it serves. An installation without the
/// deploy link is rejected here rather than being signed with the IAM app id.
pub async fn issue_delegated_access_credential(
    pg: &PgPool,
    actor: &AccessTokenActor,
    request: &AccessCredentialCreateRequest,
) -> Result<IssuedAccessCredential, String> {
    issue_delegated_access_credential_for_environment(
        pg,
        actor,
        request,
        actor.environment.clone(),
        environment_to_string(&actor.environment),
    )
    .await
}

/// Issues a delegated access credential for an explicitly named installation
/// environment.
///
/// The credential's `environment` claim is the coarse [`Environment`] the session
/// plane understands, while the installation gate is evaluated against the exact
/// lifecycle key the installation registered (`development`, `production`, ...).
/// Splitting the two lets a caller initialize a credential for an installation
/// lifecycle that does not equal its own session environment 鈥?an operator whose
/// session is `prod` minting for a `development` installation, or a user
/// initializing the app they just registered, whose first environment is the
/// deployment default.
/// @param pg - IAM PostgreSQL pool.
/// @param actor - issuing actor (operator or signed-in user).
/// @param request - installation selectors and the scope declaration.
/// @param environment - coarse environment recorded in the token claims.
/// @param environment_key - exact installation environment to gate on.
/// @returns the signed access/auth pair and its session facts.
/// @throws String when the installation, scope, owner, or environment refuses.
pub async fn issue_delegated_access_credential_for_environment(
    pg: &PgPool,
    actor: &AccessTokenActor,
    request: &AccessCredentialCreateRequest,
    environment: Environment,
    environment_key: &str,
) -> Result<IssuedAccessCredential, String> {
    ensure_tenant_exists(pg, &request.tenant_id).await?;
    ensure_organization_exists(pg, &request.tenant_id, &request.organization_id).await?;

    let tenant_application =
        resolve_installation_for_access_credential(pg, &request.tenant_id, request).await?;

    if tenant_application.status != "enabled" {
        return Err(
            "tenant application must be enabled before issuing access credential".to_string(),
        );
    }
    // The installation is the authority for the release scope. A request that
    // declares another level is a contradiction, not a selector, and the
    // organization claim it declares must already agree with the installation.
    ensure_requested_scope_matches_installation(
        request.ownership_scope.as_deref(),
        tenant_application.ownership_scope,
    )?;
    if tenant_application.organization_id != request.organization_id {
        return Err("organizationId does not match tenant application".to_string());
    }
    // A personal release credentials exactly its owner: the credential's
    // `user_id` is the isolation key's last column, so any other subject would
    // read another person's partition of the same application.
    ensure_subject_is_installation_owner(
        tenant_application.ownership_scope,
        tenant_application.owner_user_id.as_deref(),
        &actor.user_id,
    )?;
    // Environment-scoped installations only issue credentials for a registered,
    // active environment. An installation without environment rows keeps the
    // historical behavior.
    ensure_installation_environment_active(
        pg,
        &request.tenant_id,
        &tenant_application.id,
        environment_key,
    )
    .await?;

    let scope = tenant_application.ownership_scope;
    let organization_id = match scope {
        ApplicationOwnershipScope::Organization => Some(request.organization_id.clone()),
        ApplicationOwnershipScope::Tenant | ApplicationOwnershipScope::User => None,
    };
    let (data_scope, actor_permission_scope) = resolve_session_scopes(
        pg,
        &request.tenant_id,
        &actor.user_id,
        organization_id.as_deref(),
    )
    .await?;
    let permission_scope = intersect_permission_scopes(
        &actor_permission_scope,
        &tenant_application.access_permissions,
    )?;
    // The token subject is the deploy application, not the tenant application's
    // IAM runtime id; an installation with no deploy link fails closed here.
    let app_id = resolve_access_token_app_id(&tenant_application)?;

    let session_id = generate_opaque_token("session");
    let now = chrono::Utc::now();
    let expires_at = now + chrono::Duration::seconds(LOCAL_TOKEN_TTL_SECONDS as i64);

    let context = IamAppContext::new(
        request.tenant_id.clone(),
        organization_id.as_deref(),
        actor.user_id.clone(),
        session_id.clone(),
        app_id.clone(),
        environment,
        actor.deployment_mode.clone(),
        AuthLevel::System,
        data_scope,
        permission_scope,
    );

    let signing_key = ensure_tenant_signing_key(pg, &request.tenant_id).await?;
    let access_token = sign_local_session_token(&signing_key, "access", &context, scope);
    let auth_token = sign_local_session_token(&signing_key, "auth", &context, scope);
    let refresh_token = generate_opaque_token("refresh");

    let auth_token_hash = hash_token(&auth_token);
    let access_token_hash = hash_token(&access_token);
    let refresh_token_hash = hash_token(&refresh_token);

    persist_signed_session(
        pg,
        &context,
        scope,
        &signing_key,
        &auth_token_hash,
        &access_token_hash,
        &refresh_token_hash,
        &expires_at,
        &now,
    )
    .await?;

    Ok(IssuedAccessCredential {
        access_credential: access_token,
        auth_token,
        session_id,
        tenant_id: request.tenant_id.clone(),
        organization_id: request.organization_id.clone(),
        app_id,
        tenant_application_id: tenant_application.id.clone(),
        ownership_scope: scope,
        environment: environment_key.to_owned(),
        expires_at: expires_at.to_rfc3339(),
    })
}

/// Issues a signed bootstrap Access-Token for standalone/container deployments.
///
/// Deployment order is executed here so first boot is fully automatic:
/// 1. the tenant application must be provisioned and enabled (the installer
///    creates it), 2. the bootstrap system user is ensured, 3. the **tenant
///    signing key is ensured** 鈥?created on first boot, which is the "update
///    the tenant secret" step, 4. a signed JWT is issued with the tenant
///    application's access permissions as the token scope, 5. the session is
///    persisted. The gateway then resolves the token through the verified
///    database path (signature + tenant binding + scope), never through the
///    payload-only development fallback.
///
/// `app_id` is the installation's deploy application anchor. The credential's
/// `app_id`/`aud` are that anchor, and an installation that is not linked to a
/// deploy application fails closed instead of being signed with an IAM runtime
/// app id.
pub async fn issue_standalone_bootstrap_access_credential(
    pg: &PgPool,
    tenant_id: &str,
    app_id: &str,
    ttl_seconds: Option<u64>,
) -> Result<IssuedAccessCredential, String> {
    ensure_tenant_exists(pg, tenant_id).await?;

    let tenant_application =
        resolve_tenant_application_by_deploy_application_id(pg, tenant_id, app_id)
            .await?
            .ok_or_else(|| {
                format!(
                    "deploy application {app_id} is not bound to an installation of tenant {tenant_id}"
                )
            })?;
    if tenant_application.status != "enabled" {
        return Err(format!(
            "tenant application {app_id} must be enabled before issuing a bootstrap access credential"
        ));
    }
    // Bootstrap issuance is a token issuance path too: a registered installation
    // only accepts its active environments. An installation without environment
    // rows keeps the platform-bootstrap compatibility path.
    let environment = bootstrap_environment();
    ensure_installation_environment_active(
        pg,
        tenant_id,
        &tenant_application.id,
        environment_to_string(&environment),
    )
    .await?;
    // The token subject is the installation's deploy application. Without the
    // link there is no deployment to name, so issuance fails closed.
    let token_app_id = resolve_access_token_app_id(&tenant_application)?;
    let scope = tenant_application.ownership_scope;
    // A personal release is one person's deployment: its ambient credential is
    // issued for 鈥?and only for 鈥?the recorded owner, because the owner is the
    // last column of that installation's isolation key. Issuing it for the
    // synthetic bootstrap user would file every row it writes under a user id
    // nobody owns. The owner must be a real active user of the tenant, so a
    // deactivated owner stops the deployment from authenticating instead of
    // leaving an orphan credential behind.
    let subject_user_id = match scope {
        ApplicationOwnershipScope::User => {
            let owner_user_id = tenant_application
                .owner_user_id
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .ok_or_else(|| {
                    format!(
                        "USER-scoped installation {} has no ownerUserId and cannot issue a bootstrap credential",
                        tenant_application.id
                    )
                })?;
            ensure_active_bootstrap_owner(pg, tenant_id, owner_user_id).await?;
            owner_user_id.to_owned()
        }
        ApplicationOwnershipScope::Tenant | ApplicationOwnershipScope::Organization => {
            ensure_bootstrap_system_user(pg, tenant_id).await?;
            "system".to_owned()
        }
    };

    let organization_id = scope.organization_claim(&tenant_application.organization_id).to_owned();
    // The bootstrap credential projects the same isolation keys a session does:
    // an organization-level installation binds its organization beside the
    // tenant, so a data plane filtering by data scope cannot read the whole
    // tenant (`APP_ACCESS_TOKEN_SPEC.md` §5, `DATABASE_SPEC.md` §16).
    let mut data_scope = vec![format!("tenant:{tenant_id}"), format!("user:{subject_user_id}")];
    if scope == ApplicationOwnershipScope::Organization {
        data_scope.push(format!("organization:{organization_id}"));
    }
    let session_id = generate_opaque_token("session");
    let now = chrono::Utc::now();
    // Default: no expiry (`ttl_seconds = None` or `Some(0)`). The bootstrap
    // credential only isolates tenant/app/environment before login; expiring it
    // after a session lifetime made every packaged portal fail
    // `invalid or expired IAM access token` one TTL after deployment.
    let ttl = ttl_seconds.unwrap_or(0);
    let expires_at = if ttl == NO_EXPIRY_EPOCH_SECONDS as u64 {
        no_expiry_timestamp()
    } else {
        now + chrono::Duration::seconds(ttl as i64)
    };

    let context = IamAppContext::new(
        tenant_id.to_owned(),
        Some(organization_id.as_str()),
        subject_user_id.as_str(),
        session_id.clone(),
        token_app_id.clone(),
        environment.clone(),
        DeploymentMode::Local,
        AuthLevel::System,
        data_scope,
        tenant_application.access_permissions.clone(),
    );

    // Step 3 above: ensure (or rotate on request) the tenant signing key
    // before signing, so the issued token is always bound to the tenant
    // secret and the database session.
    let signing_key = ensure_tenant_signing_key(pg, tenant_id).await?;
    let access_token = sign_local_session_token_with_ttl(
        &signing_key,
        "access",
        &context,
        scope,
        ttl as u128,
    );
    let auth_token =
        sign_local_session_token_with_ttl(&signing_key, "auth", &context, scope, ttl as u128);
    ensure_entrypoint_token_budget(&access_token)?;
    ensure_entrypoint_token_budget(&auth_token)?;
    let refresh_token = generate_opaque_token("refresh");

    let auth_token_hash = hash_token(&auth_token);
    let access_token_hash = hash_token(&access_token);
    let refresh_token_hash = hash_token(&refresh_token);
    persist_signed_session(
        pg,
        &context,
        scope,
        &signing_key,
        &auth_token_hash,
        &access_token_hash,
        &refresh_token_hash,
        &expires_at,
        &now,
    )
    .await?;

    Ok(IssuedAccessCredential {
        access_credential: access_token,
        auth_token,
        session_id,
        tenant_id: tenant_id.to_owned(),
        organization_id,
        app_id: token_app_id,
        tenant_application_id: tenant_application.id.clone(),
        ownership_scope: scope,
        environment: environment_to_string(&environment).to_owned(),
        expires_at: expires_at.to_rfc3339(),
    })
}

/// Resolves the deployment environment for bootstrap issuance with the same
/// semantics as the Cloud Router web environment parser: unset or unknown
/// values default to production.
fn bootstrap_environment() -> Environment {
    let value = std::env::var("SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT")
        .or_else(|_| std::env::var("SDKWORK_CLOUDROUTER_ENVIRONMENT"))
        .map(|value| value.trim().to_ascii_lowercase())
        .unwrap_or_default();
    match value.as_str() {
        "dev" | "development" => Environment::Dev,
        "test" | "testing" => Environment::Test,
        _ => Environment::Prod,
    }
}

/// Resolves the deployment bootstrap Access-Token for packaged deployments.
///
/// Priority:
/// 1. an explicitly configured `SDKWORK_ACCESS_TOKEN` wins unchanged;
/// 2. otherwise a signed tenant-bound token is issued through
///    [`issue_standalone_bootstrap_access_credential`] (tenant signing key
///    ensured first 鈥?the "update the tenant secret" step on first boot 鈥?
///    then a signed JWT persisted as an IAM session). The bootstrap credential
///    never expires by default (`exp: 0`, session `expires_at` sentinel);
/// 3. `Ok(None)` when no IAM database is configured, letting the caller fall
///    back to a development-only token.
///
/// `tenant_id` defaults to the installer-provisioned tenant
/// (`SDKWORK_WEB_FRAMEWORK_JWT_BOOTSTRAP_TENANT_ID` overrides it). `app_id` is
/// the installation's deploy application anchor; it defaults to
/// [`crate::application_registry::DEPLOY_APPLICATION_ID_ENV`] and there is no
/// fallback to the IAM runtime app id, so a deployment that names neither fails
/// with an explicit configuration error instead of issuing a credential under the
/// retired identity.
pub async fn resolve_deployment_bootstrap_access_token(
    tenant_id: Option<&str>,
    app_id: Option<&str>,
) -> Result<Option<String>, String> {
    if let Some(token) = std::env::var("SDKWORK_ACCESS_TOKEN")
        .ok()
        .filter(|value| !value.trim().is_empty())
    {
        return Ok(Some(token));
    }

    let Some(pool) = resolve_iam_database_pool_from_env().await else {
        tracing::debug!(
            "IAM database pool unavailable; bootstrap token resolution deferred to caller fallback"
        );
        return Ok(None);
    };
    let Some(pg) = pool.as_postgres() else {
        tracing::debug!("IAM database pool is not PostgreSQL; bootstrap token resolution deferred to caller fallback");
        return Ok(None);
    };

    let tenant_id = tenant_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .or_else(|| {
            std::env::var("SDKWORK_WEB_FRAMEWORK_JWT_BOOTSTRAP_TENANT_ID")
                .ok()
                .filter(|value| !value.trim().is_empty())
        })
        .unwrap_or_else(|| "100001".to_owned());
    let app_id = match app_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
    {
        Some(app_id) => app_id,
        None => crate::application_registry::configured_deploy_application_id()?,
    };

    let issued =
        issue_standalone_bootstrap_access_credential(pg, &tenant_id, &app_id, None).await?;
    tracing::info!(
        tenant_id = %issued.tenant_id,
        app_id = %issued.app_id,
        session_id = %issued.session_id,
        expires_at = %issued.expires_at,
        "issued signed bootstrap access credential for portal login",
    );
    Ok(Some(issued.access_credential))
}

/// Ensures the recorded owner of a `USER`-scoped installation is a live user of
/// the tenant.
///
/// The bootstrap credential of a personal installation is issued for the owner
/// (`APPLICATION_IDENTITY_SPEC.md` 搂4.1 rule 8), and the session resolver joins
/// `iam_user` and requires an active row. Checking here turns "the owner was
/// deleted or disabled" into a named issuance error instead of a credential that
/// silently resolves to nothing.
async fn ensure_active_bootstrap_owner(
    pg: &PgPool,
    tenant_id: &str,
    owner_user_id: &str,
) -> Result<(), String> {
    let row = sqlx::query(
        "SELECT status FROM iam_user \
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = 0 LIMIT 1",
    )
    .bind(owner_user_id)
    .bind(tenant_id)
    .fetch_optional(pg)
    .await
    .map_err(|error| format!("load installation owner failed: {error}"))?;
    let Some(row) = row else {
        return Err(format!(
            "USER-scoped installation owner {owner_user_id} was not found in tenant {tenant_id}; \
             a personal release cannot issue a credential for a missing owner"
        ));
    };
    let status: String = row.get(0);
    if status != "active" {
        return Err(format!(
            "USER-scoped installation owner {owner_user_id} is not active (status={status})"
        ));
    }
    Ok(())
}

/// Ensures the synthetic `system` user used as the bootstrap principal.
///
/// `find_iam_context_from_access_token` joins `iam_user` and requires an
/// active row, so the bootstrap session needs this user to resolve through
/// the verified database path.
async fn ensure_bootstrap_system_user(pg: &PgPool, tenant_id: &str) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO iam_user \
         (id, tenant_id, username, display_name, email, status, created_at, updated_at, \
          locale, timezone, source, is_deleted) \
         VALUES ('system', $1, 'system', 'System', 'system@localhost', 'active', $2, $2, \
                 'en-US', 'UTC', 'bootstrap', 0) \
         ON CONFLICT (id, tenant_id) DO NOTHING",
    )
    .bind(tenant_id)
    .bind(&now)
    .execute(pg)
    .await
    .map_err(|error| format!("ensure bootstrap system user failed: {error}"))?;
    Ok(())
}

/// Persists an issued session row with the signed token hashes and the
/// tenant-bound signing key id. Shared by delegated and bootstrap issuance.
#[allow(clippy::too_many_arguments)]
async fn persist_signed_session(
    pg: &PgPool,
    context: &IamAppContext,
    scope: ApplicationOwnershipScope,
    signing_key: &TenantSigningKey,
    auth_token_hash: &str,
    access_token_hash: &str,
    refresh_token_hash: &str,
    expires_at: &chrono::DateTime<chrono::Utc>,
    now: &chrono::DateTime<chrono::Utc>,
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO iam_session (id, tenant_id, organization_id, login_scope, user_id, \
         principal_kind, principal_id, app_id, environment, deployment_mode, auth_level, \
         auth_token_hash, auth_token_kid, access_token_hash, access_token_kid, \
         refresh_token_hash, refresh_token_kid, sharding_key, sharding_strategy, \
         data_scope_json, permission_scope_json, scope_kind, expires_at, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, 'user', $5, $6, $7, $8, $9, \
                 $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)",
    )
    .bind(&context.session_id)
    .bind(&context.tenant_id)
    .bind(context.organization_id.as_deref().unwrap_or("0"))
    .bind(login_scope_to_string(&context.login_scope))
    .bind(&context.user_id)
    .bind(&context.app_id)
    .bind(environment_to_string(&context.environment))
    .bind(deployment_mode_to_string(&context.deployment_mode))
    .bind(auth_level_to_string(&context.auth_level))
    .bind(auth_token_hash)
    .bind(&signing_key.kid)
    .bind(access_token_hash)
    .bind(&signing_key.kid)
    .bind(refresh_token_hash)
    .bind(&signing_key.kid)
    .bind(&context.tenant_id)
    .bind("tenant")
    .bind(Json(&context.data_scope))
    .bind(Json(&context.permission_scope))
    .bind(scope.as_str())
    .bind(expires_at)
    .bind(now)
    .bind(now)
    .execute(pg)
    .await
    .map_err(|error| format!("insert issued session failed: {error}"))?;
    Ok(())
}

pub fn issued_access_credential_to_json(issued: &IssuedAccessCredential) -> Value {
    json!({
        "accessCredential": issued.access_credential,
        "accessToken": issued.access_credential,
        "authToken": issued.auth_token,
        "sessionId": issued.session_id,
        "tenantId": issued.tenant_id,
        "organizationId": issued.organization_id,
        "appId": issued.app_id,
        "tenantApplicationId": issued.tenant_application_id,
        "ownershipScope": issued.ownership_scope.as_str(),
        "environment": issued.environment,
        "expiresAt": issued.expires_at,
    })
}

async fn ensure_tenant_exists(pg: &PgPool, tenant_id: &str) -> Result<(), String> {
    let row = sqlx::query("SELECT id FROM iam_tenant WHERE id = $1 AND status = 'active' LIMIT 1")
        .bind(tenant_id)
        .fetch_optional(pg)
        .await
        .map_err(|error| format!("load tenant failed: {error}"))?;

    if row.is_some() {
        Ok(())
    } else {
        Err(format!("tenant {tenant_id} was not found or is inactive"))
    }
}

async fn ensure_organization_exists(
    pg: &PgPool,
    tenant_id: &str,
    organization_id: &str,
) -> Result<(), String> {
    let row = sqlx::query(
        "SELECT id FROM iam_organization \
         WHERE tenant_id = $1 AND id = $2 AND status = 'active' LIMIT 1",
    )
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_optional(pg)
    .await
    .map_err(|error| format!("load organization failed: {error}"))?;

    if row.is_some() {
        Ok(())
    } else {
        Err(format!(
            "organization {organization_id} was not found for tenant {tenant_id}"
        ))
    }
}

/// Resolves a user's effective `(data_scope, permission_scope)` for one scope.
///
/// Passing `None` resolves the tenant-scope bindings only; passing an organization
/// id adds that organization's bindings. Entitlement checks use this so an
/// organization grant can never be mistaken for a tenant grant.
pub(crate) async fn resolve_session_scopes(
    pg: &PgPool,
    tenant_id: &str,
    user_id: &str,
    organization_id: Option<&str>,
) -> Result<(Vec<String>, Vec<String>), String> {
    bootstrap_resolve_session_scopes(pg, tenant_id, user_id, organization_id).await
}

pub(crate) async fn ensure_tenant_signing_key(
    pg: &PgPool,
    tenant_id: &str,
) -> Result<TenantSigningKey, String> {
    sdkwork_iam_bootstrap::ensure_postgres_tenant_signing_key(pg, tenant_id)
        .await
        .map_err(|error| format!("provision tenant signing key failed: {error}"))?;

    let material = sdkwork_iam_bootstrap::load_postgres_active_tenant_signing_key(pg, tenant_id)
        .await
        .map_err(|error| format!("load signing key failed: {error}"))?
        .ok_or_else(|| format!("tenant signing key not provisioned for tenant {tenant_id}"))?;

    Ok(TenantSigningKey {
        kid: material.kid,
        secret: material.secret,
    })
}

fn sign_local_session_token(
    signing_key: &TenantSigningKey,
    token_type: &str,
    context: &IamAppContext,
    scope: ApplicationOwnershipScope,
) -> String {
    sign_local_session_token_with_ttl(
        signing_key,
        token_type,
        context,
        scope,
        LOCAL_TOKEN_TTL_SECONDS,
    )
}

/// Signs one local dual-token (`auth`/`access`) JWT.
///
/// The payload is the identity-only envelope of `IAM_SPEC.md` 搂5.2. Claim
/// admission there is closed, and `azp` 鈥?the OAuth client id of the installation
/// credential (`APPLICATION_IDENTITY_SPEC.md` 搂4) 鈥?is not among the admitted
/// claims, so it is deliberately not signed here. The installation's client
/// credential remains a registration-plane fact
/// (`iam_application_installation.app_id`, overridden by
/// `runtimeConfig.oauth.relyingParty.clientId`); `iam_session` records the deploy
/// application anchor only, and signing an unadmitted claim would break the
/// dual-token claim contract before the table admits it.
///
/// `ownership_scope` is admitted (IAM_SPEC 搂5.2): it is the installation's
/// release level, a fixed-size identity fact that does not change for the
/// lifetime of the credential, and it is what lets a data plane filter by the
/// right isolation key without a second lookup.
pub(crate) fn sign_local_session_token_with_ttl(
    signing_key: &TenantSigningKey,
    token_type: &str,
    context: &IamAppContext,
    scope: ApplicationOwnershipScope,
    ttl_seconds: u128,
) -> String {
    let issued_at = current_millis() / 1000;
    // `0` is the explicit "no expiry" sentinel: the access credential carries
    // `exp: 0` and the verifier treats it as never expiring.
    let expires_at = if ttl_seconds == 0 {
        0_u128
    } else {
        issued_at + ttl_seconds
    };
    let organization_id = context
        .organization_id
        .as_deref()
        .filter(|value| !is_blank(Some(value)))
        .unwrap_or("0");
    let header = json!({
        "alg": "HS256",
        "kid": signing_key.kid,
        "typ": "JWT"
    });
    let payload = json!({
        "app_id": context.app_id,
        "aud": context.app_id,
        "auth_level": auth_level_to_string(&context.auth_level),
        "deployment_mode": deployment_mode_to_string(&context.deployment_mode),
        "environment": environment_to_string(&context.environment),
        "exp": expires_at,
        "iat": issued_at,
        "iss": "sdkwork-iam-local",
        "login_scope": login_scope_to_string(&context.login_scope),
        "organization_id": organization_id,
        "ownership_scope": scope.as_str(),
        "session_id": context.session_id,
        "tenant_id": context.tenant_id,
        "token_type": token_type,
        "token_version": stamp_token_version(),
        "user_id": context.user_id
    });
    let signing_input = format!("{}.{}", encode_jwt_json(&header), encode_jwt_json(&payload));
    let mut mac = HmacSha256::new_from_slice(signing_key.secret.as_slice())
        .expect("HS256 signing key length should be valid");
    mac.update(signing_input.as_bytes());
    let signature = URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes());
    format!("{signing_input}.{signature}")
}

fn encode_jwt_json(value: &Value) -> String {
    URL_SAFE_NO_PAD.encode(serde_json::to_vec(value).expect("JWT JSON should serialize"))
}

/// IAM_SPEC 搂5.2 issuer-side assertion: a rendered session token `MUST` fit the
/// entrypoint header budget. Identity-only claims leave ~10x headroom; tripping
/// this means dynamic authorization content was signed back into the payload.
pub(crate) fn ensure_entrypoint_token_budget(token: &str) -> Result<(), String> {
    sdkwork_web_core::validate_rendered_token_bytes(token.len()).map_err(|error| {
        format!(
            "issued session token rejected by issuer budget: {}",
            error.message
        )
    })
}

pub(crate) fn hash_token(token: &str) -> String {
    let digest = Sha256::digest(token.as_bytes());
    format!("{:x}", digest)
}

pub(crate) fn generate_opaque_token(kind: &str) -> String {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    format!("sdkwork-{kind}-{}", URL_SAFE_NO_PAD.encode(bytes))
}

fn current_millis() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

fn read_required_string(body: &Value, keys: &[&str]) -> Result<String, String> {
    read_optional_string(body, keys).ok_or_else(|| format!("{} is required", keys[0]))
}

fn read_optional_string(body: &Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        body.get(*key)
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_owned)
    })
}

pub(crate) fn login_scope_to_string(scope: &LoginScope) -> &'static str {
    match scope {
        LoginScope::Tenant => "TENANT",
        LoginScope::Organization => "ORGANIZATION",
    }
}

pub(crate) fn environment_to_string(environment: &Environment) -> &'static str {
    match environment {
        Environment::Dev => "dev",
        Environment::Test => "test",
        Environment::Prod => "prod",
    }
}

pub(crate) fn deployment_mode_to_string(deployment_mode: &DeploymentMode) -> &'static str {
    match deployment_mode {
        DeploymentMode::Saas => "saas",
        DeploymentMode::Local => "local",
        DeploymentMode::Private => "private",
    }
}

pub(crate) fn auth_level_to_string(auth_level: &AuthLevel) -> &'static str {
    match auth_level {
        AuthLevel::Anonymous => "anonymous",
        AuthLevel::Password => "password",
        AuthLevel::Mfa => "mfa",
        AuthLevel::System => "system",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application_registry::TenantApplication;

    /// Installation fixture: the IAM runtime `app_id` is the OAuth client id and
    /// is never the access-token subject.
    fn tenant_application(deploy_application_id: Option<&str>) -> TenantApplication {
        TenantApplication {
            id: "tapp-1".to_owned(),
            app_id: "sdkwork-cloudrouter".to_owned(),
            tenant_id: "100001".to_owned(),
            organization_id: "0".to_owned(),
            instance_key: "sdkwork-cloudrouter:production".to_owned(),
            display_name: "SDKWork CloudRouter".to_owned(),
            environment: "production".to_owned(),
            application_type: "pc".to_owned(),
            status: "enabled".to_owned(),
            primary_domain: Some("cloudrouter.example.com".to_owned()),
            access_permissions: vec!["iam.credential_entry".to_owned()],
            runtime_config: json!({}),
            deploy_application_id: deploy_application_id.map(str::to_owned),
            ownership_scope: ApplicationOwnershipScope::Tenant,
            owner_user_id: None,
        }
    }

    fn access_token_payload(token: &str) -> Value {
        let parts: Vec<&str> = token.split('.').collect();
        assert_eq!(parts.len(), 3, "a session token has three segments");
        serde_json::from_slice(
            &URL_SAFE_NO_PAD
                .decode(parts[1])
                .expect("payload should decode"),
        )
        .expect("payload should parse")
    }

    #[test]
    fn parse_access_credential_create_request_accepts_camel_case_fields() {
        let body = json!({
            "tenantId": "100001",
            "organizationId": "org-1",
            "tenantApplicationId": "tapp-1"
        });
        let request = parse_access_credential_create_request(&body).expect("parse request");
        assert_eq!(request.tenant_id, "100001");
        assert_eq!(request.organization_id, "org-1");
        assert_eq!(request.tenant_application_id.as_deref(), Some("tapp-1"));
    }

    #[test]
    fn principal_has_permission_checks_permission_scope() {
        assert!(principal_has_permission(
            &[IAM_ACCESS_CREDENTIALS_CREATE_PERMISSION.to_owned()],
            IAM_ACCESS_CREDENTIALS_CREATE_PERMISSION
        ));
        assert!(!principal_has_permission(
            &["iam.users.read".to_owned()],
            IAM_ACCESS_CREDENTIALS_CREATE_PERMISSION
        ));
    }

    /// A linked installation signs the deploy application into `app_id` and
    /// `aud`; the IAM runtime `app_id` never reaches the claims, so the
    /// `aud == app_id` invariant holds on the new subject.
    #[test]
    fn access_token_claims_carry_the_deploy_application_id() {
        let tenant_application = tenant_application(Some("deploy-app-7"));
        let app_id = crate::application_registry::resolve_access_token_app_id(&tenant_application)
            .expect("a linked installation resolves its deploy application");

        let context = IamAppContext::new(
            tenant_application.tenant_id.clone(),
            Some(tenant_application.organization_id.as_str()),
            "user-1".to_owned(),
            "session-1".to_owned(),
            app_id,
            Environment::Prod,
            DeploymentMode::Local,
            AuthLevel::System,
            vec!["tenant:100001".to_owned()],
            tenant_application.access_permissions.clone(),
        );
        let signing_key = TenantSigningKey {
            kid: "kid-1".to_owned(),
            secret: b"0123456789abcdef0123456789abcdef".to_vec(),
        };

        for token in [
            sign_local_session_token(
                &signing_key,
                "access",
                &context,
                ApplicationOwnershipScope::Tenant,
            ),
            sign_local_session_token(
                &signing_key,
                "auth",
                &context,
                ApplicationOwnershipScope::Tenant,
            ),
        ] {
            let payload = access_token_payload(&token);
            assert_eq!(payload["app_id"], "deploy-app-7");
            assert_eq!(payload["aud"], "deploy-app-7");
            assert_eq!(
                payload["app_id"], payload["aud"],
                "the aud == app_id invariant must hold for the deployment credential"
            );
            assert_ne!(
                payload["app_id"], tenant_application.app_id,
                "the IAM runtime app id must not be signed as the token subject"
            );
            assert_eq!(payload["tenant_id"], "100001");
        }
    }

    /// Without a deploy link there is no deployment identity to name, so
    /// issuance fails closed instead of falling back to the IAM runtime app id.
    #[test]
    fn access_token_issuance_fails_closed_without_a_deploy_application_link() {
        for deploy_application_id in [None, Some(""), Some("   ")] {
            let tenant_application = tenant_application(deploy_application_id);
            let error = crate::application_registry::resolve_access_token_app_id(&tenant_application)
                .expect_err("an installation without a deploy link must not issue a token");
            assert!(
                error.contains("not bound to a deploy application"),
                "error must state the missing binding: {error}"
            );
            assert!(
                error.contains("tapp-1"),
                "error must name the installation: {error}"
            );
        }
    }

    #[test]
    fn sign_local_session_token_payload_keeps_primary_claims_without_redundant_aliases() {
        let context = IamAppContext::new(
            "100001".to_owned(),
            Some("org-1"),
            "user-1".to_owned(),
            "session-1".to_owned(),
            "sdkwork-cloudrouter".to_owned(),
            Environment::Prod,
            DeploymentMode::Private,
            AuthLevel::System,
            vec!["tenant:100001".to_owned()],
            vec!["iam:self".to_owned()],
        );
        let signing_key = TenantSigningKey {
            kid: "kid-1".to_owned(),
            secret: b"0123456789abcdef0123456789abcdef".to_vec(),
        };
        let token = sign_local_session_token_with_ttl(
            &signing_key,
            "access",
            &context,
            ApplicationOwnershipScope::Organization,
            LOCAL_TOKEN_TTL_SECONDS,
        );
        let parts: Vec<&str> = token.split('.').collect();
        assert_eq!(parts.len(), 3);
        let payload: Value = serde_json::from_slice(
            &URL_SAFE_NO_PAD
                .decode(parts[1])
                .expect("payload should decode"),
        )
        .expect("payload should parse");

        for key in [
            "app_id",
            "aud",
            "auth_level",
            "deployment_mode",
            "environment",
            "exp",
            "iat",
            "iss",
            "login_scope",
            "organization_id",
            "ownership_scope",
            "session_id",
            "tenant_id",
            "token_type",
            "token_version",
            "user_id",
        ] {
            assert!(payload.get(key).is_some(), "claim {key} should be present");
        }
        for key in [
            "sid",
            "sub",
            "principal_id",
            "principal_kind",
            // Variable-length authorization content is server-resolved
            // (IAM_SPEC 搂5.2): signing it in is what produced HTTP 431.
            "data_scope",
            "permission_scope",
        ] {
            assert!(
                payload.get(key).is_none(),
                "forbidden claim {key} should be absent"
            );
        }
        // `APPLICATION_IDENTITY_SPEC.md` 搂4 lists `azp`, but the dual-token
        // envelope is governed by `IAM_SPEC.md` 搂5.2, whose claim admission is
        // closed: every claim outside its required-claims table is forbidden.
        // The session row carries the deploy application anchor and no client
        // credential, so this envelope stays without `azp` until that table
        // admits the claim (see the module report / spec amendment request).
        assert!(
            payload.get("azp").is_none(),
            "azp is not an admitted claim of the dual-token envelope (IAM_SPEC 搂5.2)"
        );
        // Scope arrays must no longer be embedded in the local dual-token JWT:
        // they bloat the compact header and trigger HTTP 431 on proxy edges.
        // The authoritative scopes live in the iam_session row and are loaded
        // at request time, so the token copies are vestigial.
        assert!(
            payload.get("data_scope").is_none(),
            "data_scope should not be embedded in the local token"
        );
        assert!(
            payload.get("permission_scope").is_none(),
            "permission_scope should not be embedded in the local token"
        );
        assert_eq!(payload["user_id"], "user-1");
        assert_eq!(payload["session_id"], "session-1");
        assert_eq!(payload["token_type"], "access");
        // The release scope is the installation's, and it is the claim a data
        // plane reads to pick its isolation key.
        assert_eq!(payload["ownership_scope"], "ORGANIZATION");
        assert_eq!(payload["organization_id"], "org-1");
        // Hard budget that prevents HTTP 431 (Request Header Fields Too Large)
        // on the reverse-proxy edge: the full 3-part compact JWT must stay
        // under 8 KiB even for an unusually large scope set.
        assert!(token.len() < 8192, "token too long: {}", token.len());
    }

    /// The three release levels produce the claims the standard requires: the
    /// organization claim follows the scope, not the session, and the scope is
    /// always present.
    #[test]
    fn release_scope_decides_the_organization_claim_of_the_token() {
        let signing_key = TenantSigningKey {
            kid: "kid-1".to_owned(),
            secret: b"0123456789abcdef0123456789abcdef".to_vec(),
        };
        let cases = [
            (ApplicationOwnershipScope::Tenant, "0", "TENANT", "TENANT"),
            (
                ApplicationOwnershipScope::Organization,
                "42",
                "ORGANIZATION",
                "ORGANIZATION",
            ),
            (ApplicationOwnershipScope::User, "0", "TENANT", "USER"),
        ];
        for (scope, installation_organization_id, login_scope, claim) in cases {
            let context = IamAppContext::new(
                "100001".to_owned(),
                Some(installation_organization_id),
                "user-1".to_owned(),
                "session-1".to_owned(),
                "deploy-app-7".to_owned(),
                Environment::Prod,
                DeploymentMode::Local,
                AuthLevel::System,
                Vec::new(),
                Vec::new(),
            );
            let token =
                sign_local_session_token_with_ttl(&signing_key, "access", &context, scope, 3600);
            let payload = access_token_payload(&token);
            assert_eq!(payload["ownership_scope"], claim);
            assert_eq!(payload["login_scope"], login_scope);
            let expected_organization_id = if scope == ApplicationOwnershipScope::Organization {
                installation_organization_id
            } else {
                "0"
            };
            assert_eq!(payload["organization_id"], expected_organization_id);
        }
    }

    /// IAM_SPEC 搂5.2: the authored payload is identity-only, so a rendered token
    /// must leave an order of magnitude of headroom under the entrypoint budget.
    /// Before the fix a tenant super-admin token rendered at 7882 bytes, i.e.
    /// 96% of the Nginx `large_client_header_buffers` single-buffer budget and
    /// 220 granted permission codes away from a hard `431`.
    #[test]
    fn rendered_session_token_stays_far_below_the_entrypoint_budget() {
        // Worst realistic case: a max-length permission scope must no longer move
        // the rendered size at all, because scope is not a claim any more.
        let wide_scope: Vec<String> = (0..2_000)
            .map(|index| format!("domain.res{index}.read"))
            .collect();
        let context = IamAppContext::new(
            "100001".to_owned(),
            Some("9"),
            "1".to_owned(),
            "sdkwork-session-SBKo9fAd5gwCs2KVeErhlUdanxpB4lmEfEqymi-Ds-w".to_owned(),
            "sdkwork-webserver-pc".to_owned(),
            Environment::Prod,
            DeploymentMode::Saas,
            AuthLevel::Password,
            wide_scope.clone(),
            wide_scope,
        );
        let signing_key = TenantSigningKey {
            kid: "100001:local-hs256:primary".to_owned(),
            secret: b"0123456789abcdef0123456789abcdef".to_vec(),
        };
        let token = sign_local_session_token_with_ttl(
            &signing_key,
            "access",
            &context,
            ApplicationOwnershipScope::Tenant,
            LOCAL_TOKEN_TTL_SECONDS,
        );
        ensure_entrypoint_token_budget(&token).expect("identity-only token must pass the budget");
        assert!(
            token.len() < 1024,
            "identity-only token rendered {} bytes; expected well under 1 KiB",
            token.len()
        );
        // Two of these plus a realistic browser header set must fit the whole block.
        sdkwork_web_core::validate_dual_token_header_budget(
            token.len(),
            token.len(),
            sdkwork_web_core::DUAL_TOKEN_HEADER_NAME_BYTES,
        )
        .expect("dual-token block must fit");
    }
}
