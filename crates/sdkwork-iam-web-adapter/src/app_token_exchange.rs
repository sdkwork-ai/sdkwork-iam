//! User- and organization-scoped application access token exchange.
//!
//! The app factory needs three ways to initialize a credential, and one endpoint
//! serves all of them because the installation's release scope decides the rule:
//!
//! - **Tenant admin** (`platform_system_admin`/`platform_super_admin`, or any
//!   tenant-scope `iam.app_tokens.admin`) initializes any `TENANT` or
//!   `ORGANIZATION` installation of its tenant.
//! - **Organization member with the capability** initializes an `ORGANIZATION`
//!   installation of that organization: the capability is resolved **for that
//!   organization** (`iam.app_tokens.admin` through the `org_admin` `iam.*` grant),
//!   so an organization grant can never be reused for a tenant-level credential.
//! - **The owner of a self-registered application** (`USER` installation)
//!   initializes its own credential; nobody else can, because that installation's
//!   isolation key ends in the owner's user id.
//!
//! The credential itself is minted by the single issuance path in
//! [`crate::access_token_issue`] — signed with the tenant signing key, persisted as
//! a revocable one-hour session, scope intersected with the installation's access
//! permissions. This module owns the entitlement decision, the environment
//! selection, and the server-side request derivation.
//!
//! Coupling rules:
//! - the tenant is always the session's; a selector cannot address another tenant;
//! - the organization and the release scope come from the installation;
//! - the module reads IAM-owned tables only. Resolving a deployment slug into its
//!   anchor is the deploy module's job (`sdkwork-deploy-app-token`).

use sdkwork_iam_context_service::Environment;
use sqlx::PgPool;

use crate::access_token_issue::{
    environment_to_string, issue_delegated_access_credential_for_environment,
    resolve_installation_for_access_credential, AccessCredentialCreateRequest,
    IssuedAccessCredential,
};
use crate::application_registry::TenantApplication;
use crate::application_scope::ApplicationOwnershipScope;
use crate::installation_lifecycle::{
    canonical_environment_key, decide_installation_environment_access,
    load_installation_environments,
};
use crate::super_admin_auth::AccessTokenActor;

/// Failure classes the app-api route maps onto HTTP status.
///
/// The issuance core reports free-form messages; this boundary classifies them
/// once so the generated SDK receives a stable status per class instead of a
/// blanket 500.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum AppTokenExchangeError {
    /// The caller presented no user session (or a bootstrap credential).
    Unauthenticated(String),
    /// The caller is not entitled to the requested installation.
    Denied(String),
    /// The selector names no installation of the caller's tenant.
    NotFound(String),
    /// The installation exists but cannot issue right now (disabled,
    /// environment not registered, personal installation without its owner).
    Conflict(String),
    /// The installation's stored state is incomplete, and the message names the
    /// stable defect codes plus the repair operation.
    ///
    /// Separate from [`Self::Conflict`] so the route can answer with a specific
    /// wire code: a client reads the defects, calls `installations.reconcile`
    /// (optionally with `dryRun`), and retries instead of treating it as a
    /// transient conflict.
    NotReady(String),
    /// Anything else, including storage failures.
    Internal(String),
}

impl AppTokenExchangeError {
    /// The message safe to return in an API problem detail.
    /// @returns the human-readable detail.
    pub fn message(&self) -> &str {
        match self {
            Self::Unauthenticated(message)
            | Self::Denied(message)
            | Self::NotFound(message)
            | Self::Conflict(message)
            | Self::NotReady(message)
            | Self::Internal(message) => message,
        }
    }

    fn classify_issuance_error(message: String) -> Self {
        let lower = message.to_ascii_lowercase();
        if lower.contains("was not found")
            || lower.contains("not found;")
            || lower.contains("not bound to an installation")
        {
            Self::NotFound(message)
        } else if lower.contains("must be enabled")
            || lower.contains("must be active")
            || lower.contains("has no owneruserid")
            || lower.contains("environment")
            || lower.contains("does not match tenant application")
            || lower.contains("not bound to a deploy application")
            || lower.contains("no deployapplicationid")
        {
            Self::Conflict(message)
        } else if lower.contains("does not belong to") || lower.contains("other tenant") {
            Self::Denied(message)
        } else {
            Self::Internal(message)
        }
    }
}

impl std::fmt::Display for AppTokenExchangeError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(self.message())
    }
}

impl std::error::Error for AppTokenExchangeError {}

/// Administrative issuance capability.
///
/// Held by the platform admin roles (`platform_system_admin`, `platform_super_admin`,
/// since both include `iam.*`) **and** by the organization admin role when its
/// binding is organization-scoped. It authorizes initializing a credential for an
/// `ORGANIZATION` installation of an organization the caller belongs to, and is one
/// of the accepted capabilities for a `TENANT` installation.
///
/// A `USER` installation remains owner-only regardless of this capability: that
/// installation's isolation key ends in its owner's user id, so administrative
/// issuance would impersonate that owner.
pub const IAM_APP_TOKENS_ADMIN_PERMISSION: &str = "iam.app_tokens.admin";

/// Capability that admits a member to tenant-level application credentials.
///
/// This is the **entry capability**: the app-api route itself requires it, so a
/// principal must hold it to call the endpoint at all. [`IAM_APP_TOKENS_ADMIN_PERMISSION`]
/// broadens *which installations* that caller may initialize; it does not replace
/// the entry capability.
pub const IAM_APP_TOKENS_CREATE_PERMISSION: &str = "iam.app_tokens.create";

/// Audit action recorded for every issued application credential.
pub const IAM_APP_TOKENS_AUDIT_ACTION: &str = "iam.app_access_token.created";

/// Selectors a caller may use to name the application, plus the environment and
/// release-scope hints.
///
/// The tenant is never a selector: it comes from the authenticated session, so a
/// request can only address installations of the caller's own tenant.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct UserApplicationTokenRequest {
    /// Installation deploy application anchor (`iam_application_installation
    /// .deploy_application_id`). This is the only identity the deployment plane
    /// publishes, so it is the preferred selector.
    pub app_id: Option<String>,
    /// IAM installation row id.
    pub tenant_application_id: Option<String>,
    /// Installation instance key.
    pub instance_key: Option<String>,
    /// Exact installation lifecycle environment to initialize (`development`,
    /// `production`, ...). Omitted means: the caller's session environment when the
    /// installation registered it, otherwise the installation's only active
    /// environment.
    pub environment: Option<String>,
    /// Release scope the caller declares. This is a **declaration to be checked**,
    /// never a selector: the installation decides the level. Omitted means the
    /// credential inherits the installation's scope, so a tenant-level application
    /// yields a tenant-level credential by default.
    pub ownership_scope: Option<String>,
}

impl UserApplicationTokenRequest {
    /// Builds the request from an API body.
    ///
    /// Accepted keys are the camelCase wire names plus their snake_case aliases,
    /// matching every other IAM command body. `tenantId` and `organizationId` are
    /// deliberately not accepted: they are server-derived.
    /// @param body - JSON request body.
    /// @returns the parsed request.
    /// @throws String when no selector is supplied or a scope is unknown.
    pub fn parse(body: &serde_json::Value) -> Result<Self, String> {
        let app_id = read_optional(body, &["appId", "app_id"]);
        let tenant_application_id = read_optional(body, &["installationId", "installation_id"]);
        let instance_key = read_optional(body, &["instanceKey", "instance_key"]);
        if app_id.is_none() && tenant_application_id.is_none() && instance_key.is_none() {
            return Err(
                "appId, installationId, or instanceKey is required to name the application"
                    .to_string(),
            );
        }
        let environment = read_optional(body, &["environment", "env"]);
        let ownership_scope = read_optional(body, &["ownershipScope", "ownership_scope"]);
        if let Some(scope) = ownership_scope.as_deref() {
            if ApplicationOwnershipScope::parse(scope).is_none() {
                return Err(format!(
                    "ownershipScope must be one of TENANT, ORGANIZATION, USER (got {scope})"
                ));
            }
        }
        Ok(Self {
            app_id,
            tenant_application_id,
            instance_key,
            environment,
            ownership_scope,
        })
    }

    fn selector(&self, tenant_id: &str) -> AccessCredentialCreateRequest {
        AccessCredentialCreateRequest {
            tenant_id: tenant_id.to_owned(),
            organization_id: "0".to_owned(),
            tenant_application_id: self.tenant_application_id.clone(),
            app_id: self.app_id.clone(),
            instance_key: self.instance_key.clone(),
            ownership_scope: None,
        }
    }

    fn internal_request(
        &self,
        tenant_id: &str,
        installation: &TenantApplication,
        declared_scope: Option<&str>,
    ) -> AccessCredentialCreateRequest {
        AccessCredentialCreateRequest {
            tenant_id: tenant_id.to_owned(),
            // Server-derived: the installation owns its organization claim. A
            // client-supplied organization id can never widen or narrow it.
            organization_id: installation.organization_id.clone(),
            tenant_application_id: Some(installation.id.clone()),
            app_id: None,
            instance_key: None,
            ownership_scope: declared_scope.map(str::to_owned),
        }
    }
}

fn read_optional(body: &serde_json::Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        body.get(*key)
            .and_then(serde_json::Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_owned)
    })
}

/// Issues an application access credential for a signed-in user.
///
/// Entry point for the user-facing paths (own application, organization,
/// tenant); [`issue_application_access_credential`] is the same function, kept as
/// the unambiguous name for callers that do not need to think about capability
/// classes.
/// @param pg - IAM PostgreSQL pool.
/// @param actor - the caller's authenticated session actor.
/// @param request - selectors and hints.
/// @returns the signed access/auth pair and its session facts.
/// @throws [`AppTokenExchangeError`] naming the failed gate.
pub async fn issue_user_application_access_credential(
    pg: &PgPool,
    actor: &AccessTokenActor,
    request: &UserApplicationTokenRequest,
) -> Result<IssuedAccessCredential, AppTokenExchangeError> {
    issue_application_access_credential(pg, actor, request).await
}

/// Issues an application access credential for the authenticated caller.
///
/// Order: session guard 鈫?installation resolution 鈫?scope/capability entitlement 鈫?/// environment selection 鈫?issuance. Every step fails closed with a typed class, so
/// the route maps one variant onto one status.
/// @param pg - IAM PostgreSQL pool.
/// @param actor - the caller's session actor (tenant + user + environment).
/// @param request - selectors and hints.
/// @returns the signed access/auth pair and its session facts.
/// @throws [`AppTokenExchangeError`] naming the failed gate.
pub async fn issue_application_access_credential(
    pg: &PgPool,
    actor: &AccessTokenActor,
    request: &UserApplicationTokenRequest,
) -> Result<IssuedAccessCredential, AppTokenExchangeError> {
    let user_id = actor.user_id.trim();
    if user_id.is_empty() || user_id == "0" || user_id == "system" {
        return Err(AppTokenExchangeError::Unauthenticated(
            "application access tokens require an authenticated user session, not a bootstrap \
             credential"
                .to_string(),
        ));
    }

    let installation = resolve_installation_for_access_credential(
        pg,
        &actor.tenant_id,
        &request.selector(&actor.tenant_id),
    )
    .await
    .map_err(AppTokenExchangeError::classify_issuance_error)?;

    ensure_actor_may_issue(pg, actor, &installation).await?;

    // Completeness gate: every defect that blocks issuance (an unbound deploy
    // anchor, a disabled lifecycle, an empty access scope, no active environment)
    // is reported together with the operation that repairs it, instead of
    // surfacing one at a time from deep inside the signing path.
    let environments = crate::installation_lifecycle::load_installation_environments(
        pg,
        &actor.tenant_id,
        &installation.id,
    )
    .await
    .map_err(AppTokenExchangeError::Internal)?;
    let readiness =
        crate::installation_readiness::assess_installation(&installation, &environments);
    if !readiness.issuance_ready() {
        return Err(AppTokenExchangeError::NotReady(
            readiness.repair_detail("issuance"),
        ));
    }

    let declared_scope =
        resolve_scope_declaration(request.ownership_scope.as_deref(), &installation)?;

    let (environment, environment_key) =
        resolve_installation_environment(pg, actor, &installation, request.environment.as_deref())
            .await?;

    crate::application_enterprise_order::expire_due_enterprise_orders(pg, 100)
        .await
        .map_err(AppTokenExchangeError::Internal)?;
    crate::application_enterprise_order::ensure_user_enterprise_authorization_on_login(
        pg,
        &actor.tenant_id,
        &installation.organization_id,
        user_id,
        installation.deploy_application_id.as_deref().unwrap_or(""),
    )
    .await
    .map_err(|message| AppTokenExchangeError::Denied(message))?;

    let internal =
        request.internal_request(&actor.tenant_id, &installation, declared_scope.as_deref());
    let issued = issue_delegated_access_credential_for_environment(
        pg,
        actor,
        &internal,
        environment,
        &environment_key,
    )
    .await
    .map_err(AppTokenExchangeError::classify_issuance_error)?;
    // Audit is mandatory: a failed audit write must not hand out a credential that
    // no audit trail explains. The session was persisted a moment earlier; with the
    // caller receiving an error the token never leaves the process and the orphan
    // session expires with the one-hour TTL.
    record_app_token_audit(pg, actor, &installation, &issued, &environment_key).await?;
    Ok(issued)
}

/// Records the issuance in `iam_audit_event`.
///
/// The detail carries identifiers and the release scope only — never the access or
/// auth token, never their hashes.
/// @param pg - IAM PostgreSQL pool.
/// @param actor - issuing user.
/// @param installation - installation the credential was issued for.
/// @param issued - issued credential facts.
/// @param environment_key - installation lifecycle the credential was gated on.
/// @returns `Ok(())` when the event was written.
/// @throws [`AppTokenExchangeError::Internal`] when the audit row cannot be written.
async fn record_app_token_audit(
    pg: &PgPool,
    actor: &AccessTokenActor,
    installation: &TenantApplication,
    issued: &IssuedAccessCredential,
    environment_key: &str,
) -> Result<(), AppTokenExchangeError> {
    let organization_id = match installation.ownership_scope {
        ApplicationOwnershipScope::Organization => Some(installation.organization_id.as_str()),
        ApplicationOwnershipScope::Tenant | ApplicationOwnershipScope::User => None,
    };
    crate::iam_audit::record_audit_event(
        pg,
        &actor.tenant_id,
        organization_id,
        Some(&actor.user_id),
        IAM_APP_TOKENS_AUDIT_ACTION,
        "iam_application_installation",
        Some(&installation.id),
        None,
        environment_key,
        app_token_audit_detail(installation, issued, environment_key),
    )
    .await
    .map_err(|error| {
        AppTokenExchangeError::Internal(format!("record application token audit failed: {error}"))
    })
}

/// Builds the audit detail for one issuance.
///
/// Pure so its "no credential material" property is unit-tested.
/// @param installation - installation the credential was issued for.
/// @param issued - issued credential facts.
/// @param environment_key - installation lifecycle.
/// @returns the audit detail document.
fn app_token_audit_detail(
    installation: &TenantApplication,
    issued: &IssuedAccessCredential,
    environment_key: &str,
) -> serde_json::Value {
    serde_json::json!({
        "appId": issued.app_id,
        "installationId": installation.id,
        "ownershipScope": issued.ownership_scope.as_str(),
        "environment": environment_key,
        "sessionId": issued.session_id,
    })
}

/// Resolves the release-scope declaration to send with the issuance.
///
/// The installation is the scope authority (`APPLICATION_IDENTITY_SPEC.md` 搂4.1
/// rule 3), so an omitted declaration stays omitted and the credential inherits the
/// installation's scope — a tenant-level application therefore yields a tenant-level
/// credential by default, which is what the app factory needs. An explicit
/// declaration is honoured only when it agrees; a contradiction fails closed instead
/// of silently re-scoping the installation.
/// @param requested - the caller's explicit declaration, if any.
/// @param installation - resolved installation (scope authority).
/// @returns the declaration to forward, or `None` to let the installation decide.
/// @throws [`AppTokenExchangeError::Conflict`] when the declaration contradicts the
///   installation.
pub fn resolve_scope_declaration(
    requested: Option<&str>,
    installation: &TenantApplication,
) -> Result<Option<String>, AppTokenExchangeError> {
    let Some(declared) = requested else {
        return Ok(None);
    };
    if ApplicationOwnershipScope::parse(declared) != Some(installation.ownership_scope) {
        return Err(AppTokenExchangeError::Conflict(format!(
            "installation {} was released with ownershipScope {} and is immutable; pass \
             ownershipScope={} or omit the declaration to inherit it",
            installation.id,
            installation.ownership_scope.as_str(),
            installation.ownership_scope.as_str(),
        )));
    }
    Ok(Some(declared.to_owned()))
}

/// Picks the installation environment the credential is gated on.
///
/// Explicit `environment` wins (and must be a registered, active lifecycle of this
/// installation). Otherwise the caller's session environment is mapped to the
/// lifecycle vocabulary; when the installation did not register that lifecycle, a
/// single active environment is used (the freshly registered application case), and
/// anything ambiguous fails closed naming the registered rows.
/// @param pg - IAM PostgreSQL pool.
/// @param actor - session actor supplying the default environment.
/// @param installation - resolved installation.
/// @param requested - caller's explicit environment, if any.
/// @returns the coarse claim environment and the exact lifecycle key.
/// @throws [`AppTokenExchangeError::Conflict`] when the environment cannot be chosen.
pub async fn resolve_installation_environment(
    pg: &PgPool,
    actor: &AccessTokenActor,
    installation: &TenantApplication,
    requested: Option<&str>,
) -> Result<(Environment, String), AppTokenExchangeError> {
    let registered = load_installation_environments(pg, &actor.tenant_id, &installation.id)
        .await
        .map_err(AppTokenExchangeError::Internal)?;

    let describe = || {
        registered
            .iter()
            .map(|(key, status)| format!("{key} ({status})"))
            .collect::<Vec<_>>()
            .join(", ")
    };

    let key = match requested {
        Some(value) => {
            let canonical = canonical_environment_key(value);
            if canonical.is_empty() {
                return Err(AppTokenExchangeError::Conflict(
                    "environment must name an installation lifecycle".to_string(),
                ));
            }
            decide_installation_environment_access(&installation.id, &canonical, &registered)
                .map_err(AppTokenExchangeError::Conflict)?;
            canonical
        }
        None => {
            let session_key = canonical_environment_key(environment_to_string(&actor.environment));
            if registered.is_empty() {
                session_key
            } else if registered
                .iter()
                .any(|(candidate, _)| canonical_environment_key(candidate) == session_key)
            {
                session_key
            } else {
                let mut active = registered
                    .iter()
                    .filter(|(_, status)| status.eq_ignore_ascii_case("active"));
                match (active.next(), active.next()) {
                    (Some((only, _)), None) => canonical_environment_key(only),
                    _ => {
                        return Err(AppTokenExchangeError::Conflict(format!(
                            "environment '{session_key}' is not registered for installation {}; \
                             registered environments: {}; pass environment to choose one",
                            installation.id,
                            describe(),
                        )))
                    }
                }
            }
        }
    };
    Ok((environment_for_lifecycle(&key), key))
}

/// Maps an installation lifecycle key onto the coarse token claim environment.
fn environment_for_lifecycle(key: &str) -> Environment {
    match key {
        "development" => Environment::Dev,
        "test" => Environment::Test,
        _ => Environment::Prod,
    }
}

/// Which capability class an installation scope demands.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum IssuanceScope {
    /// Tenant-level applications: a tenant-scope capability is required.
    Tenant,
    /// Organization-level applications: the administrative capability must be
    /// granted *for that organization* (or at tenant scope).
    Organization,
}

/// Decides whether `actor` may receive a credential for `installation`.
///
/// The control is the installation's release scope, and every check resolves the
/// caller's permissions **at that scope**, so an organization grant can never be
/// reused for a tenant-level credential:
///
/// - `USER`: the installation owner alone (its isolation key ends in the owner's
///   user id, so even a platform administrator must not impersonate it);
/// - `TENANT`: active tenant membership plus `iam.app_tokens.create` **or**
///   `iam.app_tokens.admin` in the tenant-scope grants;
/// - `ORGANIZATION`: active membership of that organization plus
///   `iam.app_tokens.admin` resolved for that organization (organization admins hold
///   it through their `iam.*` role grant; a platform admin holds it through the
///   tenant binding).
/// @param pg - IAM PostgreSQL pool.
/// @param actor - authenticated caller.
/// @param installation - resolved installation.
/// @returns `Ok(())` when entitled.
/// @throws [`AppTokenExchangeError`] naming the failed relation or capability.
pub async fn ensure_actor_may_issue(
    pg: &PgPool,
    actor: &AccessTokenActor,
    installation: &TenantApplication,
) -> Result<(), AppTokenExchangeError> {
    if installation.tenant_id != actor.tenant_id {
        return Err(AppTokenExchangeError::NotFound(
            "application was not found in the caller's tenant".to_string(),
        ));
    }
    match installation.ownership_scope {
        ApplicationOwnershipScope::User => {
            ensure_subject_owns_installation(installation, &actor.user_id)
        }
        ApplicationOwnershipScope::Tenant => {
            ensure_active_tenant_membership(pg, &actor.tenant_id, &actor.user_id).await?;
            let granted = resolve_scope_capabilities(pg, actor, None).await?;
            require_capability(IssuanceScope::Tenant, &granted)
        }
        ApplicationOwnershipScope::Organization => {
            ensure_active_organization_membership(
                pg,
                &actor.tenant_id,
                &installation.organization_id,
                &actor.user_id,
            )
            .await?;
            let granted =
                resolve_scope_capabilities(pg, actor, Some(&installation.organization_id)).await?;
            require_capability(IssuanceScope::Organization, &granted)
        }
    }
}

/// Resolves the caller's effective capability codes at one scope.
///
/// `None` resolves the tenant-scope bindings only; `Some(organization)` adds that
/// organization's bindings, which is how an organization admin's grant is
/// distinguished from a tenant-wide one.
async fn resolve_scope_capabilities(
    pg: &PgPool,
    actor: &AccessTokenActor,
    organization_id: Option<&str>,
) -> Result<Vec<String>, AppTokenExchangeError> {
    let (_, permission_scope) = crate::access_token_issue::resolve_session_scopes(
        pg,
        &actor.tenant_id,
        &actor.user_id,
        organization_id,
    )
    .await
    .map_err(AppTokenExchangeError::Internal)?;
    Ok(permission_scope)
}

/// Enforces the capability class an installation scope demands.
///
/// Split out from the database work so the rule is unit-tested directly.
/// @param scope - capability class demanded by the installation.
/// @param granted - the caller's resolved capability codes at that scope.
/// @returns `Ok(())` when the capability is present.
/// @throws [`AppTokenExchangeError::Denied`] naming the missing capability.
fn require_capability(
    scope: IssuanceScope,
    granted: &[String],
) -> Result<(), AppTokenExchangeError> {
    let admin = crate::principal_has_permission(granted, IAM_APP_TOKENS_ADMIN_PERMISSION);
    match scope {
        IssuanceScope::Tenant => {
            if admin || crate::principal_has_permission(granted, IAM_APP_TOKENS_CREATE_PERMISSION) {
                Ok(())
            } else {
                Err(AppTokenExchangeError::Denied(format!(
                    "a tenant-level application credential requires {IAM_APP_TOKENS_CREATE_PERMISSION} \
                     or {IAM_APP_TOKENS_ADMIN_PERMISSION} in the caller's tenant-scope grants"
                )))
            }
        }
        IssuanceScope::Organization => {
            if admin {
                Ok(())
            } else {
                Err(AppTokenExchangeError::Denied(format!(
                    "an organization-level application credential requires \
                     {IAM_APP_TOKENS_ADMIN_PERMISSION} granted for this organization"
                )))
            }
        }
    }
}

fn ensure_subject_owns_installation(
    installation: &TenantApplication,
    user_id: &str,
) -> Result<(), AppTokenExchangeError> {
    let owner = installation
        .owner_user_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            AppTokenExchangeError::Conflict(format!(
                "USER-scoped installation {} has no ownerUserId and cannot issue an application \
                 access token",
                installation.id
            ))
        })?;
    if owner != user_id {
        return Err(AppTokenExchangeError::Denied(
            "a personal application access token can only be issued to its owner".to_string(),
        ));
    }
    Ok(())
}

async fn ensure_active_tenant_membership(
    pg: &PgPool,
    tenant_id: &str,
    user_id: &str,
) -> Result<(), AppTokenExchangeError> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM iam_tenant_member \
         WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'",
    )
    .bind(tenant_id)
    .bind(user_id)
    .fetch_one(pg)
    .await
    .map_err(|error| {
        AppTokenExchangeError::Internal(format!("resolve tenant membership failed: {error}"))
    })?;
    if count > 0 {
        Ok(())
    } else {
        Err(AppTokenExchangeError::Denied(
            "caller is not an active member of this tenant".to_string(),
        ))
    }
}

async fn ensure_active_organization_membership(
    pg: &PgPool,
    tenant_id: &str,
    organization_id: &str,
    user_id: &str,
) -> Result<(), AppTokenExchangeError> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM iam_organization_membership \
         WHERE tenant_id = $1 AND organization_id = $2 AND user_id = $3 AND status = 'active'",
    )
    .bind(tenant_id)
    .bind(organization_id)
    .bind(user_id)
    .fetch_one(pg)
    .await
    .map_err(|error| {
        AppTokenExchangeError::Internal(format!("resolve organization membership failed: {error}"))
    })?;
    if count > 0 {
        Ok(())
    } else {
        Err(AppTokenExchangeError::Denied(
            "caller is not an active member of the organization that owns this application"
                .to_string(),
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn installation(ownership_scope: ApplicationOwnershipScope) -> TenantApplication {
        TenantApplication {
            id: "tapp_1".to_owned(),
            app_id: "runtime".to_owned(),
            tenant_id: "100001".to_owned(),
            organization_id: "42".to_owned(),
            instance_key: "instance".to_owned(),
            display_name: "App".to_owned(),
            environment: "production".to_owned(),
            application_type: "pc".to_owned(),
            status: "enabled".to_owned(),
            primary_domain: None,
            access_permissions: vec!["iam:self".to_owned()],
            runtime_config: json!({}),
            deploy_application_id: Some("381".to_owned()),
            ownership_scope,
            owner_user_id: Some("7".to_owned()),
        }
    }

    fn codes(values: &[&str]) -> Vec<String> {
        values.iter().map(|value| (*value).to_owned()).collect()
    }

    #[test]
    fn parse_requires_at_least_one_selector() {
        let error = UserApplicationTokenRequest::parse(&json!({ "environment": "production" }))
            .expect_err("a body without a selector must be refused");
        assert!(error.contains("appId"), "{error}");
    }

    #[test]
    fn parse_accepts_camel_case_and_snake_case_selectors() {
        let camel = UserApplicationTokenRequest::parse(&json!({ "appId": "381" }))
            .expect("camelCase appId");
        assert_eq!(camel.app_id.as_deref(), Some("381"));

        let snake = UserApplicationTokenRequest::parse(&json!({ "installation_id": "tapp_1" }))
            .expect("snake_case tenant_application_id");
        assert_eq!(snake.tenant_application_id.as_deref(), Some("tapp_1"));

        assert!(UserApplicationTokenRequest::parse(&json!({ "appId": "   " })).is_err());
    }

    #[test]
    fn parse_validates_the_scope_declaration_and_environment() {
        let request = UserApplicationTokenRequest::parse(&json!({
            "appId": "381",
            "environment": "production",
            "ownershipScope": "ORGANIZATION"
        }))
        .expect("valid hints");
        assert_eq!(request.environment.as_deref(), Some("production"));
        assert_eq!(request.ownership_scope.as_deref(), Some("ORGANIZATION"));

        let error = UserApplicationTokenRequest::parse(&json!({
            "appId": "381",
            "ownershipScope": "PLATFORM"
        }))
        .expect_err("unknown scope");
        assert!(error.contains("ownershipScope"), "{error}");
    }

    #[test]
    fn omitted_declaration_inherits_the_installation_scope() {
        for scope in [
            ApplicationOwnershipScope::Tenant,
            ApplicationOwnershipScope::Organization,
            ApplicationOwnershipScope::User,
        ] {
            assert_eq!(
                resolve_scope_declaration(None, &installation(scope)).expect("inherit"),
                None,
                "the installation decides {scope:?}"
            );
        }
    }

    #[test]
    fn explicit_declaration_must_agree_with_the_installation() {
        let tenant = installation(ApplicationOwnershipScope::Tenant);
        assert_eq!(
            resolve_scope_declaration(Some("TENANT"), &tenant).expect("agrees"),
            Some("TENANT".to_owned())
        );
        let error =
            resolve_scope_declaration(Some("USER"), &tenant).expect_err("scope is immutable");
        assert!(
            matches!(error, AppTokenExchangeError::Conflict(_)),
            "{error:?}"
        );
        assert!(
            error.message().contains("ownershipScope=TENANT"),
            "{}",
            error.message()
        );
    }

    #[test]
    fn tenant_capability_accepts_create_or_admin() {
        use IssuanceScope::Tenant;
        assert!(require_capability(Tenant, &codes(&["iam.app_tokens.create"])).is_ok());
        assert!(require_capability(Tenant, &codes(&["iam.app_tokens.admin"])).is_ok());
        assert!(require_capability(Tenant, &codes(&["iam.*"])).is_ok());
        let denied =
            require_capability(Tenant, &codes(&["iam.profile.read"])).expect_err("no capability");
        assert!(
            matches!(denied, AppTokenExchangeError::Denied(_)),
            "{denied:?}"
        );
        assert!(
            denied.message().contains("tenant-scope"),
            "{}",
            denied.message()
        );
    }

    #[test]
    fn organization_capability_requires_admin() {
        use IssuanceScope::Organization;
        assert!(require_capability(Organization, &codes(&["iam.app_tokens.admin"])).is_ok());
        assert!(require_capability(Organization, &codes(&["iam.*"])).is_ok());
        let denied = require_capability(Organization, &codes(&["iam.app_tokens.create"]))
            .expect_err("membership alone is not enough for an organization credential");
        assert!(
            matches!(denied, AppTokenExchangeError::Denied(_)),
            "{denied:?}"
        );
        assert!(
            denied.message().contains("organization"),
            "{}",
            denied.message()
        );
    }

    #[test]
    fn internal_request_carries_the_installations_tenant_and_organization() {
        let request = UserApplicationTokenRequest {
            app_id: Some("381".to_owned()),
            ..UserApplicationTokenRequest::default()
        };
        let internal = request.internal_request(
            "100001",
            &installation(ApplicationOwnershipScope::Organization),
            Some("ORGANIZATION"),
        );
        assert_eq!(internal.tenant_id, "100001");
        assert_eq!(internal.organization_id, "42");
        assert_eq!(internal.tenant_application_id.as_deref(), Some("tapp_1"));
        assert!(
            internal.app_id.is_none(),
            "the selector is narrowed to the row"
        );
        assert_eq!(internal.ownership_scope.as_deref(), Some("ORGANIZATION"));
    }

    #[test]
    fn lifecycle_keys_map_onto_coarse_claim_environments() {
        assert_eq!(environment_for_lifecycle("development"), Environment::Dev);
        assert_eq!(environment_for_lifecycle("test"), Environment::Test);
        assert_eq!(environment_for_lifecycle("production"), Environment::Prod);
        assert_eq!(environment_for_lifecycle("demo"), Environment::Prod);
    }

    #[test]
    fn owner_gate_is_owner_only_even_for_an_operator() {
        let app = installation(ApplicationOwnershipScope::User);
        assert!(ensure_subject_owns_installation(&app, "7").is_ok());
        assert!(matches!(
            ensure_subject_owns_installation(&app, "3"),
            Err(AppTokenExchangeError::Denied(_))
        ));
    }

    #[test]
    fn classify_maps_issuance_failures_onto_status_classes() {
        assert!(matches!(
            AppTokenExchangeError::classify_issuance_error(
                "tenant application was not found; register application and provision tenant \
                 application before issuing access credential"
                    .to_owned()
            ),
            AppTokenExchangeError::NotFound(_)
        ));
        assert!(matches!(
            AppTokenExchangeError::classify_issuance_error(
                "tenant application must be enabled before issuing access credential".to_owned()
            ),
            AppTokenExchangeError::Conflict(_)
        ));
        assert!(matches!(
            AppTokenExchangeError::classify_issuance_error(
                "deploy application 381 is not bound to an installation of tenant 100001"
                    .to_owned()
            ),
            AppTokenExchangeError::NotFound(_)
        ));
        assert!(matches!(
            AppTokenExchangeError::classify_issuance_error(
                "installation is not bound to a deploy application (安装未绑定部署应用): \
                 tenant application tapp_1 (appId runtime) has no deployApplicationId"
                    .to_owned()
            ),
            AppTokenExchangeError::Conflict(_)
        ));
        assert!(matches!(
            AppTokenExchangeError::classify_issuance_error(
                "resolve tenant membership failed: connection refused".to_owned()
            ),
            AppTokenExchangeError::Internal(_)
        ));
    }

    #[test]
    fn audit_detail_carries_identifiers_but_no_credential_material() {
        let installation = installation(ApplicationOwnershipScope::Tenant);
        let issued = IssuedAccessCredential {
            access_credential: "secret-access".to_owned(),
            auth_token: "secret-auth".to_owned(),
            session_id: "session-1".to_owned(),
            tenant_id: "100001".to_owned(),
            organization_id: "0".to_owned(),
            app_id: "381".to_owned(),
            tenant_application_id: "tapp_1".to_owned(),
            ownership_scope: ApplicationOwnershipScope::Tenant,
            environment: "production".to_owned(),
            expires_at: "2026-11-19T12:00:00Z".to_owned(),
        };
        let detail = app_token_audit_detail(&installation, &issued, "production");
        let rendered = detail.to_string();
        assert!(!rendered.contains("secret-access"), "{rendered}");
        assert!(!rendered.contains("secret-auth"), "{rendered}");
        assert_eq!(detail["appId"], "381");
        assert_eq!(detail["ownershipScope"], "TENANT");
        assert_eq!(detail["environment"], "production");
        assert_eq!(detail["sessionId"], "session-1");
    }

    #[test]
    fn error_message_is_the_public_detail() {
        let error = AppTokenExchangeError::Denied("not a member".to_owned());
        assert_eq!(error.message(), "not a member");
        assert_eq!(error.to_string(), "not a member");
    }
}
