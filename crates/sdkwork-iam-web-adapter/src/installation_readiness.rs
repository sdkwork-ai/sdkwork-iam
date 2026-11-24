//! Installation readiness assessment and reconciliation.
//!
//! One installation is one deploy application (`APPLICATION_IDENTITY_SPEC.md`
//! §3). Everything that makes that link usable — the deploy anchor, the enabled
//! lifecycle, the registered relying party, the environment rows a token
//! exchange filters on, the access scope a credential is intersected with — is
//! checked here, so a caller learns *what* is missing before a login or an
//! access-token issue fails deep inside the flow with one sentence.
//!
//! The assessment is pure: [`assess_installation`] takes the stored row plus its
//! environment rows and returns the defect list. Reconciliation repairs only the
//! subset that is unsafe to guess wrong, and only in the direction that adds
//! information: a **missing** deploy anchor, an explicitly requested runtime
//! config, a disabled lifecycle. Nothing is deleted, re-pointed, or overwritten,
//! and a dry run reports the same plan without writing.

use serde_json::{json, Value};
use sqlx::PgPool;

use crate::application_registry::{
    bind_tenant_application_deploy_application_id, enable_tenant_application,
    resolve_tenant_application, update_tenant_application, TenantApplication,
    TenantApplicationUpdateCommand,
};
use crate::installation_lifecycle::{
    load_installation_environments, INSTALLATION_ENVIRONMENT_STATUS_ACTIVE,
};

/// Operation that repairs the defects a reconcile call can fix.
pub const INSTALLATION_RECONCILE_REPAIR_OPERATION: &str = "iam.installations.reconcile";

/// Audit action recorded for every reconcile that wrote.
pub const IAM_INSTALLATION_RECONCILED_AUDIT_ACTION: &str = "iam.installation.reconciled";

/// Operation that owns the fields reconcile deliberately does not touch.
pub const INSTALLATION_UPDATE_REPAIR_OPERATION: &str = "iam.installations.update";

/// Operation that owns the environment rows.
pub const INSTALLATION_ENVIRONMENT_REPAIR_OPERATION: &str = "iam.installations.environments.update";

/// Installation status that admits token issuance and login.
const INSTALLATION_STATUS_ENABLED: &str = "enabled";

/// Stable, machine-readable defect codes.
///
/// A code names one repair, never a symptom: the client switches on the code,
/// and the human sentence can change without breaking it.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum InstallationDefectCode {
    /// The installation serves no deploy application; every credential fails closed.
    DeployApplicationUnbound,
    /// No OAuth relying party is registered, so the hosted authorize page has no client.
    RelyingPartyMissing,
    /// The installation lifecycle is not `enabled`.
    InstallationDisabled,
    /// No primary domain is configured, which blocks `enable`.
    PrimaryDomainMissing,
    /// The access scope is empty, so no credential can be intersected.
    AccessPermissionsEmpty,
    /// The installation has no lifecycle environment row.
    EnvironmentNotRegistered,
    /// Every lifecycle environment row is non-active.
    EnvironmentNotActive,
    /// A `USER`-scoped installation has no owner.
    OwnerMissing,
}

impl InstallationDefectCode {
    /// Wire spelling of the code.
    /// @returns the stable snake_case code.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::DeployApplicationUnbound => "deploy_application_unbound",
            Self::RelyingPartyMissing => "relying_party_missing",
            Self::InstallationDisabled => "installation_disabled",
            Self::PrimaryDomainMissing => "primary_domain_missing",
            Self::AccessPermissionsEmpty => "access_permissions_empty",
            Self::EnvironmentNotRegistered => "environment_not_registered",
            Self::EnvironmentNotActive => "environment_not_active",
            Self::OwnerMissing => "owner_missing",
        }
    }

    /// Field of the installation (or its runtime config) the defect sits on.
    /// @returns the request field a caller supplies to repair it.
    pub fn field(self) -> &'static str {
        match self {
            Self::DeployApplicationUnbound => "deployApplicationId",
            Self::RelyingPartyMissing => "runtimeConfig.oauth.relyingParty",
            Self::InstallationDisabled => "status",
            Self::PrimaryDomainMissing => "primaryDomain",
            Self::AccessPermissionsEmpty => "accessPermissions",
            Self::EnvironmentNotRegistered | Self::EnvironmentNotActive => "environmentKey",
            Self::OwnerMissing => "ownerUserId",
        }
    }

    /// Whether `installations.reconcile` writes this defect.
    /// @returns true when reconcile can repair it.
    pub fn auto_repairable(self) -> bool {
        matches!(
            self,
            Self::DeployApplicationUnbound | Self::InstallationDisabled | Self::RelyingPartyMissing
        )
    }

    /// Whether repairing this defect needs a value from the caller.
    /// @returns true when the repair request must carry the field.
    pub fn requires_input(self) -> bool {
        matches!(
            self,
            Self::DeployApplicationUnbound | Self::RelyingPartyMissing
        )
    }

    /// Operation a caller uses when reconcile cannot repair the defect.
    /// @returns the owning operation id.
    pub fn repair_operation(self) -> &'static str {
        match self {
            Self::DeployApplicationUnbound
            | Self::InstallationDisabled
            | Self::RelyingPartyMissing => INSTALLATION_RECONCILE_REPAIR_OPERATION,
            Self::EnvironmentNotRegistered | Self::EnvironmentNotActive => {
                INSTALLATION_ENVIRONMENT_REPAIR_OPERATION
            }
            Self::PrimaryDomainMissing | Self::AccessPermissionsEmpty | Self::OwnerMissing => {
                INSTALLATION_UPDATE_REPAIR_OPERATION
            }
        }
    }

    /// Whether the defect blocks the named plane.
    /// @param plane - `issuance`, `login`, or `enable`.
    /// @returns true when the plane cannot work until the defect is repaired.
    pub fn blocks(self, plane: &str) -> bool {
        match (self, plane) {
            (Self::RelyingPartyMissing, "login") => true,
            (Self::RelyingPartyMissing, _) => false,
            (Self::PrimaryDomainMissing, "enable") => true,
            (Self::PrimaryDomainMissing, _) => false,
            (_, "enable") => false,
            _ => true,
        }
    }
}

/// One defect of one installation.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InstallationDefect {
    pub code: InstallationDefectCode,
    /// Human sentence explaining the defect and its repair.
    pub message: String,
    /// Planes (`issuance`, `login`, `enable`) the defect blocks.
    pub blocks: Vec<&'static str>,
}

/// Live environment row, reduced to the fields readiness reports.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InstallationEnvironmentState {
    pub environment_key: String,
    pub status: String,
}

/// Everything a caller needs to decide whether an installation can serve a
/// login or a credential, and what to repair when it cannot.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InstallationReadiness {
    pub installation_id: String,
    pub tenant_id: String,
    pub organization_id: String,
    pub application_type: String,
    pub status: String,
    pub deploy_application_id: Option<String>,
    pub ownership_scope: String,
    pub environments: Vec<InstallationEnvironmentState>,
    /// No defect blocks either plane.
    pub ready: bool,
    /// Defects sorted by severity: blocking first, then advisory.
    pub defects: Vec<InstallationDefect>,
    /// Operation that repairs what reconcile owns.
    pub repair_operation: &'static str,
}

impl InstallationReadiness {
    /// Defects that block credential issuance.
    /// @returns the defects whose `blocks` list names `issuance`.
    pub fn issuance_defects(&self) -> Vec<&InstallationDefect> {
        self.blocks("issuance")
    }

    /// Whether credential issuance may proceed.
    ///
    /// Narrower than [`Self::ready`]: a missing OAuth relying party blocks the
    /// hosted login but not an API credential, so an API-only installation stays
    /// issuable.
    /// @returns true when no defect blocks `issuance`.
    pub fn issuance_ready(&self) -> bool {
        self.issuance_defects().is_empty()
    }

    /// Defects that block the hosted browser login.
    /// @returns the defects whose `blocks` list names `login`.
    pub fn login_defects(&self) -> Vec<&InstallationDefect> {
        self.blocks("login")
    }

    /// One-line, machine-parseable repair instruction for a problem detail.
    ///
    /// The stable pieces are the defect codes with their fields and the repair
    /// operation id; the sentence around them is for the operator.
    /// @param plane - the plane that refused the request (`issuance`, `login`, `enable`).
    /// @returns the detail sentence.
    pub fn repair_detail(&self, plane: &str) -> String {
        let defects = self.blocks(plane);
        let listing = defects
            .iter()
            .map(|defect| format!("{}({})", defect.code.as_str(), defect.code.field()))
            .collect::<Vec<_>>()
            .join(", ");
        let operations = defects
            .iter()
            .map(|defect| defect.code.repair_operation())
            .collect::<std::collections::BTreeSet<_>>()
            .into_iter()
            .collect::<Vec<_>>()
            .join(", ");
        format!(
            "installation {} is not ready for {plane} — defects: {listing}; repair with {operations} \
             (GET /backend/v3/api/iam/installations/{}/readiness for the full document)",
            self.installation_id, self.installation_id
        )
    }

    fn blocks(&self, plane: &str) -> Vec<&InstallationDefect> {
        self.defects
            .iter()
            .filter(|defect| defect.blocks.contains(&plane))
            .collect()
    }
}

/// Failure reading an installation for assessment.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum InstallationReadinessError {
    /// The selector names no installation of the tenant.
    NotFound(String),
    /// Storage failed; the caller must not read this as "not ready".
    Internal(String),
}

impl InstallationReadinessError {
    /// Message safe to return in an API problem detail.
    /// @returns the human-readable detail.
    pub fn message(&self) -> &str {
        match self {
            Self::NotFound(message) | Self::Internal(message) => message,
        }
    }
}

/// Failure applying a reconcile command.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum InstallationReconcileError {
    /// The installation does not exist.
    NotFound(String),
    /// The request contradicts stored identity (another anchor, another client id).
    Conflict(String),
    /// The request or the stored row cannot be repaired as asked.
    Invalid(String),
    /// Storage or an unexpected service failure.
    Internal(String),
}

impl InstallationReconcileError {
    /// Message safe to return in an API problem detail.
    /// @returns the human-readable detail.
    pub fn message(&self) -> &str {
        match self {
            Self::NotFound(message)
            | Self::Conflict(message)
            | Self::Invalid(message)
            | Self::Internal(message) => message,
        }
    }
}

/// A reconcile request body.
///
/// Idempotency is identity/state based, matching the provisioning command: a
/// repeated call observes the state the first call produced, reports every step
/// `skipped`, and answers `changed: false`. `idempotency_key` is therefore a
/// correlation key, not a replay cache — it is recorded on the audit event of a
/// written repair so an operator can tie a pipeline run to the identity change it
/// caused. A call that only carries the key is refused: it repairs nothing.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct InstallationReconcileCommand {
    /// Deploy application to bind when the row has none. Never re-points.
    pub deploy_application_id: Option<String>,
    /// Runtime config patch applied through the installation update path
    /// (relying party completion).
    pub runtime_config: Option<Value>,
    /// Enable the installation when its lifecycle is not `enabled`.
    pub enable: bool,
    /// Report the plan without writing.
    pub dry_run: bool,
    /// Caller correlation key recorded on the audit event of a written repair.
    pub idempotency_key: Option<String>,
}

impl InstallationReconcileCommand {
    /// Whether the command asks for any write at all.
    /// @returns true when at least one field is supplied.
    pub fn is_empty(&self) -> bool {
        self.deploy_application_id.is_none() && self.runtime_config.is_none() && !self.enable
    }
}

/// Outcome status of one reconcile step.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum InstallationReconcileStepStatus {
    /// Written by this call.
    Applied,
    /// Would be written by a non-dry run.
    Planned,
    /// Already satisfied, or deliberately not touched.
    Skipped,
}

impl InstallationReconcileStepStatus {
    /// Wire spelling of the status.
    /// @returns the lowercase status.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Applied => "applied",
            Self::Planned => "planned",
            Self::Skipped => "skipped",
        }
    }
}

/// One repair step of a reconcile call.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InstallationReconcileStep {
    /// Installation field the step repairs.
    pub field: &'static str,
    pub status: InstallationReconcileStepStatus,
    /// Why the step ran, was planned, or was skipped.
    pub detail: String,
}

/// Result of one reconcile call.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InstallationReconcileOutcome {
    pub installation_id: String,
    pub dry_run: bool,
    /// At least one step was applied (always false for a dry run).
    pub changed: bool,
    /// Caller correlation key, echoed so a caller can match the answer to its run.
    pub idempotency_key: Option<String>,
    pub readiness_before: InstallationReadiness,
    /// State after the writes; equal to `readiness_before` for a dry run.
    pub readiness_after: InstallationReadiness,
    pub steps: Vec<InstallationReconcileStep>,
}

/// Parses a reconcile request body.
///
/// Unknown keys are ignored because the same body carries the bootstrap
/// credential the route authenticates with.
/// @param body - request body.
/// @returns the parsed command.
/// @throws String when a supplied field has the wrong shape.
pub fn parse_installation_reconcile_command(
    body: &Value,
) -> Result<InstallationReconcileCommand, String> {
    Ok(InstallationReconcileCommand {
        deploy_application_id: read_deploy_application_id(body)?,
        runtime_config: body
            .get("runtimeConfig")
            .or_else(|| body.get("runtime_config"))
            .cloned(),
        enable: read_optional_bool(body, &["enable", "enabled"])?.unwrap_or(false),
        dry_run: read_optional_bool(body, &["dryRun", "dry_run"])?.unwrap_or(false),
        idempotency_key: read_idempotency_key(body)?,
    })
}

/// Longest correlation key accepted on a reconcile request.
const RECONCILE_IDEMPOTENCY_KEY_MAX_LENGTH: usize = 128;

fn read_idempotency_key(body: &Value) -> Result<Option<String>, String> {
    for key in ["idempotencyKey", "idempotency_key"] {
        let Some(raw) = body.get(key) else { continue };
        if raw.is_null() {
            return Ok(None);
        }
        let Some(text) = raw.as_str() else {
            return Err(format!("{key} must be a string"));
        };
        let trimmed = text.trim();
        if trimmed.is_empty() {
            return Ok(None);
        }
        if trimmed.chars().count() > RECONCILE_IDEMPOTENCY_KEY_MAX_LENGTH {
            return Err(format!(
                "{key} must be at most {RECONCILE_IDEMPOTENCY_KEY_MAX_LENGTH} characters"
            ));
        }
        return Ok(Some(trimmed.to_owned()));
    }
    Ok(None)
}

/// Assesses one installation against its live environment rows.
///
/// Pure: no storage access, so the same function serves the HTTP readiness
/// route, the reconcile plan, and the unit tests.
/// @param installation - stored installation row.
/// @param environments - live `(environment_key, status)` rows.
/// @returns the readiness document.
pub fn assess_installation(
    installation: &TenantApplication,
    environments: &[(String, String)],
) -> InstallationReadiness {
    let environments = environments
        .iter()
        .map(|(key, status)| InstallationEnvironmentState {
            environment_key: key.clone(),
            status: status.clone(),
        })
        .collect::<Vec<_>>();
    let mut defects = Vec::new();

    let unbound = crate::is_blank(installation.deploy_application_id.as_deref());
    if unbound {
        defects.push(InstallationDefect {
            code: InstallationDefectCode::DeployApplicationUnbound,
            message: format!(
                "installation {} ({}) serves no deploy application (安装未绑定部署应用): bind \
                 deployApplicationId before any login or access token can name this deployment",
                installation.id, installation.app_id
            ),
            blocks: planes(&[("issuance", true), ("login", true), ("enable", false)]),
        });
    }
    if !has_relying_party(&installation.runtime_config) {
        defects.push(InstallationDefect {
            code: InstallationDefectCode::RelyingPartyMissing,
            message: format!(
                "installation {} registers no OAuth relying party (oauth.relyingParty), so the \
                 hosted authorization page has no client to start",
                installation.id
            ),
            blocks: planes(&[("issuance", false), ("login", true), ("enable", false)]),
        });
    }
    if installation.status != INSTALLATION_STATUS_ENABLED {
        defects.push(InstallationDefect {
            code: InstallationDefectCode::InstallationDisabled,
            message: format!(
                "installation {} is {} and must be enabled before it can issue credentials",
                installation.id, installation.status
            ),
            blocks: planes(&[("issuance", true), ("login", true), ("enable", false)]),
        });
    }
    if crate::is_blank(installation.primary_domain.as_deref()) {
        defects.push(InstallationDefect {
            code: InstallationDefectCode::PrimaryDomainMissing,
            message: format!(
                "installation {} has no primary domain, which blocks enabling it",
                installation.id
            ),
            blocks: planes(&[("issuance", false), ("login", false), ("enable", true)]),
        });
    }
    if installation.access_permissions.is_empty() {
        defects.push(InstallationDefect {
            code: InstallationDefectCode::AccessPermissionsEmpty,
            message: format!(
                "installation {} grants no access permission (accessPermissions), so no \
                 credential can be issued for it",
                installation.id
            ),
            blocks: planes(&[("issuance", true), ("login", false), ("enable", true)]),
        });
    }
    if environments.is_empty() {
        // Advisory, not blocking: `decide_installation_environment_access` treats an
        // installation with no environment rows as the pre-environment-scope shape
        // and lets it through. Reporting a hard blocker here would contradict the
        // gate the token exchange actually applies.
        defects.push(InstallationDefect {
            code: InstallationDefectCode::EnvironmentNotRegistered,
            message: format!(
                "installation {} registers no lifecycle environment; token exchanges still pass \
                 (the gate tolerates the pre-scope shape), but an environment-scoped release \
                 cannot address it",
                installation.id
            ),
            blocks: planes(&[("issuance", false), ("login", false), ("enable", false)]),
        });
    } else if !environments
        .iter()
        .any(|environment| environment.status == INSTALLATION_ENVIRONMENT_STATUS_ACTIVE)
    {
        defects.push(InstallationDefect {
            code: InstallationDefectCode::EnvironmentNotActive,
            message: format!(
                "installation {} has no active lifecycle environment, so every token exchange \
                 is refused",
                installation.id
            ),
            blocks: planes(&[("issuance", true), ("login", false), ("enable", false)]),
        });
    }
    if installation.ownership_scope.as_str() == "USER" && installation.owner_user_id.is_none() {
        defects.push(InstallationDefect {
            code: InstallationDefectCode::OwnerMissing,
            message: format!(
                "installation {} is USER-scoped without an ownerUserId, so its isolation key is \
                 undefined",
                installation.id
            ),
            blocks: planes(&[("issuance", true), ("login", false), ("enable", false)]),
        });
    }

    let ready = !defects.iter().any(|defect| {
        defect
            .blocks
            .iter()
            .any(|plane| *plane == "issuance" || *plane == "login")
    });

    InstallationReadiness {
        installation_id: installation.id.clone(),
        tenant_id: installation.tenant_id.clone(),
        organization_id: installation.organization_id.clone(),
        application_type: installation.application_type.clone(),
        status: installation.status.clone(),
        deploy_application_id: installation.deploy_application_id.clone(),
        ownership_scope: installation.ownership_scope.as_str().to_string(),
        environments,
        ready,
        defects,
        repair_operation: INSTALLATION_RECONCILE_REPAIR_OPERATION,
    }
}

/// Reads one installation and assesses it.
/// @param pg - IAM PostgreSQL pool.
/// @param tenant_id - owning tenant.
/// @param installation_id - installation row id.
/// @returns the readiness document.
/// @throws [`InstallationReadinessError`] when the row is missing or unreadable.
pub async fn load_installation_readiness(
    pg: &PgPool,
    tenant_id: &str,
    installation_id: &str,
) -> Result<InstallationReadiness, InstallationReadinessError> {
    let (installation, environments) =
        load_installation_and_environments(pg, tenant_id, installation_id).await?;
    Ok(assess_installation(&installation, &environments))
}

/// Serializes a readiness document for the wire.
/// @param readiness - assessed installation.
/// @returns the JSON body.
pub fn installation_readiness_to_json(readiness: &InstallationReadiness) -> Value {
    json!({
        "installationId": readiness.installation_id,
        "tenantId": readiness.tenant_id,
        "organizationId": readiness.organization_id,
        "applicationType": readiness.application_type,
        "status": readiness.status,
        "deployApplicationId": readiness.deploy_application_id,
        "ownershipScope": readiness.ownership_scope,
        "ready": readiness.ready,
        // The two planes are reported apart: an API-only installation with no
        // relying party is issuable but cannot serve the hosted login.
        "issuanceReady": readiness.issuance_ready(),
        "loginReady": readiness.login_defects().is_empty(),
        "repairOperation": readiness.repair_operation,
        "environments": readiness
            .environments
            .iter()
            .map(|environment| json!({
                "environmentKey": environment.environment_key,
                "status": environment.status,
            }))
            .collect::<Vec<_>>(),
        "defects": readiness
            .defects
            .iter()
            .map(|defect| json!({
                "code": defect.code.as_str(),
                "field": defect.code.field(),
                "message": defect.message,
                "blocks": defect.blocks,
                "autoRepairable": defect.code.auto_repairable(),
                "requiresInput": defect.code.requires_input(),
                "operation": defect.code.repair_operation(),
            }))
            .collect::<Vec<_>>(),
    })
}

/// Serializes a reconcile outcome for the wire.
/// @param outcome - applied or planned reconciliation.
/// @returns the JSON body.
pub fn installation_reconcile_outcome_to_json(outcome: &InstallationReconcileOutcome) -> Value {
    json!({
        "installationId": outcome.installation_id,
        "dryRun": outcome.dry_run,
        "changed": outcome.changed,
        "idempotencyKey": outcome.idempotency_key,
        "steps": outcome
            .steps
            .iter()
            .map(|step| json!({
                "field": step.field,
                "status": step.status.as_str(),
                "detail": step.detail,
            }))
            .collect::<Vec<_>>(),
        "readinessBefore": installation_readiness_to_json(&outcome.readiness_before),
        "readinessAfter": installation_readiness_to_json(&outcome.readiness_after),
    })
}

/// Applies one reconcile command to an installation.
///
/// Whitelist, in order: bind a missing deploy anchor (compare-and-set, never a
/// re-point), apply an explicit runtime config through the installation update
/// path (relying-party completion), then enable the lifecycle. Every step is
/// idempotent: a repeated call reports `skipped` and `changed: false`.
/// @param pg - IAM PostgreSQL pool.
/// @param tenant_id - owning tenant.
/// @param installation_id - installation row id.
/// @param command - parsed reconcile request.
/// @returns the outcome, including the before and after readiness.
/// @throws [`InstallationReconcileError`] when the request cannot be satisfied.
pub async fn reconcile_installation(
    pg: &PgPool,
    tenant_id: &str,
    installation_id: &str,
    command: &InstallationReconcileCommand,
) -> Result<InstallationReconcileOutcome, InstallationReconcileError> {
    let (installation, environments) =
        load_installation_and_environments(pg, tenant_id, installation_id)
            .await
            .map_err(map_readiness_error)?;
    let readiness_before = assess_installation(&installation, &environments);
    let mut steps = Vec::new();
    let mut changed = false;

    if let Some(requested) = command.deploy_application_id.as_deref() {
        let requested = requested.trim();
        match readiness_before.deploy_application_id.as_deref() {
            Some(bound) if bound.trim() == requested => steps.push(InstallationReconcileStep {
                field: "deployApplicationId",
                status: InstallationReconcileStepStatus::Skipped,
                detail: format!("installation already serves deploy application {bound}"),
            }),
            Some(bound) => {
                return Err(InstallationReconcileError::Conflict(format!(
                    "installation {installation_id} already serves deploy application {bound}; \
                     re-pointing it is a deploy identity migration, not a repair — disable and \
                     provision the deployment again instead"
                )))
            }
            None => {
                if command.dry_run {
                    steps.push(InstallationReconcileStep {
                        field: "deployApplicationId",
                        status: InstallationReconcileStepStatus::Planned,
                        detail: format!(
                            "would bind the installation to deploy application {requested}"
                        ),
                    });
                } else {
                    bind_tenant_application_deploy_application_id(
                        pg,
                        tenant_id,
                        installation_id,
                        requested,
                    )
                    .await
                    .map_err(classify_repair_error)?;
                    changed = true;
                    steps.push(InstallationReconcileStep {
                        field: "deployApplicationId",
                        status: InstallationReconcileStepStatus::Applied,
                        detail: format!("bound the installation to deploy application {requested}"),
                    });
                }
            }
        }
    }

    if let Some(runtime_config) = command.runtime_config.as_ref() {
        if !runtime_config.is_object()
            || runtime_config
                .as_object()
                .is_some_and(|object| object.is_empty())
        {
            return Err(InstallationReconcileError::Invalid(
                "runtimeConfig must be a non-empty object when supplied".to_string(),
            ));
        }
        if command.dry_run {
            steps.push(InstallationReconcileStep {
                field: "runtimeConfig",
                status: InstallationReconcileStepStatus::Planned,
                detail: "would apply the runtime config patch".to_string(),
            });
        } else {
            // The update path rewrites `domainConfig` from the command, so the
            // stored value is passed through instead of letting it default to
            // `{}` and erase a deployment's domain configuration.
            let domain_config = load_stored_domain_config(pg, tenant_id, installation_id).await?;
            update_tenant_application(
                pg,
                tenant_id,
                installation_id,
                &TenantApplicationUpdateCommand {
                    primary_domain: None,
                    domain_config: Some(domain_config),
                    access_permissions: None,
                    runtime_config: Some(runtime_config.clone()),
                    deploy_application_id: None,
                },
            )
            .await
            .map_err(classify_repair_error)?;
            changed = true;
            steps.push(InstallationReconcileStep {
                field: "runtimeConfig",
                status: InstallationReconcileStepStatus::Applied,
                detail: "applied the runtime config patch".to_string(),
            });
        }
    }

    if command.enable {
        if readiness_before.status == INSTALLATION_STATUS_ENABLED {
            steps.push(InstallationReconcileStep {
                field: "status",
                status: InstallationReconcileStepStatus::Skipped,
                detail: "installation is already enabled".to_string(),
            });
        } else if command.dry_run {
            steps.push(InstallationReconcileStep {
                field: "status",
                status: InstallationReconcileStepStatus::Planned,
                detail: "would enable the installation".to_string(),
            });
        } else {
            enable_tenant_application(pg, tenant_id, installation_id)
                .await
                .map_err(classify_repair_error)?;
            changed = true;
            steps.push(InstallationReconcileStep {
                field: "status",
                status: InstallationReconcileStepStatus::Applied,
                detail: "enabled the installation".to_string(),
            });
        }
    }

    let readiness_after = if command.dry_run || !changed {
        readiness_before.clone()
    } else {
        let (installation, environments) =
            load_installation_and_environments(pg, tenant_id, installation_id)
                .await
                .map_err(map_readiness_error)?;
        assess_installation(&installation, &environments)
    };

    Ok(InstallationReconcileOutcome {
        installation_id: installation_id.to_owned(),
        dry_run: command.dry_run,
        changed,
        idempotency_key: command.idempotency_key.clone(),
        readiness_before,
        readiness_after,
        steps,
    })
}

async fn load_installation_and_environments(
    pg: &PgPool,
    tenant_id: &str,
    installation_id: &str,
) -> Result<(TenantApplication, Vec<(String, String)>), InstallationReadinessError> {
    let installation = resolve_tenant_application(pg, tenant_id, Some(installation_id), None, None)
        .await
        .map_err(InstallationReadinessError::Internal)?
        .ok_or_else(|| {
            InstallationReadinessError::NotFound(format!(
                "installation {installation_id} was not found in tenant {tenant_id}"
            ))
        })?;
    let environments = load_installation_environments(pg, tenant_id, installation_id)
        .await
        .map_err(InstallationReadinessError::Internal)?;
    Ok((installation, environments))
}

async fn load_stored_domain_config(
    pg: &PgPool,
    tenant_id: &str,
    installation_id: &str,
) -> Result<Value, InstallationReconcileError> {
    let stored: Option<Value> = sqlx::query_scalar(
        "SELECT domain_config_json FROM iam_application_installation \
         WHERE tenant_id = $1 AND id = $2 LIMIT 1",
    )
    .bind(tenant_id)
    .bind(installation_id)
    .fetch_optional(pg)
    .await
    .map_err(|error| {
        InstallationReconcileError::Internal(format!(
            "load installation domain config failed: {error}"
        ))
    })?;
    Ok(stored.unwrap_or_else(|| json!({})))
}

fn map_readiness_error(error: InstallationReadinessError) -> InstallationReconcileError {
    match error {
        InstallationReadinessError::NotFound(message) => {
            InstallationReconcileError::NotFound(message)
        }
        InstallationReadinessError::Internal(message) => {
            InstallationReconcileError::Internal(message)
        }
    }
}

fn classify_repair_error(message: String) -> InstallationReconcileError {
    if message.contains("not found") {
        InstallationReconcileError::NotFound(message)
    } else if message.contains("is already bound to deploy application")
        // `ensure_deploy_application_unclaimed`: the requested deploy application
        // already serves another installation. It is the caller's conflict, not an
        // outage, and the message names the conflicting installation.
        || message.contains("is already bound to installation")
        || message.contains("was linked to another deploy application concurrently")
        || message.contains("already registered")
    {
        InstallationReconcileError::Conflict(message)
    } else if message.contains("must be")
        || message.contains("must not")
        || message.contains("is required")
        || message.contains("requires")
        || message.contains("invalid")
    {
        InstallationReconcileError::Invalid(message)
    } else {
        InstallationReconcileError::Internal(message)
    }
}

fn has_relying_party(runtime_config: &Value) -> bool {
    runtime_config
        .pointer("/oauth/relyingParty")
        .is_some_and(Value::is_object)
}

fn planes(entries: &[(&'static str, bool)]) -> Vec<&'static str> {
    entries
        .iter()
        .filter(|(_, blocked)| *blocked)
        .map(|(plane, _)| *plane)
        .collect()
}

fn read_deploy_application_id(body: &Value) -> Result<Option<String>, String> {
    for key in [
        "deployApplicationId",
        "deploy_application_id",
        "appId",
        "app_id",
    ] {
        let Some(raw) = body.get(key) else { continue };
        if raw.is_null() {
            return Ok(None);
        }
        let Some(text) = raw.as_str() else {
            return Err(format!("{key} must be a string"));
        };
        // A blank anchor is refused rather than read as "unset": the caller
        // named the field, and an installation is one-to-one with a deploy
        // application, so a blank value is a malformed request.
        if crate::is_blank(Some(text)) {
            return Err(
                "deployApplicationId must not be blank: an installation is one-to-one with a \
                 deploy application"
                    .to_string(),
            );
        }
        return Ok(Some(text.trim().to_owned()));
    }
    Ok(None)
}

fn read_optional_bool(body: &Value, keys: &[&str]) -> Result<Option<bool>, String> {
    for key in keys {
        let Some(raw) = body.get(*key) else { continue };
        if raw.is_null() {
            return Ok(None);
        }
        let Some(value) = raw.as_bool() else {
            return Err(format!("{key} must be a boolean"));
        };
        return Ok(Some(value));
    }
    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application_scope::ApplicationOwnershipScope;

    fn installation() -> TenantApplication {
        TenantApplication {
            id: "tapp_100001_0_01a18b4f_6eed".to_string(),
            app_id: "app_01a18b4f_test".to_string(),
            tenant_id: "100001".to_string(),
            organization_id: "0".to_string(),
            instance_key: "382429273660592128_prod".to_string(),
            display_name: "SDKWork Birdcoder".to_string(),
            environment: "production".to_string(),
            application_type: "desktop".to_string(),
            status: "pending".to_string(),
            primary_domain: Some("birdcoder2.sdkwork.com".to_string()),
            access_permissions: vec!["iam.users.read".to_string()],
            runtime_config: json!({}),
            deploy_application_id: None,
            ownership_scope: ApplicationOwnershipScope::Tenant,
            owner_user_id: None,
        }
    }

    fn active_environment() -> Vec<(String, String)> {
        vec![("production".to_string(), "active".to_string())]
    }

    #[test]
    fn unbound_installation_reports_the_anchor_and_blocks_login() {
        let readiness = assess_installation(&installation(), &active_environment());
        let codes = readiness
            .defects
            .iter()
            .map(|defect| defect.code)
            .collect::<Vec<_>>();
        assert!(codes.contains(&InstallationDefectCode::DeployApplicationUnbound));
        let unbound = readiness
            .defects
            .iter()
            .find(|defect| defect.code == InstallationDefectCode::DeployApplicationUnbound)
            .expect("anchor defect");
        assert!(unbound.blocks.contains(&"issuance"));
        assert!(unbound.blocks.contains(&"login"));
        assert!(InstallationDefectCode::DeployApplicationUnbound.auto_repairable());
        assert!(InstallationDefectCode::DeployApplicationUnbound.requires_input());
        assert!(!readiness.ready);
    }

    #[test]
    fn bound_enabled_installation_with_a_relying_party_is_ready() {
        let mut installation = installation();
        installation.status = "enabled".to_string();
        installation.deploy_application_id = Some("382429273660592128".to_string());
        installation.runtime_config = json!({
            "oauth": { "relyingParty": { "clientId": "birdcoder", "enabled": true } }
        });
        let readiness = assess_installation(&installation, &active_environment());
        assert!(readiness.defects.is_empty(), "{:?}", readiness.defects);
        assert!(readiness.ready);
    }

    #[test]
    fn missing_relying_party_blocks_login_but_not_issuance() {
        let mut installation = installation();
        installation.status = "enabled".to_string();
        installation.deploy_application_id = Some("382429273660592128".to_string());
        let readiness = assess_installation(&installation, &active_environment());
        let relying_party = readiness
            .defects
            .iter()
            .find(|defect| defect.code == InstallationDefectCode::RelyingPartyMissing)
            .expect("relying party defect");
        assert_eq!(relying_party.blocks, vec!["login"]);
        assert!(!InstallationDefectCode::RelyingPartyMissing.blocks("issuance"));
        assert!(!readiness.ready);
    }

    #[test]
    fn missing_environment_and_scope_are_reported_separately() {
        let mut installation = installation();
        installation.status = "enabled".to_string();
        installation.deploy_application_id = Some("382429273660592128".to_string());
        installation.runtime_config = json!({
            "oauth": { "relyingParty": { "clientId": "birdcoder", "enabled": true } }
        });
        installation.access_permissions.clear();
        let readiness = assess_installation(&installation, &[]);
        let codes = readiness
            .defects
            .iter()
            .map(|defect| defect.code)
            .collect::<Vec<_>>();
        assert!(codes.contains(&InstallationDefectCode::EnvironmentNotRegistered));
        assert!(codes.contains(&InstallationDefectCode::AccessPermissionsEmpty));
    }

    #[test]
    fn issuance_readiness_ignores_a_missing_relying_party() {
        let mut installation = installation();
        installation.status = "enabled".to_string();
        installation.deploy_application_id = Some("382429273660592128".to_string());
        let readiness = assess_installation(&installation, &active_environment());
        // The hosted login cannot start without a relying party, but an API
        // credential does not depend on it.
        assert!(readiness.login_defects().len() == 1);
        assert!(readiness.issuance_ready());
        assert!(!readiness.ready);
    }

    #[test]
    fn repair_detail_names_the_codes_and_the_repair_operation() {
        let readiness = assess_installation(&installation(), &active_environment());
        let detail = readiness.repair_detail("issuance");
        assert!(
            detail.contains("deploy_application_unbound(deployApplicationId)"),
            "{detail}"
        );
        assert!(detail.contains("iam.installations.reconcile"), "{detail}");
        assert!(!readiness.issuance_ready());
    }

    #[test]
    fn parse_reads_the_anchor_flags_and_the_correlation_key() {
        let command = parse_installation_reconcile_command(&json!({
            "tenantId": "100001",
            "deployApplicationId": "382429273660592128",
            "enable": true,
            "dryRun": true,
            "idempotencyKey": " pipeline-run-42 ",
        }))
        .expect("command");
        assert_eq!(
            command.deploy_application_id.as_deref(),
            Some("382429273660592128")
        );
        assert!(command.enable);
        assert!(command.dry_run);
        assert_eq!(command.idempotency_key.as_deref(), Some("pipeline-run-42"));
    }

    #[test]
    fn a_key_alone_is_not_a_repair_request() {
        let command = parse_installation_reconcile_command(&json!({
            "tenantId": "100001",
            "idempotencyKey": "pipeline-run-42",
        }))
        .expect("command");
        assert!(command.is_empty());
        assert_eq!(command.idempotency_key.as_deref(), Some("pipeline-run-42"));
    }

    #[test]
    fn a_claimed_deploy_application_is_a_conflict_not_an_outage() {
        // `ensure_deploy_application_unclaimed` answers with the installation that
        // already owns the anchor; the operator must see a 409 naming it, not a 503.
        let error = classify_repair_error(
            "deploy application 382429273660592128 is already bound to installation \
             tapp_100001_0_382429273660592128 of tenant 100001; an installation is one-to-one \
             with a deploy application"
                .to_string(),
        );
        assert!(matches!(error, InstallationReconcileError::Conflict(_)));
        let error = classify_repair_error(
            "installation is already bound to deploy application 382429273660592128; an update \
             may only fill a missing anchor"
                .to_string(),
        );
        assert!(matches!(error, InstallationReconcileError::Conflict(_)));
        let error = classify_repair_error("connect postgres failed".to_string());
        assert!(matches!(error, InstallationReconcileError::Internal(_)));
    }

    #[test]
    fn a_missing_environment_row_is_advisory_but_a_non_active_one_is_not() {
        let mut installation = installation();
        installation.status = "enabled".to_string();
        installation.deploy_application_id = Some("382429273660592128".to_string());
        installation.runtime_config = json!({
            "oauth": { "relyingParty": { "clientId": "birdcoder", "enabled": true } }
        });
        // No environment rows: the runtime gate tolerates the pre-scope shape.
        let none = assess_installation(&installation, &[]);
        assert!(none
            .defects
            .iter()
            .any(|defect| defect.code == InstallationDefectCode::EnvironmentNotRegistered));
        assert!(none.issuance_ready());
        // Registered but inactive: the gate refuses.
        let pending = assess_installation(
            &installation,
            &[("production".to_string(), "pending".to_string())],
        );
        assert!(pending
            .defects
            .iter()
            .any(|defect| defect.code == InstallationDefectCode::EnvironmentNotActive));
        assert!(!pending.issuance_ready());
    }

    #[test]
    fn parse_reads_anchor_dry_run_and_enable() {
        let command = parse_installation_reconcile_command(&json!({
            "tenantId": "100001",
            "deployApplicationId": "382429273660592128",
            "enable": true,
            "dryRun": true,
        }))
        .expect("command");
        assert_eq!(
            command.deploy_application_id.as_deref(),
            Some("382429273660592128")
        );
        assert!(command.enable);
        assert!(command.dry_run);
    }

    #[test]
    fn parse_rejects_a_blank_anchor_and_a_non_boolean_flag() {
        assert!(parse_installation_reconcile_command(&json!({
            "deployApplicationId": "   ",
        }))
        .is_err());
        assert!(parse_installation_reconcile_command(&json!({ "enable": "yes" })).is_err());
    }
}
