//! User-facing application access token exchange.
//!
//! A signed-in user asks IAM for the access credential of an application they are
//! entitled to: their own personal (`USER`) installation, an installation released
//! to one of their organizations (`ORGANIZATION`), or any installation released to
//! their tenant (`TENANT`).
//!
//! The credential itself is minted by the single issuance path in
//! [`crate::access_token_issue`] — signed with the tenant signing key, persisted as
//! a revocable session, 1 hour TTL, scope intersection with the installation's
//! access permissions. This module owns only the entitlement decision and the
//! server-side request derivation, so no second signing or session path exists.
//!
//! Coupling rules:
//! - the tenant and the organization are taken from the installation and the
//!   authenticated session, never from the request body;
//! - the module reads IAM-owned tables only; resolving a deployment slug into its
//!   anchor is the deploy module's job (`sdkwork-deploy-app-token`).

use sqlx::PgPool;

use crate::access_token_issue::{
    issue_delegated_access_credential, resolve_installation_for_access_credential,
    AccessCredentialCreateRequest, IssuedAccessCredential,
};
use crate::application_registry::TenantApplication;
use crate::application_scope::ApplicationOwnershipScope;
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

/// Permission a tenant member needs to obtain a credential for a tenant- or
/// organization-released installation.
///
/// Personal (`USER`) installations are governed by ownership alone: the owner does
/// not need a platform permission to reach their own deployment.
pub const IAM_APP_TOKENS_CREATE_PERMISSION: &str = "iam.app_tokens.create";

/// Selectors a caller may use to name the application.
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
}

impl UserApplicationTokenRequest {
    /// Builds the selector request from an API body.
    ///
    /// Accepted keys are the camelCase wire names plus their snake_case aliases,
    /// matching every other IAM command body. `tenantId`/`organizationId`/
    /// `ownershipScope` are deliberately not accepted: they are server-derived.
    /// @param body - JSON request body.
    /// @returns the parsed selectors.
    /// @throws String when no selector is supplied.
    pub fn parse(body: &serde_json::Value) -> Result<Self, String> {
        let app_id = read_optional(body, &["appId", "app_id"]);
        let tenant_application_id =
            read_optional(body, &["tenantApplicationId", "tenant_application_id"]);
        let instance_key = read_optional(body, &["instanceKey", "instance_key"]);
        if app_id.is_none() && tenant_application_id.is_none() && instance_key.is_none() {
            return Err(
                "appId, tenantApplicationId, or instanceKey is required to name the application"
                    .to_string(),
            );
        }
        Ok(Self {
            app_id,
            tenant_application_id,
            instance_key,
        })
    }

    fn internal_request(
        &self,
        tenant_id: &str,
        installation: &TenantApplication,
    ) -> AccessCredentialCreateRequest {
        AccessCredentialCreateRequest {
            tenant_id: tenant_id.to_owned(),
            // Server-derived: the installation owns its organization claim. A
            // client-supplied organization id can never widen or narrow it.
            organization_id: installation.organization_id.clone(),
            tenant_application_id: Some(installation.id.clone()),
            app_id: None,
            instance_key: None,
            // No client declaration: the installation decides the release scope.
            ownership_scope: None,
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

/// Issues an application access credential for the authenticated caller.
///
/// @param pg - IAM PostgreSQL pool.
/// @param actor - the caller's authenticated session actor (tenant + user +
///   environment + deployment mode); a bootstrap/system actor is refused.
/// @param request - installation selectors from the request body.
/// @returns the signed access/auth pair and its session facts.
/// @throws [`AppTokenExchangeError`] naming the missing entitlement, unknown
///   installation, or unregistered environment.
pub async fn issue_user_application_access_credential(
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

    let selector = AccessCredentialCreateRequest {
        tenant_id: actor.tenant_id.clone(),
        organization_id: "0".to_owned(),
        tenant_application_id: request.tenant_application_id.clone(),
        app_id: request.app_id.clone(),
        instance_key: request.instance_key.clone(),
        ownership_scope: None,
    };
    let installation =
        resolve_installation_for_access_credential(pg, &actor.tenant_id, &selector)
            .await
            .map_err(AppTokenExchangeError::classify_issuance_error)?;
    ensure_actor_entitled_to_installation(pg, actor, &installation).await?;
    let internal = request.internal_request(&actor.tenant_id, &installation);
    issue_delegated_access_credential(pg, actor, &internal)
        .await
        .map_err(AppTokenExchangeError::classify_issuance_error)
}

/// Decides whether `actor` may receive a credential for `installation`.
///
/// - `USER`: the installation owner alone (a personal release is one person's
///   deployment; its isolation key ends in the owner's user id).
/// - `ORGANIZATION`: an active membership of the installation's organization.
/// - `TENANT`: an active tenant membership.
///
/// The caller's tenant is compared first, so a cross-tenant selector is refused
/// even if an installation row were somehow reachable.
/// @param pg - IAM PostgreSQL pool.
/// @param actor - authenticated caller.
/// @param installation - resolved installation.
/// @returns `Ok(())` when entitled.
/// @throws [`AppTokenExchangeError::Denied`] naming the failed relation.
pub async fn ensure_actor_entitled_to_installation(
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
            let owner = installation
                .owner_user_id
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .ok_or_else(|| {
                    AppTokenExchangeError::Conflict(format!(
                        "USER-scoped installation {} has no ownerUserId and cannot issue an \
                         application access token",
                        installation.id
                    ))
                })?;
            if owner != actor.user_id {
                return Err(AppTokenExchangeError::Denied(
                    "a personal application access token can only be issued to its owner"
                        .to_string(),
                ));
            }
            Ok(())
        }
        ApplicationOwnershipScope::Organization => {
            ensure_active_organization_membership(
                pg,
                &actor.tenant_id,
                &installation.organization_id,
                &actor.user_id,
            )
            .await
        }
        ApplicationOwnershipScope::Tenant => {
            ensure_active_tenant_membership(pg, &actor.tenant_id, &actor.user_id).await
        }
    }
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
        AppTokenExchangeError::Internal(format!(
            "resolve organization membership failed: {error}"
        ))
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

    #[test]
    fn parse_requires_at_least_one_selector() {
        let error = UserApplicationTokenRequest::parse(&json!({ "organizationId": "42" }))
            .expect_err("a body without a selector must be refused");
        assert!(error.contains("appId"), "{error}");
    }

    #[test]
    fn parse_accepts_camel_case_and_snake_case_selectors() {
        let camel = UserApplicationTokenRequest::parse(&json!({ "appId": "381764687714324480" }))
            .expect("camelCase appId");
        assert_eq!(camel.app_id.as_deref(), Some("381764687714324480"));

        let snake =
            UserApplicationTokenRequest::parse(&json!({ "tenant_application_id": "tapp_1" }))
                .expect("snake_case tenant_application_id");
        assert_eq!(snake.tenant_application_id.as_deref(), Some("tapp_1"));
        assert!(snake.app_id.is_none());

        let blank = UserApplicationTokenRequest::parse(&json!({ "appId": "   " }))
            .expect_err("a blank selector is not a selector");
        assert!(blank.contains("appId"), "{blank}");
    }

    #[test]
    fn internal_request_carries_the_installations_tenant_and_organization() {
        let installation = TenantApplication {
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
            ownership_scope: ApplicationOwnershipScope::Organization,
            owner_user_id: None,
        };
        let request = UserApplicationTokenRequest {
            app_id: Some("381".to_owned()),
            ..UserApplicationTokenRequest::default()
        };
        let internal = request.internal_request("100001", &installation);
        assert_eq!(internal.tenant_id, "100001");
        assert_eq!(internal.organization_id, "42");
        assert_eq!(internal.tenant_application_id.as_deref(), Some("tapp_1"));
        assert!(internal.app_id.is_none(), "the selector is narrowed to the row");
        assert!(
            internal.ownership_scope.is_none(),
            "scope is the installation's, never the caller's declaration"
        );
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
                "resolve tenant membership failed: connection refused".to_owned()
            ),
            AppTokenExchangeError::Internal(_)
        ));
    }

    #[test]
    fn error_message_is_the_public_detail() {
        let error = AppTokenExchangeError::Denied("not a member".to_owned());
        assert_eq!(error.message(), "not a member");
        assert_eq!(error.to_string(), "not a member");
    }
}
