//! Registered applications and tenant applications for IAM bootstrap flows.

use serde_json::{json, Value};
use sqlx::{types::Json, PgPool, Row};
use std::collections::BTreeSet;

use crate::application_scope::{
    resolve_installation_scope, ApplicationOwnershipScope, ResolvedInstallationScope,
};
use crate::installation_scope_cache::{
    get_installation_scope, insert_installation_scope, invalidate_installation_scope,
};

pub const IAM_TENANT_APPLICATIONS_PROVISION_PERMISSION: &str = "iam.tenant_applications.provision";
pub const IAM_TENANT_APPLICATIONS_UPDATE_PERMISSION: &str = "iam.tenant_applications.update";
pub const IAM_TENANT_APPLICATIONS_ENABLE_PERMISSION: &str = "iam.tenant_applications.enable";

/// Deterministic anchor of a tenant's platform installation.
///
/// The platform installation is the tenant's own IAM runtime (`app_<tenant>`).
/// The anchor only feeds the deterministic row id
/// (`tapp_<tenant>_0_sdkwork_platform`), so existing platform rows keep their
/// id now that application templates no longer exist.
pub const PLATFORM_INSTALLATION_ANCHOR: &str = "sdkwork_platform";

/// Environment variable carrying the deploy application id of this installation.
///
/// An installation is one-to-one with a deploy application
/// (`APPLICATION_IDENTITY_SPEC.md` §3), so a deployment that self-bootstraps its
/// platform installation must name that anchor explicitly. There is no fallback
/// to the IAM runtime `app_id`.
pub const DEPLOY_APPLICATION_ID_ENV: &str = "SDKWORK_DEPLOY_APPLICATION_ID";

/// Deterministic runtime app id for a tenant's default platform instance.
pub fn platform_runtime_app_id_for_tenant(tenant_id: &str) -> String {
    format!("app_{}", tenant_id.trim())
}

/// Command that provisions (creates or reconciles) one tenant application.
///
/// An installation is created from a **deploy application plus explicit
/// attributes**. [`Self::application_type`] is required; an empty
/// [`Self::access_permissions`] list is a valid explicit choice (the
/// installation grants no API scope); [`Self::runtime_config`] is optional and
/// defaults to no OAuth relying party. Application templates are retired, so
/// there is no template reference to fall back on.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TenantApplicationProvisionCommand {
    pub tenant_id: String,
    pub organization_id: String,
    /// Explicit runtime `app_id` (the OAuth client id by default). When absent a
    /// generated id is used, which leaves the instance unreachable as an OAuth
    /// client until an admin sets one.
    pub app_id: Option<String>,
    pub instance_key: String,
    pub display_name: String,
    pub environment: String,
    /// Product-semantic application type (`api` | `h5` | `pc` | `flutter` |
    /// `miniprogram` | `ios` | `android` | `harmonyos` | `desktop` | `other`).
    /// Required.
    pub application_type: Option<String>,
    pub primary_domain: Option<String>,
    /// Access permissions granted to the installation. An empty list is a valid
    /// explicit choice: the installation grants no API scope.
    pub access_permissions: Vec<String>,
    /// Explicit runtime config, including `oauth.relyingParty`. Optional; an
    /// absent or empty object registers no OAuth relying party.
    pub runtime_config: Value,
    /// Deployment application this installation serves. The column carries a
    /// partial unique index, so the one-to-one relation is enforced by the
    /// database rather than by convention.
    pub deploy_application_id: Option<String>,
    /// Release scope the caller asks for (`APPLICATION_IDENTITY_SPEC.md` §4.1).
    ///
    /// Absent means the default, `TENANT`. The value `MUST` agree with
    /// [`Self::organization_id`] and, for `USER`, with [`Self::owner_user_id`];
    /// the installation's stored scope is immutable, so re-provisioning with a
    /// different value is a conflict rather than an update.
    pub ownership_scope: Option<String>,
    /// Owner of a `USER`-scoped installation. Required for that level and
    /// rejected for the other two.
    pub owner_user_id: Option<String>,
    /// Replay-safe key for the cross-module provisioning call.
    pub provisioning_idempotency_key: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TenantApplicationUpdateCommand {
    pub primary_domain: Option<String>,
    pub domain_config: Option<Value>,
    pub access_permissions: Option<Vec<String>>,
    pub runtime_config: Option<Value>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TenantApplication {
    pub id: String,
    /// IAM runtime `app_id` (the OAuth client id) of the tenant application.
    ///
    /// This is the registration-plane identity: OAuth clients, API keys, and
    /// login sessions are keyed by it. It is **not** the deployment access
    /// token subject — see [`Self::deploy_application_id`].
    pub app_id: String,
    pub tenant_id: String,
    pub organization_id: String,
    pub instance_key: String,
    pub display_name: String,
    pub environment: String,
    pub application_type: String,
    pub status: String,
    pub primary_domain: Option<String>,
    pub access_permissions: Vec<String>,
    pub runtime_config: Value,
    /// Deployment application this installation serves (migration 0040).
    ///
    /// The deployment access token's `app_id` and `aud` are this value: the
    /// credential identifies the installation a host is serving, not the IAM
    /// tenant application's OAuth client id. `None` means the installation was
    /// never linked to a deployment, and token issuance fails closed instead of
    /// falling back to [`Self::app_id`].
    pub deploy_application_id: Option<String>,
    /// Release scope of this installation (`APPLICATION_IDENTITY_SPEC.md` §4.1):
    /// `TENANT`, `ORGANIZATION`, or `USER`. It decides the token's
    /// `ownership_scope` claim, its `organization_id`, and the isolation key the
    /// data plane filters by. Stored, never request-derived at issuance.
    pub ownership_scope: ApplicationOwnershipScope,
    /// Owner of a `USER`-scoped installation; `None` for the other two levels.
    pub owner_user_id: Option<String>,
}

/// Validates that `deploy_application_id` names an enabled installation of `tenant_id`.
///
/// This is the single application-identity gate. The identifier is the deploy
/// application anchor, never the IAM runtime `app_id`: the registration plane
/// (API keys), the credential-entry plane (deployment access token), and the
/// session plane all pass the anchor, so an installation without the deploy link
/// cannot authenticate anything.
pub async fn validate_enabled_tenant_runtime_app(
    pg: &PgPool,
    tenant_id: &str,
    deploy_application_id: &str,
) -> Result<(), String> {
    if crate::is_blank(Some(deploy_application_id)) {
        return Err("deploy application id is required".to_string());
    }

    let row = sqlx::query(
        "SELECT a.status, t.status \
         FROM iam_application_installation a \
         LEFT JOIN iam_tenant t ON t.id = a.tenant_id \
         WHERE a.tenant_id = $1 AND a.deploy_application_id = $2 \
         LIMIT 1",
    )
    .bind(tenant_id)
    .bind(deploy_application_id.trim())
    .fetch_optional(pg)
    .await
    .map_err(|error| format!("load tenant application by deploy application failed: {error}"))?;

    let application = row.map(|row| {
        let app_status: String = row.get(0);
        let tenant_status: Option<String> = row.get(1);
        (app_status, tenant_status)
    });
    ensure_enabled_installation(tenant_id, deploy_application_id, application)
}

/// Decision half of [`validate_enabled_tenant_runtime_app`].
///
/// Kept pure so the gate's fail-closed rules are unit-testable without a
/// database: `application` is the `(installation status, tenant status)` pair the
/// deploy-application lookup returned, or `None` when the anchor is unbound.
fn ensure_enabled_installation(
    tenant_id: &str,
    deploy_application_id: &str,
    application: Option<(String, Option<String>)>,
) -> Result<(), String> {
    if crate::is_blank(Some(deploy_application_id)) {
        return Err("deploy application id is required".to_string());
    }

    let Some((app_status, tenant_status)) = application else {
        return Err(format!(
            "deploy application {} is not bound to an enabled installation of tenant {tenant_id}; \
             provision the installation with deployApplicationId",
            deploy_application_id.trim()
        ));
    };

    let Some(tenant_status) = tenant_status else {
        return Err(format!("tenant {tenant_id} was not found"));
    };
    if tenant_status != "active" {
        return Err(format!(
            "tenant {tenant_id} is not active (status={tenant_status})"
        ));
    }
    if app_status != "enabled" {
        return Err(format!(
            "installation of deploy application {} must be enabled before use (status={app_status})",
            deploy_application_id.trim()
        ));
    }

    Ok(())
}

/// Reads this installation's configured deploy application id.
///
/// Self-bootstrapped installations (the platform installation, embedded
/// application manifests) must name their anchor from configuration. A missing
/// value is an explicit failure: silently inventing a deploy id, or falling back
/// to the IAM runtime `app_id`, would recreate the ambiguity
/// `APPLICATION_IDENTITY_SPEC.md` §2 removes.
///
/// # Errors
///
/// Returns an error naming [`DEPLOY_APPLICATION_ID_ENV`] when the variable is
/// unset or blank.
pub fn configured_deploy_application_id() -> Result<String, String> {
    deploy_application_id_from_configured_value(
        std::env::var(DEPLOY_APPLICATION_ID_ENV).ok().as_deref(),
        DEPLOY_APPLICATION_ID_ENV,
    )
}

fn deploy_application_id_from_configured_value(
    value: Option<&str>,
    source: &str,
) -> Result<String, String> {
    value
        .map(str::trim)
        .filter(|value| !crate::is_blank(Some(value)))
        .map(str::to_owned)
        .ok_or_else(|| {
            format!(
                "deploy application is not configured: set {source} to the deploy application id \
                 of this installation; an installation is one-to-one with a deploy application and \
                 must not be bootstrapped with the IAM runtime app id"
            )
        })
}

/// Returns the installation's bound deploy application anchor, if it has one.
fn bound_deploy_application_id(tenant_application: &TenantApplication) -> Option<&str> {
    tenant_application
        .deploy_application_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !crate::is_blank(Some(value)))
}

/// Resolves the `app_id`/`aud` subject of a deployment access token.
///
/// The subject is the installation's deploy application (migration 0040), not
/// the IAM tenant application's runtime `app_id`: the credential tells a host
/// which deployment it is serving. An installation that was never linked has no
/// deploy application to name, so this fails closed instead of signing the IAM
/// runtime id into the token — there is deliberately no fallback and no
/// dual-value issuance.
///
/// # Errors
///
/// Returns an error whose message states that the installation is not bound to a
/// deploy application when `deploy_application_id` is absent or blank.
pub fn resolve_access_token_app_id(
    tenant_application: &TenantApplication,
) -> Result<String, String> {
    bound_deploy_application_id(tenant_application)
        .map(str::to_owned)
        .ok_or_else(|| {
            format!(
                "installation is not bound to a deploy application (安装未绑定部署应用): \
                 tenant application {} (appId {}) has no deployApplicationId in \
                 iam_application_installation; provision the installation with deployApplicationId \
                 before issuing an access token",
                tenant_application.id, tenant_application.app_id
            )
        })
}

pub async fn ensure_platform_tenant_application(
    pg: &PgPool,
    tenant_id: &str,
) -> Result<String, String> {
    // Resolve the anchor before any mutation: a deployment without a configured
    // deploy application must not create an installation at all.
    let deploy_application_id = configured_deploy_application_id()?;
    ensure_platform_tenant_application_with_deploy_application(
        pg,
        tenant_id,
        deploy_application_id.as_str(),
    )
    .await
}

/// Ensures a tenant's platform installation is bound to an explicit anchor.
///
/// `ensure_platform_tenant_application` takes the anchor from
/// [`DEPLOY_APPLICATION_ID_ENV`]; callers that already hold the installation's
/// deploy application (a test fixture, a tenant provisioned by the deploy module)
/// pass it here so a process-wide default never has to stand in for a per-tenant
/// anchor.
pub async fn ensure_platform_tenant_application_with_deploy_application(
    pg: &PgPool,
    tenant_id: &str,
    deploy_application_id: &str,
) -> Result<String, String> {
    let deploy_application_id = deploy_application_id.trim().to_owned();
    if crate::is_blank(Some(deploy_application_id.as_str())) {
        return Err(format!(
            "deploy application is not configured for the platform installation of tenant {tenant_id}: \
             an installation is one-to-one with a deploy application and must not be bootstrapped with \
             the IAM runtime app id"
        ));
    }
    let runtime_app_id = platform_runtime_app_id_for_tenant(tenant_id);
    let now = chrono::Utc::now();

    let tenant_application_id =
        tenant_application_row_id(tenant_id, "0", PLATFORM_INSTALLATION_ANCHOR);
    ensure_deploy_application_unclaimed(
        pg,
        &deploy_application_id,
        tenant_application_id.as_str(),
    )
    .await?;
    // The platform installation is the tenant's own IAM runtime, so it is always
    // a TENANT release. Resetting it is a delete-plus-insert, which would
    // silently reclassify a row that a release scope was recorded for; refuse
    // instead of destroying the only record of that level.
    ensure_platform_installation_is_tenant_scoped(pg, tenant_id, &tenant_application_id).await?;
    sqlx::query("DELETE FROM iam_application_installation WHERE id = $1 OR app_id = $2")
        .bind(&tenant_application_id)
        .bind(&runtime_app_id)
        .execute(pg)
        .await
        .map_err(|error| format!("reset platform tenant application rows failed: {error}"))?;
    invalidate_installation_scope(tenant_id, &deploy_application_id);
    let primary_domain = resolve_tenant_application_primary_domain(
        pg,
        tenant_id,
        &tenant_application_id,
        "localhost",
        &runtime_app_id,
    )
    .await?;
    sqlx::query(
        "INSERT INTO iam_application_installation (id, app_id, tenant_id, organization_id, instance_key, \
         display_name, environment, application_type, status, primary_domain, domain_config_json, \
         access_permissions_json, runtime_config_json, provisioned_at, activated_at, created_at, \
         updated_at, deploy_application_id, ownership_scope) \
         VALUES ($1, $2, $3, '0', 'default', 'SDKWork Platform', 'prod', 'pc', 'enabled', $4, \
         '{}'::jsonb, '[\"iam:self\"]'::jsonb, '{}'::jsonb, $5, $5, $5, $5, $6, 'TENANT') \
         ON CONFLICT (id) DO UPDATE SET app_id = EXCLUDED.app_id, status = 'enabled', primary_domain = EXCLUDED.primary_domain, \
         access_permissions_json = EXCLUDED.access_permissions_json, deploy_application_id = EXCLUDED.deploy_application_id, \
         activated_at = EXCLUDED.activated_at, updated_at = EXCLUDED.updated_at",
    )
    .bind(&tenant_application_id)
    .bind(&runtime_app_id)
    .bind(tenant_id)
    .bind(&primary_domain)
    .bind(now)
    .bind(&deploy_application_id)
    .execute(pg)
    .await
    .map_err(|error| format!("ensure platform tenant application failed: {error}"))?;

    Ok(runtime_app_id)
}

/// Resolves the deploy application id of a tenant's platform installation.
///
/// The platform installation is this deployment's own installation, so it is
/// bootstrapped (or reconciled) from [`DEPLOY_APPLICATION_ID_ENV`] and then read
/// back: callers must not synthesize an IAM runtime app id in its place.
pub async fn platform_deploy_application_id_for_tenant(
    pg: &PgPool,
    tenant_id: &str,
) -> Result<String, String> {
    ensure_platform_tenant_application(pg, tenant_id).await?;
    let tenant_application_id =
        tenant_application_row_id(tenant_id, "0", PLATFORM_INSTALLATION_ANCHOR);
    let tenant_application = resolve_tenant_application(
        pg,
        tenant_id,
        Some(tenant_application_id.as_str()),
        None,
        None,
    )
    .await?
    .ok_or_else(|| {
        format!("platform installation for tenant {tenant_id} was not found after bootstrap")
    })?;
    resolve_access_token_app_id(&tenant_application)
}

/// Refuses to reset a platform installation that was released at another level.
///
/// [`ensure_platform_tenant_application_with_deploy_application`] replaces the
/// row (delete plus insert) to reconcile it with configuration. That is only
/// valid for a `TENANT` release: replacing an `ORGANIZATION` or `USER`
/// installation would drop its organization or owner pointer and silently widen
/// the application to the whole tenant (`APPLICATION_IDENTITY_SPEC.md` §4.1).
async fn ensure_platform_installation_is_tenant_scoped(
    pg: &PgPool,
    tenant_id: &str,
    tenant_application_id: &str,
) -> Result<(), String> {
    let row = sqlx::query(
        "SELECT id, ownership_scope FROM iam_application_installation \
         WHERE id = $1 AND tenant_id = $2 LIMIT 1",
    )
    .bind(tenant_application_id)
    .bind(tenant_id)
    .fetch_optional(pg)
    .await
    .map_err(|error| format!("load platform installation release scope failed: {error}"))?;
    let Some(row) = row else {
        return Ok(());
    };
    let stored: String = row.get(1);
    if ApplicationOwnershipScope::parse(&stored) == Some(ApplicationOwnershipScope::Tenant) {
        return Ok(());
    }
    Err(format!(
        "platform installation {tenant_application_id} of tenant {tenant_id} was released with \
         ownershipScope {stored} and must not be reset as a TENANT release; \
         publish the scoped application as its own installation"
    ))
}

/// Rejects a deploy application that is already bound to another installation.
///
/// The partial unique index `uk_iam_application_installation_deploy` enforces the
/// one-to-one relation; checking first turns a constraint violation into an
/// actionable error naming the conflicting installation.
async fn ensure_deploy_application_unclaimed(
    pg: &PgPool,
    deploy_application_id: &str,
    tenant_application_id: &str,
) -> Result<(), String> {
    let row = sqlx::query(
        "SELECT id, tenant_id FROM iam_application_installation \
         WHERE deploy_application_id = $1 AND id <> $2 \
         LIMIT 1",
    )
    .bind(deploy_application_id)
    .bind(tenant_application_id)
    .fetch_optional(pg)
    .await
    .map_err(|error| format!("load deploy application binding failed: {error}"))?;

    let Some(row) = row else {
        return Ok(());
    };
    let conflicting_id: String = row.get(0);
    let conflicting_tenant: String = row.get(1);
    Err(format!(
        "deploy application {deploy_application_id} is already bound to installation \
         {conflicting_id} of tenant {conflicting_tenant}; an installation is one-to-one with a \
         deploy application"
    ))
}

pub fn parse_tenant_application_provision_command(
    body: &Value,
) -> Result<TenantApplicationProvisionCommand, String> {
    let tenant_id = read_required_string(body, &["tenantId", "tenant_id"])?;
    let organization_id = read_required_string(body, &["organizationId", "organization_id"])?;
    let instance_key = read_required_string(body, &["instanceKey", "instance_key"])?;
    let display_name = read_optional_string(body, &["displayName", "display_name"])
        .unwrap_or_else(|| instance_key.clone());
    let environment = read_required_string(body, &["environment", "env"])?;
    let application_type = read_optional_string(body, &["applicationType", "application_type"]);
    let primary_domain = read_optional_string(body, &["primaryDomain", "primary_domain", "domain"]);
    let app_id = read_optional_string(body, &["appId", "app_id", "runtimeAppId", "runtime_app_id"]);
    let access_permissions = read_string_array(
        body,
        &[
            "accessPermissions",
            "access_permissions",
            "accessTokenPermissionScope",
            "access_token_permission_scope",
        ],
    )
    .unwrap_or_default();
    let runtime_config = body
        .get("runtimeConfig")
        .or_else(|| body.get("runtime_config"))
        .or_else(|| body.get("config"))
        .cloned()
        .unwrap_or_else(|| json!({}));

    let deploy_application_id = read_optional_string(
        body,
        &["deployApplicationId", "deploy_application_id"],
    );
    let ownership_scope = read_optional_string(body, &["ownershipScope", "ownership_scope"]);
    let owner_user_id = read_optional_string(body, &["ownerUserId", "owner_user_id"]);
    let provisioning_idempotency_key = read_optional_string(
        body,
        &["provisioningIdempotencyKey", "provisioning_idempotency_key"],
    );

    Ok(TenantApplicationProvisionCommand {
        tenant_id,
        organization_id,
        app_id,
        instance_key,
        display_name,
        environment,
        application_type,
        primary_domain,
        access_permissions,
        runtime_config,
        deploy_application_id,
        ownership_scope,
        owner_user_id,
        provisioning_idempotency_key,
    })
}

pub fn parse_tenant_application_update_command(
    body: &Value,
) -> Result<TenantApplicationUpdateCommand, String> {
    Ok(TenantApplicationUpdateCommand {
        primary_domain: read_optional_string(body, &["primaryDomain", "primary_domain", "domain"]),
        domain_config: body
            .get("domainConfig")
            .or_else(|| body.get("domain_config"))
            .cloned(),
        access_permissions: read_string_array(
            body,
            &[
                "accessPermissions",
                "access_permissions",
                "accessTokenPermissionScope",
                "access_token_permission_scope",
            ],
        ),
        runtime_config: body
            .get("runtimeConfig")
            .or_else(|| body.get("runtime_config"))
            .or_else(|| body.get("config"))
            .cloned(),
    })
}

/// Product-semantic application type value domain shared by tenant
/// application instances.
///
/// The value names the endpoint the installation serves, not the rendering
/// technology: `pc`/`h5` web surfaces, the two mini-program providers,
/// `flutter`, the three native mobile kinds, desktop, and API services.
/// Unknown explicit values collapse to `other` so a typo never becomes a new
/// vocabulary entry.
fn normalize_application_type(value: &str) -> String {
    let normalized = value.trim().to_ascii_lowercase().replace(['-', '_', ' '], "");
    match normalized.as_str() {
        "api" => "api",
        "h5" | "html" => "h5",
        "pc" | "react" | "vue" | "web" => "pc",
        "flutter" => "flutter",
        "miniprogram" | "miniapp" | "wechatminiprogram" | "wechatmini" => "miniprogram",
        "ios" | "iosnative" => "ios",
        "android" | "androidnative" => "android",
        "harmonyos" | "harmony" | "openharmony" => "harmonyos",
        "desktop" | "electron" | "tauri" => "desktop",
        "other" | "unknown" | "none" => "other",
        _ => "other",
    }
    .to_owned()
}

/// Maps an application manifest `appType` (PlusProjectType) onto the
/// product-semantic application type used by tenant application instances.
///
/// `APP_UNIAPP` is the cross-platform mini-program family, so it maps to
/// `miniprogram` rather than to the web type its shell also renders. The
/// deployment kind remains the authority for the concrete endpoint; this value
/// is the IAM catalogue facet and must stay aligned with it.
pub(crate) fn map_manifest_app_type_to_application_type(manifest_app_type: &str) -> String {
    match manifest_app_type.trim().to_ascii_uppercase().as_str() {
        "APP_HTML" | "APP_H5" | "H5" => "h5",
        "APP_FLUTTER" | "FLUTTER" => "flutter",
        "APP_REACT" | "APP_VUE" | "APP_PC" | "PC" | "WEB" => "pc",
        "APP_UNIAPP" | "APP_MINIPROGRAM" | "APP_MINI_PROGRAM" | "MINIPROGRAM" | "MINI_PROGRAM" => {
            "miniprogram"
        }
        "APP_IOS" | "APP_IOS_NATIVE" | "IOS" => "ios",
        "APP_ANDROID" | "APP_ANDROID_NATIVE" | "ANDROID" => "android",
        "APP_HARMONY" | "APP_HARMONYOS" | "HARMONYOS" => "harmonyos",
        "APP_DESKTOP" | "DESKTOP" | "ELECTRON" | "TAURI" => "desktop",
        "APP_API" | "API" | "SDK" => "api",
        _ => "other",
    }
    .to_owned()
}

/// Chooses the installation row a provisioning command targets.
///
/// Order: the row already bound to the command's deploy application wins, then
/// the instance-key row. A fallback row that already names a *different* deploy
/// application is a conflict — silently re-pointing its link would break the
/// one-to-one relation `uk_iam_application_installation_deploy` exists to enforce.
fn select_provision_target(
    deploy_match: Option<TenantApplication>,
    instance_key_match: Option<TenantApplication>,
    requested_deploy_application_id: Option<&str>,
) -> Result<Option<TenantApplication>, String> {
    if let Some(existing) = deploy_match {
        return Ok(Some(existing));
    }
    let Some(existing) = instance_key_match else {
        return Ok(None);
    };
    if let Some(requested) = requested_deploy_application_id {
        if let Some(bound) = bound_deploy_application_id(&existing) {
            if bound != requested {
                return Err(format!(
                    "tenant application {} is already bound to deploy application {bound}; \
                     deploy application {requested} needs its own installation and must not \
                     overwrite the existing deploy application link",
                    existing.id
                ));
            }
        }
    }
    Ok(Some(existing))
}

/// Installation attributes a provisioning command derives for itself.
///
/// Kept separate from [`provision_tenant_application`] so the derivation is
/// unit-testable without a database.
#[derive(Debug, Clone, PartialEq)]
struct ResolvedProvisionAttributes {
    application_type: String,
    access_permissions: Vec<String>,
    runtime_config: Value,
    scope: ResolvedInstallationScope,
}

/// Derives the installation attributes of one provisioning command.
///
/// `applicationType` is required because nothing else can supply it now that the
/// template model is retired. An empty `accessPermissions` list is a **valid
/// explicit choice**: it means the installation grants no API scope, so it is
/// carried through as an empty list instead of being replaced by a default or
/// rejected.
fn resolve_provision_attributes(
    command: &TenantApplicationProvisionCommand,
) -> Result<ResolvedProvisionAttributes, String> {
    let application_type = match command.application_type.as_deref() {
        Some(value) if !crate::is_blank(Some(value)) => normalize_application_type(value),
        _ => {
            return Err(
                "applicationType is required to provision a tenant application".to_string(),
            )
        }
    };

    let access_permissions = command.access_permissions.clone();

    // No template means no inherited runtime config: an installation registers an
    // OAuth relying party only when the command states one itself.
    let runtime_config = if command
        .runtime_config
        .as_object()
        .is_some_and(|object| !object.is_empty())
    {
        command.runtime_config.clone()
    } else {
        json!({})
    };

    Ok(ResolvedProvisionAttributes {
        application_type,
        access_permissions,
        runtime_config,
        // The release scope and its pointer are validated before any database
        // lookup, so a mismatched command fails on its own inputs.
        scope: resolve_installation_scope(
            command.ownership_scope.as_deref(),
            &command.organization_id,
            command.owner_user_id.as_deref(),
        )?,
    })
}

/// Recognizes the validation errors a provisioning command produces.
///
/// HTTP handlers use this predicate to answer with a client error instead of a
/// service-unavailable one.
pub fn is_provision_attribute_error(message: &str) -> bool {
    message.contains("is required to provision a tenant application")
        || message.contains("ownershipScope")
        || message.contains("ownership scope")
        || message.contains("ownerUserId")
        || message.contains("organizationId is required to provision")
        // Immutable identity/scope attributes are client errors, not outages:
        // the command contradicts an existing installation.
        || message.contains("is immutable")
        || message.contains("is released to organization")
}

/// Deterministic installation anchor used to build the installation row id.
///
/// The deploy application is the installation identity; without one the required
/// instance key supplies the per-tenant identity. It is only an id-building
/// input: the anchor itself is `deploy_application_id` on the row.
fn tenant_application_anchor(
    command: &TenantApplicationProvisionCommand,
) -> Result<&str, String> {
    if let Some(deploy_application_id) = command
        .deploy_application_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        return Ok(deploy_application_id);
    }
    let instance_key = command.instance_key.trim();
    if instance_key.is_empty() {
        return Err(
            "deployApplicationId or instanceKey is required to provision a tenant application"
                .to_string(),
        );
    }
    Ok(instance_key)
}

pub async fn provision_tenant_application(
    pg: &PgPool,
    command: &TenantApplicationProvisionCommand,
) -> Result<TenantApplication, String> {
    // Derive the attributes before any dedupe lookup so an incomplete command
    // fails on its own inputs instead of on a lookup.
    let attributes = resolve_provision_attributes(command)?;

    let now = chrono::Utc::now();
    let requested_deploy_application_id = command
        .deploy_application_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !crate::is_blank(Some(value)));
    // Deploy-application-first dedupe: the anchor is the installation identity
    // (`APPLICATION_IDENTITY_SPEC.md` §3), so a re-provision of the same anchor
    // must reuse its row even when another deployment with the same instance key
    // exists. Falling back to the instance key only after that miss keeps the
    // idempotency for anchorless registrations, and the selected row must not
    // already name a *different* anchor.
    let deploy_match = match requested_deploy_application_id {
        Some(deploy_application_id) => {
            resolve_tenant_application_by_deploy_application_id(
                pg,
                &command.tenant_id,
                deploy_application_id,
            )
            .await?
        }
        None => None,
    };
    let instance_key_match = if deploy_match.is_some() {
        None
    } else {
        find_tenant_application_by_instance_key(pg, &command.tenant_id, &command.instance_key).await?
    };
    let existing =
        select_provision_target(deploy_match, instance_key_match, requested_deploy_application_id)?;
    let tenant_application_id = match existing.as_ref() {
        Some(app) => app.id.clone(),
        None => tenant_application_row_id(
            &command.tenant_id,
            &command.organization_id,
            tenant_application_anchor(command)?,
        ),
    };
    let runtime_app_id = match existing.as_ref() {
        Some(app) => app.app_id.clone(),
        None => match command
            .app_id
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            Some(app_id) => {
                crate::oauth_relying_party_registration::validate_oauth_client_id(app_id)
                    .map_err(|error| format!("invalid tenant application appId: {error}"))?;
                app_id.to_owned()
            }
            None => format!("app_{}", uuid::Uuid::now_v7()),
        },
    };
    if let (Some(app), Some(requested)) = (
        existing.as_ref(),
        command
            .app_id
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty()),
    ) {
        if app.app_id != requested {
            return Err(format!(
                "tenant application appId {} is immutable and cannot be re-provisioned as {requested}",
                app.app_id
            ));
        }
    }
    let existing_relying_party = existing
        .as_ref()
        .and_then(|app| app.runtime_config.pointer("/oauth/relyingParty"));

    // The release scope is immutable (`APPLICATION_IDENTITY_SPEC.md` §4.1 rule 2):
    // changing it in place would re-interpret every stored row under a different
    // isolation key. A re-provision that *declares* another level is a conflict
    // naming the stored level, never an update; an omitted level keeps it.
    if let Some(app) = existing.as_ref() {
        if let Some(requested_scope) =
            ApplicationOwnershipScope::parse_optional(command.ownership_scope.as_deref())?
        {
            if requested_scope != app.ownership_scope {
                return Err(format!(
                    "tenant application {} was released with ownershipScope {} and is immutable; \
                     publishing it as {} needs a new installation",
                    app.id,
                    app.ownership_scope.as_str(),
                    requested_scope.as_str()
                ));
            }
        }
        if let (Some(stored_owner), Some(requested_owner)) = (
            app.owner_user_id.as_deref(),
            attributes.scope.owner_user_id.as_deref(),
        ) {
            if stored_owner != requested_owner {
                return Err(format!(
                    "tenant application {} belongs to owner {stored_owner} and is immutable; \
                     a different owner needs a new installation",
                    app.id
                ));
            }
        }
        // An organization release is bound to its organization: re-provisioning
        // it with the tenant sentinel would contradict its CHECK constraint, so
        // it is refused here with a message that names the stored organization.
        if app.ownership_scope == ApplicationOwnershipScope::Organization
            && app.organization_id != command.organization_id
        {
            return Err(format!(
                "tenant application {} is released to organization {} and is immutable; \
                 organizationId {} needs a new installation",
                app.id, app.organization_id, command.organization_id
            ));
        }
    }

    // Re-provisioning an existing instance merges over its stored config so
    // unrelated admin edits survive. Normalization then validates and hashes the
    // OAuth relying party before it reaches storage.
    let requested_runtime_config = attributes.runtime_config.clone();
    let merged_runtime_config = existing
        .as_ref()
        .map(|app| merge_runtime_config_patch(&app.runtime_config, &requested_runtime_config))
        .unwrap_or(requested_runtime_config);
    let runtime_config = normalize_runtime_config_oauth(
        &merged_runtime_config,
        &runtime_app_id,
        existing_relying_party,
    )?;
    ensure_relying_party_client_id_available(
        pg,
        &tenant_application_id,
        &runtime_app_id,
        &runtime_config,
    )
    .await?;

    if existing.is_some() {
        sqlx::query(
            "UPDATE iam_application_installation SET organization_id = $2, display_name = $3, \
             environment = $4, application_type = $5, primary_domain = $6, \
             access_permissions_json = $7, runtime_config_json = $8, \
             last_synced_at = $9, updated_at = $10, \
             deploy_application_id = COALESCE($11, deploy_application_id), \
             provisioning_idempotency_key = COALESCE($12, provisioning_idempotency_key), \
             owner_user_id = COALESCE(owner_user_id, $13) \
             WHERE id = $1",
        )
        .bind(&tenant_application_id)
        .bind(&command.organization_id)
        .bind(&command.display_name)
        .bind(&command.environment)
        .bind(&attributes.application_type)
        .bind(&command.primary_domain)
        .bind(Json(&attributes.access_permissions))
        .bind(Json(&runtime_config))
        .bind(now)
        .bind(now)
        .bind(command.deploy_application_id.as_deref())
        .bind(command.provisioning_idempotency_key.as_deref())
        .bind(attributes.scope.owner_user_id.as_deref())
        .execute(pg)
        .await
        .map_err(|error| format!("update tenant application failed: {error}"))?;
    } else {
        sqlx::query(
            "INSERT INTO iam_application_installation (id, app_id, tenant_id, organization_id, instance_key, \
             display_name, environment, application_type, status, primary_domain, domain_config_json, \
             access_permissions_json, runtime_config_json, provisioned_at, last_synced_at, created_at, \
             updated_at, deploy_application_id, provisioning_idempotency_key, ownership_scope, owner_user_id) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_config', $9, '{}'::jsonb, $10, $11, \
             $12, $13, $14, $15, $16, $17, $18, $19)",
        )
        .bind(&tenant_application_id)
        .bind(&runtime_app_id)
        .bind(&command.tenant_id)
        .bind(&command.organization_id)
        .bind(&command.instance_key)
        .bind(&command.display_name)
        .bind(&command.environment)
        .bind(&attributes.application_type)
        .bind(&command.primary_domain)
        .bind(Json(&attributes.access_permissions))
        .bind(Json(&runtime_config))
        .bind(now)
        .bind(now)
        .bind(now)
        .bind(now)
        .bind(command.deploy_application_id.as_deref())
        .bind(command.provisioning_idempotency_key.as_deref())
        .bind(attributes.scope.scope.as_str())
        .bind(attributes.scope.owner_user_id.as_deref())
        .execute(pg)
        .await
        .map_err(|error| format!("insert tenant application failed: {error}"))?;
    }

    // A write changes the installation's release scope (creation) or its owner
    // pointer, so a cached level for this anchor must not survive it. The cache
    // is keyed by the token subject — the deploy application anchor.
    if let Some(anchor) = command
        .deploy_application_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        invalidate_installation_scope(&command.tenant_id, anchor);
    }

    resolve_tenant_application(
        pg,
        &command.tenant_id,
        Some(&tenant_application_id),
        None,
        None,
    )
    .await?
    .ok_or_else(|| "tenant application provision completed but lookup failed".to_string())
}

pub async fn update_tenant_application(
    pg: &PgPool,
    tenant_id: &str,
    tenant_application_id: &str,
    command: &TenantApplicationUpdateCommand,
) -> Result<TenantApplication, String> {
    let existing =
        resolve_tenant_application(pg, tenant_id, Some(tenant_application_id), None, None)
            .await?
            .ok_or_else(|| "tenant application was not found".to_string())?;

    let primary_domain = command
        .primary_domain
        .clone()
        .or(existing.primary_domain.clone());
    let access_permissions = command
        .access_permissions
        .clone()
        .unwrap_or(existing.access_permissions.clone());
    let domain_config = command.domain_config.clone().unwrap_or_else(|| json!({}));
    let runtime_config = command.runtime_config.clone().unwrap_or_else(|| json!({}));
    // Merge first so a partial relying-party patch (for example only
    // `enabled`) inherits the stored redirect URIs and scopes instead of
    // failing validation, then canonicalize the result.
    let candidate_runtime_config =
        merge_runtime_config_patch(&existing.runtime_config, &runtime_config);
    let merged_runtime_config = normalize_runtime_config_oauth(
        &candidate_runtime_config,
        &existing.app_id,
        existing.runtime_config.pointer("/oauth/relyingParty"),
    )?;
    ensure_relying_party_client_id_available(
        pg,
        &existing.id,
        &existing.app_id,
        &merged_runtime_config,
    )
    .await?;
    let now = chrono::Utc::now();

    sqlx::query(
        "UPDATE iam_application_installation SET primary_domain = $2, domain_config_json = $3, \
         access_permissions_json = $4, runtime_config_json = $5::jsonb, \
         updated_at = $6 \
         WHERE id = $1 AND tenant_id = $7",
    )
    .bind(tenant_application_id)
    .bind(&primary_domain)
    .bind(Json(&domain_config))
    .bind(Json(&access_permissions))
    .bind(Json(&merged_runtime_config))
    .bind(now)
    .bind(tenant_id)
    .execute(pg)
    .await
    .map_err(|error| format!("update tenant application failed: {error}"))?;

    resolve_tenant_application(pg, tenant_id, Some(tenant_application_id), None, None)
        .await?
        .ok_or_else(|| "tenant application update completed but lookup failed".to_string())
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EnsureTenantApplicationCommand {
    pub owner_tenant_id: String,
    pub app_key: String,
    pub name: String,
    pub display_name: String,
    /// Resolved product-semantic application type (`api|h5|pc|flutter|miniprogram|ios|android|harmonyos|desktop|other`).
    ///
    /// The embedded bootstrap resolves it from the manifest runtime surface, so
    /// this is not necessarily the raw `app.appType` framework family.
    pub app_type: String,
    pub version: String,
    pub channel: String,
    pub default_access_permissions: Vec<String>,
    pub tenant_id: String,
    pub organization_id: String,
    pub instance_key: String,
    pub environment: String,
    pub primary_domain: String,
    pub runtime_app_id: String,
    /// Deploy application anchor of this installation (migration 0040).
    ///
    /// Required for the installation's own runtime identity: embedded bootstrap
    /// takes it from the application manifest, and an installation without an
    /// anchor must not be created. An explicit additional runtime binding is a
    /// surface of the same deployment (PC/H5/mobile of one product) and carries
    /// `None`, because `uk_iam_application_installation_deploy` makes the anchor
    /// one-to-one and a surface must not compete for it.
    pub deploy_application_id: Option<String>,
    /// `oauth.relyingParty` declared by the application manifest. Applied only
    /// when the auto-registration policy allows it for this lifecycle.
    pub oauth_relying_party: Option<Value>,
}

/// Deterministic installation row id from its identity anchor.
///
/// The anchor is the deploy application id, the application key, or the instance
/// key depending on the provisioning path; a `tmpl_` prefix is stripped for
/// backward compatibility with rows created under the retired template model, so
/// existing manifest installations keep their id.
pub fn tenant_application_row_id(
    tenant_id: &str,
    organization_id: &str,
    anchor: &str,
) -> String {
    let suffix = anchor
        .strip_prefix("tmpl_")
        .unwrap_or(anchor)
        .replace('-', "_");
    format!("tapp_{tenant_id}_{organization_id}_{suffix}")
}

pub fn tenant_application_instance_key(app_key: &str, environment: &str) -> String {
    let normalized = app_key.trim().replace('-', "_");
    let env_suffix = if environment.eq_ignore_ascii_case("development")
        || environment.eq_ignore_ascii_case("dev")
    {
        "dev"
    } else if environment.eq_ignore_ascii_case("production")
        || environment.eq_ignore_ascii_case("prod")
    {
        "prod"
    } else {
        let trimmed = environment.trim();
        if trimmed.is_empty() {
            "default"
        } else {
            return format!("{normalized}_{}", trimmed.replace('-', "_"));
        }
    };
    format!("{normalized}_{env_suffix}")
}

pub fn derive_tenant_application_primary_domain_candidate(
    requested: &str,
    runtime_app_id: &str,
    attempt: u32,
) -> String {
    let requested = requested.trim();
    if requested.is_empty() {
        return String::new();
    }
    if attempt == 0 {
        return requested.to_owned();
    }
    if attempt == 1 {
        return format!("{runtime_app_id}.{requested}");
    }
    format!("{runtime_app_id}-{attempt}.{requested}")
}

async fn find_tenant_application_id_by_primary_domain(
    pg: &PgPool,
    tenant_id: &str,
    primary_domain: &str,
) -> Result<Option<String>, String> {
    let row = sqlx::query_scalar::<_, String>(
        "SELECT id FROM iam_application_installation \
         WHERE tenant_id = $1 AND primary_domain = $2 \
         LIMIT 1",
    )
    .bind(tenant_id)
    .bind(primary_domain)
    .fetch_optional(pg)
    .await
    .map_err(|error| format!("load tenant application by primary domain failed: {error}"))?;
    Ok(row)
}

async fn resolve_tenant_application_primary_domain(
    pg: &PgPool,
    tenant_id: &str,
    tenant_application_id: &str,
    requested_primary_domain: &str,
    runtime_app_id: &str,
) -> Result<String, String> {
    let requested = requested_primary_domain.trim();
    if requested.is_empty() {
        return Err("primaryDomain is required for tenant application bootstrap".to_string());
    }

    for attempt in 0..8 {
        let candidate =
            derive_tenant_application_primary_domain_candidate(requested, runtime_app_id, attempt);
        let existing_id =
            find_tenant_application_id_by_primary_domain(pg, tenant_id, &candidate).await?;
        match existing_id {
            None => return Ok(candidate),
            Some(existing_id) if existing_id == tenant_application_id => return Ok(candidate),
            Some(_) => continue,
        }
    }

    Err(format!(
        "unable to resolve unique primaryDomain for tenant {tenant_id} runtimeAppId {runtime_app_id}"
    ))
}

async fn clear_postgres_tenant_application_competing_rows(
    pg: &PgPool,
    command: &EnsureTenantApplicationCommand,
    keep_id: &str,
) -> Result<u64, String> {
    let result = sqlx::query(
        "DELETE FROM iam_application_installation \
         WHERE tenant_id = $1 \
           AND id <> $2 \
           AND ownership_scope = 'TENANT' \
           AND ( \
             app_id = $3 OR \
             (organization_id = $4 AND instance_key = $5) \
           )",
    )
    .bind(&command.tenant_id)
    .bind(keep_id)
    .bind(&command.runtime_app_id)
    .bind(&command.organization_id)
    .bind(&command.instance_key)
    .execute(pg)
    .await
    .map_err(|error| format!("clear competing tenant application rows failed: {error}"))?;

    Ok(result.rows_affected())
}

async fn upsert_tenant_application_row(
    pg: &PgPool,
    command: &EnsureTenantApplicationCommand,
) -> Result<String, String> {
    let tenant_application_id = resolve_tenant_application_row_id(pg, command).await?;
    clear_postgres_tenant_application_competing_rows(
        pg,
        command,
        tenant_application_id.as_str(),
    )
    .await?;
    let primary_domain = resolve_tenant_application_primary_domain(
        pg,
        &command.tenant_id,
        tenant_application_id.as_str(),
        &command.primary_domain,
        &command.runtime_app_id,
    )
    .await?;
    let now = chrono::Utc::now();
    let application_type = map_manifest_app_type_to_application_type(&command.app_type);
    if let Some(deploy_application_id) = command
        .deploy_application_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        ensure_deploy_application_unclaimed(pg, deploy_application_id, tenant_application_id.as_str())
            .await?;
    }

    // Manifest-driven OAuth registration lands here. The patch is merged over
    // whatever an admin already configured so a restart never drops an edited
    // redirect URI or a stored secret hash.
    let existing_runtime_config =
        load_tenant_application_runtime_config(pg, &tenant_application_id).await?;
    let runtime_config_patch = bootstrap_oauth_runtime_config_patch(
        command,
        existing_runtime_config.pointer("/oauth/relyingParty"),
    )?;
    let runtime_config =
        merge_runtime_config_patch(&existing_runtime_config, &runtime_config_patch);
    ensure_relying_party_client_id_available(
        pg,
        &tenant_application_id,
        &command.runtime_app_id,
        &runtime_config,
    )
    .await?;

    sqlx::query(
        "INSERT INTO iam_application_installation (id, app_id, tenant_id, organization_id, instance_key, \
         display_name, environment, application_type, status, primary_domain, domain_config_json, \
         access_permissions_json, runtime_config_json, provisioned_at, last_synced_at, created_at, \
         updated_at, deploy_application_id) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_config', $9, '{}'::jsonb, $10, $11, \
         $12, $13, $14, $15, $16) \
         ON CONFLICT (id) DO UPDATE SET \
           app_id = EXCLUDED.app_id, \
           tenant_id = EXCLUDED.tenant_id, \
           organization_id = CASE \
             WHEN iam_application_installation.ownership_scope = 'TENANT' \
               THEN EXCLUDED.organization_id \
             ELSE iam_application_installation.organization_id \
           END, \
           instance_key = EXCLUDED.instance_key, \
           display_name = EXCLUDED.display_name, \
           environment = EXCLUDED.environment, \
           application_type = EXCLUDED.application_type, \
           primary_domain = EXCLUDED.primary_domain, \
           access_permissions_json = EXCLUDED.access_permissions_json, \
           runtime_config_json = EXCLUDED.runtime_config_json, \
           deploy_application_id = COALESCE(EXCLUDED.deploy_application_id, iam_application_installation.deploy_application_id), \
           last_synced_at = EXCLUDED.last_synced_at, \
           updated_at = EXCLUDED.updated_at",
    )
    .bind(&tenant_application_id)
    .bind(&command.runtime_app_id)
    .bind(&command.tenant_id)
    .bind(&command.organization_id)
    .bind(&command.instance_key)
    .bind(&command.display_name)
    .bind(&command.environment)
    .bind(&application_type)
    .bind(&primary_domain)
    .bind(Json(&command.default_access_permissions))
    .bind(Json(&runtime_config))
    .bind(now)
    .bind(now)
    .bind(now)
    .bind(now)
    .bind(
        command
            .deploy_application_id
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty()),
    )
    .execute(pg)
    .await
    .map_err(|error| format!("upsert tenant application failed: {error}"))?;

    if let Some(anchor) = command
        .deploy_application_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        invalidate_installation_scope(&command.tenant_id, anchor);
    }

    Ok(tenant_application_id)
}

/// Resolves the installation row a manifest bootstrap command targets.
///
/// The row already bound to the runtime `app_id` wins, then the instance-key row,
/// then the deterministic id. The canonical id uses the application key as its
/// anchor, which reproduces the id created under the retired template model
/// (`tmpl_<app_key>` minus the prefix).
async fn resolve_tenant_application_row_id(
    pg: &PgPool,
    command: &EnsureTenantApplicationCommand,
) -> Result<String, String> {
    let anchor = if command.app_key.trim().is_empty() {
        command.instance_key.trim()
    } else {
        command.app_key.trim()
    };
    let canonical_id =
        tenant_application_row_id(&command.tenant_id, &command.organization_id, anchor);

    if let Some(existing) =
        find_tenant_application_by_runtime_app_id(pg, &command.tenant_id, &command.runtime_app_id)
            .await?
    {
        return Ok(existing.id);
    }

    if let Some(existing) =
        find_tenant_application_by_instance_key(pg, &command.tenant_id, &command.instance_key)
            .await?
    {
        return Ok(existing.id);
    }

    Ok(canonical_id)
}
pub async fn ensure_tenant_application_runtime(
    pg: &PgPool,
    command: &EnsureTenantApplicationCommand,
) -> Result<TenantApplication, String> {
    if command.default_access_permissions.is_empty() {
        return Err("defaultAccessPermissions is required and must not be empty".to_string());
    }
    if crate::is_blank(Some(command.runtime_app_id.as_str())) {
        return Err("runtime appId is required".to_string());
    }
    if command
        .deploy_application_id
        .as_deref()
        .map(str::trim)
        .is_some_and(str::is_empty)
    {
        return Err(
            "deployApplicationId must not be blank: an installation is one-to-one with a deploy application"
                .to_string(),
        );
    }

    let tenant_application_id = upsert_tenant_application_row(pg, command).await?;

    let enabled = enable_tenant_application(pg, &command.tenant_id, &tenant_application_id).await?;
    resolve_tenant_application(
        pg,
        &command.tenant_id,
        Some(&tenant_application_id),
        None,
        None,
    )
    .await?
    .ok_or_else(|| {
        format!(
            "tenant application {tenant_application_id} was not found after bootstrap enable (status={})",
            enabled.status
        )
    })
}

pub async fn enable_tenant_application(
    pg: &PgPool,
    tenant_id: &str,
    tenant_application_id: &str,
) -> Result<TenantApplication, String> {
    let existing =
        resolve_tenant_application(pg, tenant_id, Some(tenant_application_id), None, None)
            .await?
            .ok_or_else(|| "tenant application was not found".to_string())?;

    if existing
        .primary_domain
        .as_deref()
        .is_none_or(|value| crate::is_blank(Some(value)))
    {
        return Err(
            "primaryDomain must be configured before enabling tenant application".to_string(),
        );
    }
    if existing.access_permissions.is_empty() {
        return Err(
            "accessPermissions must be configured before enabling tenant application".to_string(),
        );
    }

    let now = chrono::Utc::now();
    sqlx::query(
        "UPDATE iam_application_installation SET status = 'enabled', activated_at = $2, updated_at = $2 \
         WHERE id = $1 AND tenant_id = $3",
    )
    .bind(tenant_application_id)
    .bind(now)
    .bind(tenant_id)
    .execute(pg)
    .await
    .map_err(|error| format!("enable tenant application failed: {error}"))?;

    resolve_tenant_application(pg, tenant_id, Some(tenant_application_id), None, None)
        .await?
        .ok_or_else(|| "tenant application enable completed but lookup failed".to_string())
}

pub async fn disable_tenant_application(
    pg: &PgPool,
    tenant_id: &str,
    tenant_application_id: &str,
) -> Result<TenantApplication, String> {
    resolve_tenant_application(pg, tenant_id, Some(tenant_application_id), None, None)
        .await?
        .ok_or_else(|| "tenant application was not found".to_string())?;

    let now = chrono::Utc::now();
    sqlx::query(
        "UPDATE iam_application_installation SET status = 'disabled', updated_at = $2 \
         WHERE id = $1 AND tenant_id = $3",
    )
    .bind(tenant_application_id)
    .bind(now)
    .bind(tenant_id)
    .execute(pg)
    .await
    .map_err(|error| format!("disable tenant application failed: {error}"))?;

    resolve_tenant_application(pg, tenant_id, Some(tenant_application_id), None, None)
        .await?
        .ok_or_else(|| "tenant application disable completed but lookup failed".to_string())
}

pub async fn resolve_tenant_application(
    pg: &PgPool,
    tenant_id: &str,
    tenant_application_id: Option<&str>,
    runtime_app_id: Option<&str>,
    instance_key: Option<&str>,
) -> Result<Option<TenantApplication>, String> {
    let row = if let Some(id) = tenant_application_id.filter(|value| !crate::is_blank(Some(value))) {
        sqlx::query(
            "SELECT id, app_id, tenant_id, organization_id, instance_key, display_name, environment, status, primary_domain, access_permissions_json, runtime_config_json, application_type, deploy_application_id, ownership_scope, owner_user_id \
             FROM iam_application_installation \
             WHERE tenant_id = $1 AND id = $2 \
             LIMIT 1",
        )
        .bind(tenant_id)
        .bind(id)
        .fetch_optional(pg)
        .await
    } else if let Some(app_id) = runtime_app_id.filter(|value| !crate::is_blank(Some(value))) {
        sqlx::query(
            "SELECT id, app_id, tenant_id, organization_id, instance_key, display_name, environment, status, primary_domain, access_permissions_json, runtime_config_json, application_type, deploy_application_id, ownership_scope, owner_user_id \
             FROM iam_application_installation \
             WHERE tenant_id = $1 AND app_id = $2 \
             LIMIT 1",
        )
        .bind(tenant_id)
        .bind(app_id)
        .fetch_optional(pg)
        .await
    } else if let Some(key) = instance_key.filter(|value| !crate::is_blank(Some(value))) {
        sqlx::query(
            "SELECT id, app_id, tenant_id, organization_id, instance_key, display_name, environment, status, primary_domain, access_permissions_json, runtime_config_json, application_type, deploy_application_id, ownership_scope, owner_user_id \
             FROM iam_application_installation \
             WHERE tenant_id = $1 AND instance_key = $2 \
             LIMIT 1",
        )
        .bind(tenant_id)
        .bind(key)
        .fetch_optional(pg)
        .await
    } else {
        return Ok(None);
    }
    .map_err(|error| format!("load tenant application failed: {error}"))?;

    Ok(row.map(map_tenant_application_row))
}

/// Loads the installation that serves one deploy application.
///
/// This is the verifier side of [`resolve_access_token_app_id`]: an application
/// access token names its installation by deploy application id, so a credential
/// that still carries the IAM runtime `app_id` resolves to nothing and is
/// rejected instead of silently falling back to the registration-plane lookup.
pub async fn resolve_tenant_application_by_deploy_application_id(
    pg: &PgPool,
    tenant_id: &str,
    deploy_application_id: &str,
) -> Result<Option<TenantApplication>, String> {
    if crate::is_blank(Some(deploy_application_id)) {
        return Ok(None);
    }

    let row = sqlx::query(
        "SELECT id, app_id, tenant_id, organization_id, instance_key, display_name, environment, status, primary_domain, access_permissions_json, runtime_config_json, application_type, deploy_application_id, ownership_scope, owner_user_id \
         FROM iam_application_installation \
         WHERE tenant_id = $1 AND deploy_application_id = $2 \
         LIMIT 1",
    )
    .bind(tenant_id)
    .bind(deploy_application_id.trim())
    .fetch_optional(pg)
    .await
    .map_err(|error| format!("load tenant application by deploy application failed: {error}"))?;

    Ok(row.map(map_tenant_application_row))
}

pub fn intersect_permission_scopes(
    actor_scope: &[String],
    app_scope: &[String],
) -> Result<Vec<String>, String> {
    if app_scope.is_empty() {
        return Err(
            "tenant application accessPermissions is required before issuing credentials"
                .to_string(),
        );
    }

    let actor = actor_scope.iter().collect::<BTreeSet<_>>();
    let mut granted = Vec::new();
    for permission in app_scope {
        if actor.contains(permission) {
            granted.push(permission.clone());
        }
    }

    if granted.is_empty() {
        return Err(
            "super admin does not hold any configured tenant application access permissions"
                .to_string(),
        );
    }

    Ok(granted)
}

/// Resolves the release scope of the installation that serves one deploy
/// application.
///
/// `APPLICATION_IDENTITY_SPEC.md` §4.1: the installation is the authority for
/// the scope, and the scope decides the token claims and the data-plane
/// isolation key. This is the read the resolver uses to attach the scope to a
/// principal; it is cached positively because the value is immutable for the
/// installation's lifetime, and a missing row is **not** cached so a freshly
/// provisioned installation becomes visible immediately.
///
/// # Errors
///
/// Returns an error when the lookup itself fails, and `Ok(None)` when the anchor
/// names no installation of the tenant (the caller then treats the credential as
/// legacy and derives the level from its organization scope).
pub async fn resolve_installation_ownership_scope(
    pg: &PgPool,
    tenant_id: &str,
    deploy_application_id: &str,
) -> Result<Option<ApplicationOwnershipScope>, String> {
    if crate::is_blank(Some(tenant_id)) || crate::is_blank(Some(deploy_application_id)) {
        return Ok(None);
    }
    let anchor = deploy_application_id.trim();
    if let Some(scope) = get_installation_scope(tenant_id, anchor) {
        return Ok(Some(scope));
    }
    let stored = sqlx::query_scalar::<_, String>(
        "SELECT ownership_scope FROM iam_application_installation \
         WHERE tenant_id = $1 AND deploy_application_id = $2 LIMIT 1",
    )
    .bind(tenant_id)
    .bind(anchor)
    .fetch_optional(pg)
    .await
    .map_err(|error| format!("load installation release scope failed: {error}"))?;
    let Some(stored) = stored else {
        return Ok(None);
    };
    // The CHECK constraint keeps the column inside the vocabulary; an
    // unparsable value means the row predates the constraint, and guessing a
    // level for it would be worse than refusing to name one.
    let scope = ApplicationOwnershipScope::parse(&stored).ok_or_else(|| {
        format!(
            "installation of deploy application {anchor} of tenant {tenant_id} carries an unknown ownership_scope {stored:?}"
        )
    })?;
    insert_installation_scope(tenant_id, anchor, scope);
    Ok(Some(scope))
}

pub fn tenant_application_to_json(app: &TenantApplication) -> Value {
    json!({
        "tenantApplicationId": app.id,
        "appId": app.app_id,
        "tenantId": app.tenant_id,
        "organizationId": app.organization_id,
        "instanceKey": app.instance_key,
        "displayName": app.display_name,
        "environment": app.environment,
        "applicationType": app.application_type,
        "status": app.status,
        "primaryDomain": app.primary_domain,
        "accessPermissions": app.access_permissions,
        "deployApplicationId": app.deploy_application_id,
        "ownershipScope": app.ownership_scope.as_str(),
        "ownerUserId": app.owner_user_id,
        "oauthRelyingParty": crate::oauth_relying_party_registration::oauth_relying_party_summary(
            &app.runtime_config
        ),
        "runtimeConfig": redact_runtime_config_for_response(&app.runtime_config),
    })
}

pub fn redact_runtime_config_for_response(runtime_config: &Value) -> Value {
    let mut redacted = runtime_config.clone();
    if let Some(relying_party) = redacted.pointer_mut("/oauth/relyingParty") {
        if let Some(object) = relying_party.as_object_mut() {
            let has_secret = object
                .get("clientSecretHash")
                .and_then(Value::as_str)
                .is_some_and(|value| !value.trim().is_empty());
            if has_secret {
                object.insert("clientSecretHash".to_string(), json!("[redacted]"));
            }
        }
    }
    redacted
}

async fn find_tenant_application_by_instance_key(
    pg: &PgPool,
    tenant_id: &str,
    instance_key: &str,
) -> Result<Option<TenantApplication>, String> {
    resolve_tenant_application(pg, tenant_id, None, None, Some(instance_key)).await
}

async fn find_tenant_application_by_runtime_app_id(
    pg: &PgPool,
    tenant_id: &str,
    runtime_app_id: &str,
) -> Result<Option<TenantApplication>, String> {
    let row = sqlx::query(
        "SELECT id, app_id, tenant_id, organization_id, instance_key, display_name, environment, status, primary_domain, access_permissions_json, runtime_config_json, application_type, deploy_application_id, ownership_scope, owner_user_id \
         FROM iam_application_installation \
         WHERE tenant_id = $1 AND app_id = $2 \
         ORDER BY updated_at DESC NULLS LAST, id ASC \
         LIMIT 1",
    )
    .bind(tenant_id)
    .bind(runtime_app_id)
    .fetch_optional(pg)
    .await
    .map_err(|error| format!("load tenant application by runtime app id failed: {error}"))?;
    Ok(row.map(map_tenant_application_row))
}

/// Loads one tenant application runtime config, treating a missing row as `{}`.
async fn load_tenant_application_runtime_config(
    pg: &PgPool,
    tenant_application_id: &str,
) -> Result<Value, String> {
    let row = sqlx::query("SELECT runtime_config_json FROM iam_application_installation WHERE id = $1")
        .bind(tenant_application_id)
        .fetch_optional(pg)
        .await
        .map_err(|error| format!("load tenant application runtime config failed: {error}"))?;
    Ok(row
        .map(|row| json_value_from_row(&row, 0))
        .unwrap_or_else(|| json!({})))
}

/// Builds the runtime-config patch an application manifest contributes.
///
/// Auto-registration is policy-controlled and fails closed: outside the
/// lifecycles where `SDKWORK_IAM_OAUTH_AUTO_REGISTRATION` permits it, the patch
/// is empty and the persisted registration is left untouched. A manifest that
/// declares a registration is validated exactly like an admin registration.
fn bootstrap_oauth_runtime_config_patch(
    command: &EnsureTenantApplicationCommand,
    existing_relying_party: Option<&Value>,
) -> Result<Value, String> {
    let Some(relying_party) = command.oauth_relying_party.as_ref() else {
        return Ok(json!({}));
    };
    if !crate::oauth_relying_party_registration::auto_registration_enabled(&command.environment) {
        return Ok(json!({}));
    }
    if !relying_party.is_object() {
        return Err("oauth.relyingParty in the application manifest must be an object".to_string());
    }
    let registration =
        crate::oauth_relying_party_registration::parse_relying_party_registration(relying_party)?;
    let normalized = crate::oauth_relying_party_registration::normalize_relying_party_registration(
        &registration,
        &command.runtime_app_id,
        existing_relying_party,
    )?;
    Ok(json!({ "oauth": { "relyingParty": normalized } }))
}

fn map_tenant_application_row(row: sqlx::postgres::PgRow) -> TenantApplication {
    TenantApplication {
        id: row.get(0),
        app_id: row.get(1),
        tenant_id: row.get(2),
        organization_id: row.get(3),
        instance_key: row.get(4),
        display_name: row.get(5),
        environment: row.get(6),
        status: row.get(7),
        primary_domain: row.get(8),
        access_permissions: json_string_vec_from_row(&row, 9),
        runtime_config: json_value_from_row(&row, 10),
        application_type: row.get(11),
        deploy_application_id: row.get(12),
        // The CHECK constraint guarantees a parseable value for a live row; the
        // fallback keeps a SQLite-era fixture (column absent) readable as the
        // documented default instead of unwrapping.
        ownership_scope: row
            .try_get::<String, _>(13)
            .ok()
            .and_then(|value| ApplicationOwnershipScope::parse(&value))
            .unwrap_or(ApplicationOwnershipScope::DEFAULT),
        owner_user_id: row.try_get::<Option<String>, _>(14).ok().flatten(),
    }
}

fn json_value_from_row(row: &sqlx::postgres::PgRow, index: usize) -> Value {
    row.try_get::<Json<Value>, _>(index)
        .map(|Json(value)| value)
        .unwrap_or_else(|_| json!({}))
}

fn json_string_vec_from_row(row: &sqlx::postgres::PgRow, index: usize) -> Vec<String> {
    row.try_get::<Json<Vec<String>>, _>(index)
        .map(|Json(values)| values)
        .or_else(|_| {
            row.try_get::<Json<Value>, _>(index)
                .map(|Json(value)| match value {
                    Value::Array(items) => items
                        .iter()
                        .filter_map(|item| item.as_str().map(str::to_owned))
                        .collect(),
                    Value::String(text) => text
                        .split(',')
                        .map(str::trim)
                        .filter(|part| !part.is_empty())
                        .map(str::to_owned)
                        .collect(),
                    _ => Vec::new(),
                })
        })
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

fn read_string_array(body: &Value, keys: &[&str]) -> Option<Vec<String>> {
    keys.iter()
        .find_map(|key| body.get(*key))
        .and_then(|value| match value {
            Value::Array(items) => Some(
                items
                    .iter()
                    .filter_map(|item| item.as_str().map(str::to_owned))
                    .collect(),
            ),
            Value::String(text) => Some(
                text.split(',')
                    .map(str::trim)
                    .filter(|part| !part.is_empty())
                    .map(str::to_owned)
                    .collect(),
            ),
            _ => None,
        })
}

/// Validates and canonicalizes a `runtimeConfig.oauth.relyingParty` document.
///
/// The registration is normalized against the owning runtime `app_id` before it
/// is persisted, so every entry point (bootstrap, admin provisioning, admin
/// update) stores the same shape and a plaintext client secret never reaches
/// storage. A config without an `oauth.relyingParty` object is returned as-is.
fn normalize_runtime_config_oauth(
    runtime_config: &Value,
    app_id: &str,
    existing_relying_party: Option<&Value>,
) -> Result<Value, String> {
    let Some(relying_party) = runtime_config.pointer("/oauth/relyingParty") else {
        return Ok(runtime_config.clone());
    };
    if !relying_party.is_object() {
        return Err("runtimeConfig.oauth.relyingParty must be an object".to_string());
    }
    let registration =
        crate::oauth_relying_party_registration::parse_relying_party_registration(relying_party)?;
    let normalized = crate::oauth_relying_party_registration::normalize_relying_party_registration(
        &registration,
        app_id,
        existing_relying_party,
    )?;
    Ok(
        crate::oauth_relying_party_registration::merge_relying_party_registration(
            runtime_config,
            &normalized,
        ),
    )
}

/// Rejects an OAuth client id already claimed by another tenant application.
///
/// `iam_application_installation.app_id` carries a unique constraint, but a declared
/// `oauth.relyingParty.clientId` does not, and the authorization endpoint
/// resolves a client without a tenant hint when the id is globally unique.
/// Checking both columns keeps that resolution deterministic.
async fn ensure_relying_party_client_id_available(
    pg: &PgPool,
    tenant_application_id: &str,
    app_id: &str,
    runtime_config: &Value,
) -> Result<(), String> {
    let Some(relying_party) = runtime_config.pointer("/oauth/relyingParty") else {
        return Ok(());
    };
    let client_id = relying_party
        .get("clientId")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(app_id);
    let conflicts: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::BIGINT FROM iam_application_installation \
         WHERE id <> $1 \
           AND ( \
             app_id = $2 \
             OR COALESCE(runtime_config_json #>> '{oauth,relyingParty,clientId}', '') = $2 \
           )",
    )
    .bind(tenant_application_id)
    .bind(client_id)
    .fetch_one(pg)
    .await
    .map_err(|error| format!("check OAuth clientId availability failed: {error}"))?;
    if conflicts > 0 {
        return Err(format!(
            "OAuth clientId {client_id} is already registered by another tenant application"
        ));
    }
    Ok(())
}

/// Deep-merge runtime config patches so partial updates (e.g. `oauth.relyingParty`) do not
/// replace sibling keys such as `auth.*` or wipe `clientSecretHash` when omitted.
pub(crate) fn merge_runtime_config_patch(existing: &Value, patch: &Value) -> Value {
    if !patch.is_object() {
        return existing.clone();
    }
    if !existing.is_object() {
        return patch.clone();
    }

    let mut merged = existing.clone();
    let Some(merged_obj) = merged.as_object_mut() else {
        return patch.clone();
    };
    let Some(patch_obj) = patch.as_object() else {
        return merged;
    };

    for (key, patch_value) in patch_obj {
        if key == "oauth" {
            let existing_oauth = merged_obj
                .get("oauth")
                .cloned()
                .unwrap_or_else(|| json!({}));
            merged_obj.insert(
                key.clone(),
                merge_oauth_runtime_config(&existing_oauth, patch_value),
            );
            continue;
        }
        merged_obj.insert(key.clone(), patch_value.clone());
    }

    merged
}

fn merge_oauth_runtime_config(existing_oauth: &Value, patch_oauth: &Value) -> Value {
    if !patch_oauth.is_object() {
        return existing_oauth.clone();
    }
    if !existing_oauth.is_object() {
        return patch_oauth.clone();
    }

    let mut merged = existing_oauth.clone();
    let Some(merged_obj) = merged.as_object_mut() else {
        return patch_oauth.clone();
    };
    let Some(patch_obj) = patch_oauth.as_object() else {
        return merged;
    };

    for (key, patch_value) in patch_obj {
        if key == "relyingParty" {
            let existing_rp = merged_obj
                .get("relyingParty")
                .cloned()
                .unwrap_or_else(|| json!({}));
            merged_obj.insert(
                key.clone(),
                merge_relying_party_config(&existing_rp, patch_value),
            );
            continue;
        }
        merged_obj.insert(key.clone(), patch_value.clone());
    }

    merged
}

fn merge_relying_party_config(existing: &Value, patch: &Value) -> Value {
    if !patch.is_object() {
        return existing.clone();
    }
    if !existing.is_object() {
        return patch.clone();
    }

    let mut merged = existing.clone();
    let Some(merged_obj) = merged.as_object_mut() else {
        return patch.clone();
    };
    let Some(patch_obj) = patch.as_object() else {
        return merged;
    };

    for (key, patch_value) in patch_obj {
        if key == "clientSecretHash" {
            if patch_value.is_null() {
                // A registration that becomes public removes the stored hash.
                merged_obj.remove(key);
                continue;
            }
            let patch_text = patch_value.as_str().unwrap_or("").trim();
            if patch_text.is_empty() {
                continue;
            }
        }
        if key == "clientId" {
            // An explicit null / blank clears a brand-level override so the
            // registration falls back to the tenant application app_id.
            let cleared = patch_value.is_null()
                || patch_value
                    .as_str()
                    .is_some_and(|value| value.trim().is_empty());
            if cleared {
                merged_obj.remove(key);
                continue;
            }
        }
        merged_obj.insert(key.clone(), patch_value.clone());
    }

    merged
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Every endpoint kind the Deploy plane publishes has a product-semantic
    /// IAM type; a mini program must never collapse into `other`.
    #[test]
    fn manifest_app_types_map_onto_the_endpoint_vocabulary() {
        for app_type in [
            "APP_UNIAPP",
            "APP_MINIPROGRAM",
            "APP_MINI_PROGRAM",
            "MINIPROGRAM",
            "MINI_PROGRAM",
        ] {
            assert_eq!(map_manifest_app_type_to_application_type(app_type), "miniprogram");
        }
        assert_eq!(map_manifest_app_type_to_application_type("APP_HARMONY"), "harmonyos");
        assert_eq!(map_manifest_app_type_to_application_type("APP_IOS"), "ios");
        assert_eq!(map_manifest_app_type_to_application_type("APP_ANDROID"), "android");
        assert_eq!(map_manifest_app_type_to_application_type("APP_DESKTOP"), "desktop");
        assert_eq!(map_manifest_app_type_to_application_type("DESKTOP"), "desktop");
        assert_eq!(map_manifest_app_type_to_application_type("APP_REACT"), "pc");
        assert_eq!(map_manifest_app_type_to_application_type("APP_HTML"), "h5");
        assert_eq!(map_manifest_app_type_to_application_type("APP_FLUTTER"), "flutter");
        assert_eq!(map_manifest_app_type_to_application_type("APP_API"), "api");
        assert_eq!(map_manifest_app_type_to_application_type("SOMETHING_NEW"), "other");
    }

    #[test]
    fn explicit_application_types_normalize_aliases_and_reject_typos() {
        assert_eq!(normalize_application_type(" Mini-Program "), "miniprogram");
        assert_eq!(normalize_application_type("WeChat Mini Program"), "miniprogram");
        assert_eq!(normalize_application_type("HARMONY_OS"), "harmonyos");
        assert_eq!(normalize_application_type("iOS-Native"), "ios");
        assert_eq!(normalize_application_type("android"), "android");
        assert_eq!(normalize_application_type("Electron"), "desktop");
        assert_eq!(normalize_application_type("pc"), "pc");
        assert_eq!(normalize_application_type("web"), "pc");
        assert_eq!(normalize_application_type("not-a-kind"), "other");
    }

    fn provision_target_fixture(
        id: &str,
        app_id: &str,
        deploy_application_id: Option<&str>,
    ) -> TenantApplication {
        TenantApplication {
            id: id.to_owned(),
            app_id: app_id.to_owned(),
            tenant_id: "100001".to_owned(),
            organization_id: "0".to_owned(),
            instance_key: "sdkwork_cloudrouter_prod".to_owned(),
            display_name: "SDKWork CloudRouter".to_owned(),
            environment: "production".to_owned(),
            application_type: "pc".to_owned(),
            status: "enabled".to_owned(),
            primary_domain: Some("cloudrouter.example.com".to_owned()),
            access_permissions: vec!["iam.self".to_owned()],
            runtime_config: json!({}),
            deploy_application_id: deploy_application_id.map(str::to_owned),
            ownership_scope: ApplicationOwnershipScope::Tenant,
            owner_user_id: None,
        }
    }

    /// The release scope of a provisioned installation is validated against its
    /// pointer, defaults to `TENANT`, and rejects every mismatched pair before a
    /// database lookup can run.
    #[test]
    fn provision_attributes_carry_a_validated_release_scope() {
        use crate::application_scope::ApplicationOwnershipScope;

        let mut command = provision_command_fixture();
        let attributes = resolve_provision_attributes(&command).expect("default scope");
        assert_eq!(attributes.scope.scope, ApplicationOwnershipScope::Tenant);
        assert_eq!(attributes.scope.owner_user_id, None);

        command.organization_id = "42".to_owned();
        command.ownership_scope = Some("ORGANIZATION".to_owned());
        let attributes = resolve_provision_attributes(&command).expect("organization release");
        assert_eq!(
            attributes.scope.scope,
            ApplicationOwnershipScope::Organization
        );

        command.organization_id = "0".to_owned();
        command.ownership_scope = Some("USER".to_owned());
        command.owner_user_id = Some("user-7".to_owned());
        let attributes = resolve_provision_attributes(&command).expect("personal release");
        assert_eq!(attributes.scope.scope, ApplicationOwnershipScope::User);
        assert_eq!(
            attributes.scope.owner_user_id.as_deref(),
            Some("user-7")
        );

        // A mismatched request fails on its own inputs, before any DB work.
        command.owner_user_id = None;
        let error = resolve_provision_attributes(&command).expect_err("owner required");
        assert!(error.contains("ownerUserId"), "{error}");
        assert!(is_provision_attribute_error(&error));

        command.ownership_scope = Some("TENANT".to_owned());
        command.organization_id = "42".to_owned();
        let error = resolve_provision_attributes(&command).expect_err("tenant needs org 0");
        assert!(error.contains("TENANT"), "{error}");
        assert!(is_provision_attribute_error(&error));

        command.ownership_scope = Some("PLATFORM".to_owned());
        command.organization_id = "0".to_owned();
        let error = resolve_provision_attributes(&command).expect_err("unknown level");
        assert!(error.contains("unknown application ownership scope"), "{error}");
        assert!(is_provision_attribute_error(&error));
    }

    /// `ownershipScope` and `ownerUserId` are parsed from the camelCase wire
    /// field, alongside the retired-template-free attributes.
    #[test]
    fn parse_provision_command_reads_the_release_scope() {
        let body = json!({
            "tenantId": "100001",
            "organizationId": "0",
            "instanceKey": "sdkwork_cloudrouter_prod",
            "environment": "production",
            "applicationType": "pc",
            "ownershipScope": "USER",
            "ownerUserId": "user-9"
        });
        let command =
            parse_tenant_application_provision_command(&body).expect("scope fields parse");
        assert_eq!(command.ownership_scope.as_deref(), Some("USER"));
        assert_eq!(command.owner_user_id.as_deref(), Some("user-9"));
    }

    /// A re-provision that declares a different release scope is a conflict, and
    /// an omitted scope keeps the stored one.
    #[test]
    fn provision_rejects_a_scope_change_on_an_existing_installation() {
        use crate::application_scope::ApplicationOwnershipScope;

        let mut existing = provision_target_fixture("tapp-personal", "app-a", Some("deploy-a"));
        existing.ownership_scope = ApplicationOwnershipScope::User;
        existing.owner_user_id = Some("user-7".to_owned());
        let requested = ApplicationOwnershipScope::parse("TENANT").expect("tenant");
        assert_ne!(requested, existing.ownership_scope);

        let mut command = provision_command_fixture();
        command.ownership_scope = Some("TENANT".to_owned());
        command.owner_user_id = None;
        // The comparison the provisioning path performs before the write.
        assert_ne!(
            ApplicationOwnershipScope::parse_optional(command.ownership_scope.as_deref())
                .expect("declared scope"),
            Some(existing.ownership_scope),
            "a declared different scope must not be accepted as an update"
        );

        command.ownership_scope = None;
        assert_eq!(
            ApplicationOwnershipScope::parse_optional(command.ownership_scope.as_deref())
                .expect("absent scope"),
            None,
            "an omitted scope keeps the stored release level"
        );
    }

    /// A re-provision of the same deploy application is idempotent: the row
    /// already bound to the anchor wins over the instance-key fallback, so the
    /// command updates that installation instead of creating a second one.
    #[test]
    fn provision_reuses_the_installation_bound_to_the_same_deploy_application() {
        let bound = provision_target_fixture("tapp-bound", "app-a", Some("deploy-a"));
        let same_instance_sibling =
            provision_target_fixture("tapp-sibling", "app-b", Some("deploy-b"));

        let selected = select_provision_target(
            Some(bound.clone()),
            Some(same_instance_sibling),
            Some("deploy-a"),
        )
        .expect("same anchor must reuse its installation");
        assert_eq!(selected.map(|app| app.id), Some("tapp-bound".to_owned()));

        // Idempotent when the fallback lookup returns the same row as well.
        let selected = select_provision_target(None, Some(bound.clone()), Some("deploy-a"))
            .expect("the same anchor on the instance-key row is the same installation");
        assert_eq!(selected.map(|app| app.id), Some(bound.id));
    }

    /// A second deploy application that reuses the same instance-key row must be
    /// rejected instead of silently overwriting the existing link.
    #[test]
    fn provision_rejects_a_second_deploy_application_on_the_same_installation_row() {
        let existing = provision_target_fixture("tapp-bound", "sdkwork-cloudrouter", Some("deploy-a"));

        let error = select_provision_target(None, Some(existing.clone()), Some("deploy-b"))
            .expect_err("a different anchor must conflict");
        assert!(error.contains("deploy-a"), "error must name the bound anchor: {error}");
        assert!(
            error.contains("deploy-b"),
            "error must name the requested anchor: {error}"
        );
        assert!(error.contains("tapp-bound"), "error must name the row: {error}");
    }

    /// An anchorless registration keeps the instance-key dedupe, and an unbound
    /// fallback row may be linked by the provisioning command.
    #[test]
    fn provision_keeps_the_instance_key_dedupe_without_an_anchor() {
        let bound = provision_target_fixture("tapp-legacy", "app-a", Some("deploy-a"));
        let selected = select_provision_target(None, Some(bound.clone()), None)
            .expect("anchorless provisioning keeps the instance-key dedupe");
        assert_eq!(selected.map(|app| app.id), Some(bound.id));

        let unbound = provision_target_fixture("tapp-unbound", "app-b", None);
        let selected = select_provision_target(None, Some(unbound), Some("deploy-b"))
            .expect("an unbound installation may be linked");
        assert_eq!(selected.map(|app| app.id), Some("tapp-unbound".to_owned()));
    }

    /// The gate accepts a deploy-scoped credential whose anchor is bound to an
    /// enabled installation of the tenant.
    #[test]
    fn gate_accepts_a_deploy_application_bound_to_an_enabled_installation() {
        ensure_enabled_installation(
            "100001",
            "deploy-a",
            Some(("enabled".to_owned(), Some("active".to_owned()))),
        )
        .expect("a bound, enabled installation must pass the gate");
    }

    /// An installation that was never linked to a deploy application fails
    /// closed at the gate instead of matching an IAM runtime app id.
    #[test]
    fn gate_rejects_an_installation_without_a_deploy_application() {
        let error = ensure_enabled_installation("100001", "deploy-a", None)
            .expect_err("an unbound installation must be rejected");
        assert!(
            error.contains("not bound to an enabled installation"),
            "unexpected gate error: {error}"
        );
        assert!(error.contains("deployApplicationId"), "unexpected gate error: {error}");
    }

    /// A disabled installation or an inactive/absent tenant fails closed too.
    #[test]
    fn gate_rejects_a_disabled_installation_or_inactive_tenant() {
        assert!(ensure_enabled_installation(
            "100001",
            "deploy-a",
            Some(("disabled".to_owned(), Some("active".to_owned()))),
        )
        .is_err());
        assert!(ensure_enabled_installation(
            "100001",
            "deploy-a",
            Some(("enabled".to_owned(), Some("suspended".to_owned()))),
        )
        .is_err());
        assert!(
            ensure_enabled_installation("100001", "deploy-a", Some(("enabled".to_owned(), None)))
                .is_err()
        );
        assert!(ensure_enabled_installation("100001", "   ", Some(("enabled".to_owned(), Some("active".to_owned())))).is_err());
    }

    /// The self-bootstrapped platform installation takes its anchor from
    /// configuration and can issue a deployment credential afterwards.
    #[test]
    fn platform_installation_anchor_comes_from_configuration_and_is_issuable() {
        let configured =
            deploy_application_id_from_configured_value(Some(" deploy-platform "), DEPLOY_APPLICATION_ID_ENV)
                .expect("a configured anchor must be accepted");
        assert_eq!(configured, "deploy-platform");

        let platform_installation = provision_target_fixture(
            "tapp_100001_0_sdkwork_platform",
            "app_100001",
            Some(configured.as_str()),
        );
        assert_eq!(
            resolve_access_token_app_id(&platform_installation).expect("linked platform install"),
            "deploy-platform"
        );

        for missing in [None, Some(""), Some("   ")] {
            let error =
                deploy_application_id_from_configured_value(missing, DEPLOY_APPLICATION_ID_ENV)
                    .expect_err("unconfigured anchor must fail closed");
            assert!(error.contains(DEPLOY_APPLICATION_ID_ENV), "unexpected error: {error}");
            assert!(
                error.contains("must not be bootstrapped with the IAM runtime app id"),
                "unexpected error: {error}"
            );
        }
    }

    #[test]
    fn tenant_application_instance_key_scopes_by_app_and_environment() {
        assert_eq!(
            "sdkwork_cloudrouter_dev",
            tenant_application_instance_key("sdkwork-cloudrouter", "development")
        );
        assert_eq!(
            "sdkwork_cloudrouter_prod",
            tenant_application_instance_key("sdkwork-cloudrouter", "production")
        );
        assert_ne!(
            tenant_application_instance_key("sdkwork-cloudrouter", "production"),
            "default"
        );
    }

    #[test]
    fn tenant_application_row_id_is_deterministic() {
        assert_eq!(
            "tapp_100001_0_sdkwork_cloudrouter",
            tenant_application_row_id("100001", "0", "sdkwork-cloudrouter")
        );
        assert_eq!(
            "tapp_tenant_configured_0_sdkwork_platform",
            tenant_application_row_id("tenant_configured", "0", PLATFORM_INSTALLATION_ANCHOR)
        );
    }

    #[test]
    fn parse_tenant_application_provision_requires_no_template_reference() {
        let body = json!({
            "tenantId": "100001",
            "organizationId": "0",
            "instanceKey": "prod",
            "environment": "prod"
        });
        let command =
            parse_tenant_application_provision_command(&body).expect("no template is required");
        let error = resolve_provision_attributes(&command)
            .expect_err("a command without attributes must fail provisioning");
        assert_eq!(
            error,
            "applicationType is required to provision a tenant application"
        );
    }

    #[test]
    fn intersect_permission_scopes_requires_overlap() {
        let error = intersect_permission_scopes(
            &["iam.users.read".to_owned()],
            &["iam.access_credentials.create".to_owned()],
        )
        .expect_err("no overlap");
        assert!(error.contains("does not hold"));
    }

    #[test]
    fn redact_runtime_config_for_response_masks_relying_party_secret_hash() {
        let runtime_config = json!({
            "auth": { "oauthLoginEnabled": true },
            "oauth": {
                "relyingParty": {
                    "clientSecretHash": "hash-keep",
                    "enabled": true
                }
            }
        });
        let redacted = redact_runtime_config_for_response(&runtime_config);
        assert_eq!(
            redacted["oauth"]["relyingParty"]["clientSecretHash"],
            json!("[redacted]")
        );
        assert_eq!(redacted["oauth"]["relyingParty"]["enabled"], json!(true));
    }

    #[test]
    fn normalize_runtime_config_oauth_defaults_client_id_and_hashes_the_secret() {
        let runtime_config = json!({
            "auth": { "supportsLocalCredentials": true },
            "oauth": {
                "relyingParty": {
                    "enabled": true,
                    "redirectUris": ["birdcoder://auth/callback"],
                    "allowedScopes": ["openid", "profile"],
                    "confidential": true,
                    "clientSecret": "correct horse battery staple"
                }
            }
        });
        let normalized = normalize_runtime_config_oauth(&runtime_config, "sdkwork-birdcoder", None)
            .expect("normalize runtime config");
        assert_eq!(
            normalized["oauth"]["relyingParty"]["clientId"],
            json!("sdkwork-birdcoder")
        );
        let hash = normalized["oauth"]["relyingParty"]["clientSecretHash"]
            .as_str()
            .expect("hashed secret");
        assert!(hash.starts_with("$argon2"));
        assert!(!hash.contains("correct horse"));
        assert_eq!(
            normalized["auth"]["supportsLocalCredentials"],
            json!(true),
            "sibling runtime config must survive normalization"
        );
    }

    #[test]
    fn normalize_runtime_config_oauth_preserves_a_stored_secret_when_omitted() {
        let existing = json!({
            "enabled": true,
            "clientId": "sdkwork-birdcoder",
            "redirectUris": ["birdcoder://auth/callback"],
            "allowedScopes": ["openid"],
            "confidential": true,
            "clientSecretHash": "$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$Zm9vYmFyYmF6cXV4"
        });
        let runtime_config = json!({
            "oauth": {
                "relyingParty": {
                    "enabled": true,
                    "redirectUris": ["birdcoder://auth/callback"],
                    "allowedScopes": ["openid"],
                    "confidential": true
                }
            }
        });
        let normalized =
            normalize_runtime_config_oauth(&runtime_config, "sdkwork-birdcoder", Some(&existing))
                .expect("normalize runtime config");
        assert_eq!(
            normalized["oauth"]["relyingParty"]["clientSecretHash"],
            existing["clientSecretHash"]
        );
    }

    #[test]
    fn normalize_runtime_config_oauth_rejects_an_invalid_redirect_uri() {
        let runtime_config = json!({
            "oauth": {
                "relyingParty": {
                    "enabled": true,
                    "redirectUris": ["https://*.example.com/callback"],
                    "allowedScopes": ["openid"]
                }
            }
        });
        let error = normalize_runtime_config_oauth(&runtime_config, "sdkwork-forum", None)
            .expect_err("wildcard redirect must be rejected");
        assert!(error.contains("wildcard"), "{error}");
    }

    #[test]
    fn runtime_config_without_a_relying_party_is_left_unchanged() {
        let runtime_config = json!({ "auth": { "supportsSessionExchange": true } });
        let normalized = normalize_runtime_config_oauth(&runtime_config, "sdkwork-forum", None)
            .expect("normalize runtime config");
        assert_eq!(normalized, runtime_config);
    }

    #[test]
    fn bootstrap_oauth_patch_is_policy_controlled_per_lifecycle() {
        for key in [
            crate::oauth_relying_party_registration::OAUTH_AUTO_REGISTRATION_ENV,
            crate::oauth_relying_party_registration::OAUTH_AUTO_REGISTRATION_ENABLED_ENV,
        ] {
            std::env::remove_var(key);
        }
        let relying_party = json!({
            "enabled": true,
            "clientId": "birdcoder",
            "redirectUris": ["birdcoder://auth/callback"],
            "allowedScopes": ["openid", "profile"],
            "confidential": false
        });
        let mut command = EnsureTenantApplicationCommand {
            owner_tenant_id: "0".to_owned(),
            app_key: "sdkwork-birdcoder".to_owned(),
            name: "SDKWork Birdcoder".to_owned(),
            display_name: "SDKWork Birdcoder".to_owned(),
            app_type: "APP_REACT".to_owned(),
            version: "1.0.0".to_owned(),
            channel: "stable".to_owned(),
            default_access_permissions: vec!["iam.self".to_owned()],
            tenant_id: "100001".to_owned(),
            organization_id: "0".to_owned(),
            instance_key: "sdkwork_birdcoder_dev".to_owned(),
            environment: "production".to_owned(),
            primary_domain: "localhost".to_owned(),
            runtime_app_id: "sdkwork-birdcoder".to_owned(),
            deploy_application_id: Some("deploy_birdcoder".to_owned()),
            oauth_relying_party: Some(relying_party.clone()),
        };

        assert_eq!(
            bootstrap_oauth_runtime_config_patch(&command, None).expect("production patch"),
            json!({}),
            "production must fail closed without an explicit policy opt-in"
        );

        command.environment = "development".to_owned();
        let patch =
            bootstrap_oauth_runtime_config_patch(&command, None).expect("development patch");
        assert_eq!(
            patch["oauth"]["relyingParty"]["clientId"],
            json!("birdcoder")
        );
        assert_eq!(patch["oauth"]["relyingParty"]["enabled"], json!(true));
    }

    #[test]
    fn merge_runtime_config_patch_preserves_auth_and_oauth_siblings() {
        let existing = json!({
            "auth": { "oauthLoginEnabled": true },
            "oauth": {
                "relyingParty": {
                    "enabled": true,
                    "clientSecretHash": "hash-keep",
                    "redirectUris": ["https://old.example/callback"]
                },
                "legacyFlag": true
            }
        });
        let patch = json!({
            "oauth": {
                "relyingParty": {
                    "enabled": false,
                    "redirectUris": ["https://new.example/callback"],
                    "allowedScopes": ["openid"]
                }
            }
        });
        let merged = merge_runtime_config_patch(&existing, &patch);
        assert_eq!(merged["auth"]["oauthLoginEnabled"], json!(true));
        assert_eq!(merged["oauth"]["legacyFlag"], json!(true));
        assert_eq!(merged["oauth"]["relyingParty"]["enabled"], json!(false));
        assert_eq!(
            merged["oauth"]["relyingParty"]["clientSecretHash"],
            json!("hash-keep")
        );
        assert_eq!(
            merged["oauth"]["relyingParty"]["redirectUris"],
            json!(["https://new.example/callback"])
        );
    }

    #[test]
    fn derive_tenant_application_primary_domain_candidate_avoids_shared_localhost_conflicts() {
        assert_eq!(
            derive_tenant_application_primary_domain_candidate("localhost", "sdkwork-im-pc", 0),
            "localhost"
        );
        assert_eq!(
            derive_tenant_application_primary_domain_candidate("localhost", "sdkwork-im-pc", 1),
            "sdkwork-im-pc.localhost"
        );
        assert_eq!(
            derive_tenant_application_primary_domain_candidate("localhost", "sdkwork-im-pc", 2),
            "sdkwork-im-pc-2.localhost"
        );
    }

    fn provision_command_fixture() -> TenantApplicationProvisionCommand {
        TenantApplicationProvisionCommand {
            tenant_id: "100001".to_owned(),
            organization_id: "0".to_owned(),
            app_id: None,
            instance_key: "sdkwork_cloudrouter_prod".to_owned(),
            display_name: "SDKWork CloudRouter".to_owned(),
            environment: "production".to_owned(),
            application_type: Some("H5".to_owned()),
            primary_domain: Some("cloudrouter.example.com".to_owned()),
            access_permissions: vec!["iam.self".to_owned()],
            runtime_config: json!({
                "oauth": {
                    "relyingParty": {
                        "clientId": "cloudrouter-desktop",
                        "redirectUris": ["https://cloudrouter.example.com/oauth/callback"],
                        "allowedScopes": ["openid", "profile"]
                    }
                }
            }),
            deploy_application_id: Some("deploy-cloudrouter".to_owned()),
            ownership_scope: None,
            owner_user_id: None,
            provisioning_idempotency_key: Some("idem-cloudrouter-1".to_owned()),
        }
    }

    /// The installation success path: application type, access permissions, and
    /// the OAuth relying party all come from the command, and the row id is
    /// anchored on the deploy application.
    #[test]
    fn provision_attributes_use_the_explicit_attributes() {
        let command = provision_command_fixture();
        let attributes = resolve_provision_attributes(&command)
            .expect("a command with explicit attributes must derive");

        assert_eq!(attributes.application_type, "h5");
        assert_eq!(
            attributes.access_permissions,
            vec!["iam.self".to_owned()]
        );
        assert_eq!(attributes.runtime_config, command.runtime_config);
        assert_eq!(
            tenant_application_anchor(&command).expect("deploy-application anchor"),
            "deploy-cloudrouter"
        );
        assert_eq!(
            tenant_application_row_id("100001", "0", tenant_application_anchor(&command).unwrap()),
            "tapp_100001_0_deploy_cloudrouter"
        );
    }

    /// `applicationType` is the only required attribute: an installation that
    /// omits it fails with a message naming it, while an empty permission list is
    /// an explicit "no API scope" choice and passes through.
    #[test]
    fn provision_attributes_require_only_the_application_type() {
        let mut command = provision_command_fixture();

        command.application_type = None;
        let error = resolve_provision_attributes(&command).expect_err("missing type");
        assert_eq!(
            error,
            "applicationType is required to provision a tenant application"
        );
        assert!(is_provision_attribute_error(&error));

        // A blank type is a missing type, not a value to normalize to `other`.
        command.application_type = Some("   ".to_owned());
        let error = resolve_provision_attributes(&command).expect_err("blank type");
        assert_eq!(
            error,
            "applicationType is required to provision a tenant application"
        );

        // Empty permissions are carried through as an empty scope list rather
        // than rejected or replaced by a default.
        command.application_type = Some("pc".to_owned());
        command.access_permissions.clear();
        let attributes =
            resolve_provision_attributes(&command).expect("empty permissions are a valid choice");
        assert!(attributes.access_permissions.is_empty());

        // Runtime config is not required: without one there is simply no OAuth
        // relying party to register.
        command.application_type = Some("pc".to_owned());
        command.runtime_config = json!({});
        let attributes =
            resolve_provision_attributes(&command).expect("no runtime config is valid");
        assert_eq!(attributes.runtime_config, json!({}));
    }

    /// Without a deploy application the required instance key supplies the
    /// row-id anchor.
    #[test]
    fn provision_anchor_falls_back_to_the_instance_key() {
        let mut command = provision_command_fixture();
        command.deploy_application_id = None;
        assert_eq!(
            tenant_application_anchor(&command).expect("instance-key anchor"),
            "sdkwork_cloudrouter_prod"
        );
    }

    /// Parsing accepts an installation command without any template reference
    /// and ignores the retired `templateId`/`appKey` wire fields.
    #[test]
    fn parse_tenant_application_provision_command_ignores_retired_template_fields() {
        let body = json!({
            "tenantId": "100001",
            "organizationId": "0",
            "instanceKey": "sdkwork_cloudrouter_prod",
            "environment": "production",
            "applicationType": "pc",
            "accessPermissions": ["iam.self"],
            "runtimeConfig": {"oauth": {"relyingParty": {"clientId": "cloudrouter"}}},
            "deployApplicationId": "deploy-cloudrouter",
            "templateId": "tmpl_sdkwork_cloudrouter",
            "appKey": "sdkwork-cloudrouter"
        });
        let command =
            parse_tenant_application_provision_command(&body).expect("template-free parse");
        assert_eq!(command.application_type.as_deref(), Some("pc"));
        assert_eq!(command.access_permissions, vec!["iam.self".to_owned()]);

        // Even an incomplete command parses: the named attribute error belongs
        // to provisioning, not to request-shape validation.
        let incomplete = json!({
            "tenantId": "100001",
            "organizationId": "0",
            "instanceKey": "sdkwork_cloudrouter_prod",
            "environment": "production"
        });
        let command = parse_tenant_application_provision_command(&incomplete)
            .expect("parsing must not require a template");
        assert!(
            resolve_provision_attributes(&command).is_err(),
            "an incomplete command must still fail provisioning"
        );
    }}
