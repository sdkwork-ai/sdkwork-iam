//! Application release scope and data-isolation key.
//!
//! Authority: `APPLICATION_IDENTITY_SPEC.md` section 4.1 and `IAM_SPEC.md`
//! sections 3 and 5.2.
//!
//! One source tree produces different deployments whose only difference is the
//! level the application was published at. That level is stored on the
//! installation (`iam_application_installation.ownership_scope`) and decides:
//!
//! - which isolation key a data-plane query filters by,
//! - which `organization_id` and `ownership_scope` the signed access token
//!   carries,
//! - whether the credential's subject must be the installation owner.
//!
//! The vocabulary is shared with the deployment inventory
//! (`deploy_app.owner_type`), so a release is classified the same way on both
//! sides of the boundary.

use serde_json::{json, Value};

/// The level one installation was released at (`APPLICATION_IDENTITY_SPEC.md`
/// section 4.1).
///
/// `PLATFORM` is deliberately absent: it belongs to the deployment inventory's
/// platform-internal applications. An installation is always addressable by one
/// tenant, and a platform application is installed `TENANT`-shaped
/// (`organization_id = 0`, no owner).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ApplicationOwnershipScope {
    /// Released to the whole tenant. Isolation key `(tenant_id, app_id)`.
    Tenant,
    /// Released to one organization. Isolation key
    /// `(tenant_id, organization_id, app_id)`.
    Organization,
    /// Released to one person. Isolation key `(tenant_id, app_id, user_id)`.
    User,
}

impl ApplicationOwnershipScope {
    /// Every selectable level, widest first.
    pub const ALL: [Self; 3] = [Self::Tenant, Self::Organization, Self::User];

    /// The default release scope: `TENANT` is the only level a caller gets
    /// without asking for one.
    pub const DEFAULT: Self = Self::Tenant;

    /// Canonical wire and storage spelling (also the signed claim value).
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Tenant => "TENANT",
            Self::Organization => "ORGANIZATION",
            Self::User => "USER",
        }
    }

    /// Parses a stored, requested, or claimed value. Case-insensitive, but the
    /// value must be exactly one of the three levels: an unknown value is `None`
    /// so every caller fails closed instead of mapping it to the default.
    pub fn parse(value: &str) -> Option<Self> {
        match value.trim().to_ascii_uppercase().as_str() {
            "TENANT" => Some(Self::Tenant),
            "ORGANIZATION" => Some(Self::Organization),
            "USER" => Some(Self::User),
            _ => None,
        }
    }

    /// Reads an optional claim/column value, reporting an unparsable value as an
    /// error instead of silently defaulting it.
    pub fn parse_optional(value: Option<&str>) -> Result<Option<Self>, String> {
        match value.map(str::trim).filter(|value| !value.is_empty()) {
            None => Ok(None),
            Some(value) => Self::parse(value).map(Some).ok_or_else(|| {
                format!(
                    "unknown application ownership scope {value:?}; expected one of {}",
                    Self::ALL.map(Self::as_str).join(", ")
                )
            }),
        }
    }

    /// Legacy derivation for a credential or row written before the scope was
    /// recorded: `0`/absent organization is a tenant-level release, a non-zero
    /// organization id is an organization release. It can never yield `USER`,
    /// so a personal release is never inferred from ambient data.
    pub fn derive_from_organization_scope(organization_id: Option<&str>) -> Self {
        match organization_id.map(str::trim) {
            Some(value) if !value.is_empty() && value != "0" => Self::Organization,
            _ => Self::Tenant,
        }
    }

    /// The `organization_id` a credential of this scope must carry: the
    /// installation's organization for an organization release, the tenant
    /// sentinel `0` otherwise.
    pub fn organization_claim<'a>(self, installation_organization_id: &'a str) -> &'a str {
        match self {
            Self::Organization => installation_organization_id,
            Self::Tenant | Self::User => "0",
        }
    }

    /// Whether the level is shared inside its tenant.
    pub const fn is_shared(self) -> bool {
        matches!(self, Self::Tenant)
    }

    /// The isolation key columns a data-plane query filters by.
    pub fn isolation_key(
        self,
        tenant_id: &str,
        organization_id: Option<&str>,
        app_id: &str,
        user_id: Option<&str>,
    ) -> ApplicationIsolationKey {
        let organization_scope = sdkwork_iam_context_service::normalize_resolved_organization_scope(
            organization_id,
        );
        ApplicationIsolationKey {
            scope: self,
            tenant_id: tenant_id.to_owned(),
            app_id: app_id.to_owned(),
            organization_id: if self == Self::Organization {
                organization_scope
            } else {
                "0".to_owned()
            },
            user_id: match self {
                Self::User => user_id.map(str::trim).filter(|v| !v.is_empty()).map(str::to_owned),
                _ => None,
            },
        }
    }

    pub fn to_json(self) -> Value {
        json!(self.as_str())
    }
}

impl std::fmt::Display for ApplicationOwnershipScope {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(self.as_str())
    }
}

/// The column tuple one release scope filters a data-plane query by.
///
/// `APPLICATION_IDENTITY_SPEC.md` section 4.1: filtering a personal or
/// organization release by `(tenant_id, app_id)` alone reads rows that belong to
/// somebody else. Downstream modules bind [`Self::filter_columns`] instead of
/// hand-writing the tuple.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ApplicationIsolationKey {
    pub scope: ApplicationOwnershipScope,
    pub tenant_id: String,
    pub app_id: String,
    /// The organization column value: the organization id for an organization
    /// release, the tenant sentinel `0` otherwise.
    pub organization_id: String,
    /// Present only for a personal release.
    pub user_id: Option<String>,
}

impl ApplicationIsolationKey {
    /// Ordered `(column, value)` pairs to bind as equality predicates.
    pub fn filter_columns(&self) -> Vec<(&'static str, &str)> {
        let mut columns = vec![
            ("tenant_id", self.tenant_id.as_str()),
            ("app_id", self.app_id.as_str()),
        ];
        match self.scope {
            ApplicationOwnershipScope::Tenant => {}
            ApplicationOwnershipScope::Organization => {
                columns.push(("organization_id", self.organization_id.as_str()));
            }
            ApplicationOwnershipScope::User => {
                if let Some(user_id) = self.user_id.as_deref() {
                    columns.push(("user_id", user_id));
                }
            }
        }
        columns
    }
}

/// The validated scope of one installation provisioning request.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ResolvedInstallationScope {
    pub scope: ApplicationOwnershipScope,
    pub owner_user_id: Option<String>,
}

/// Validates the release scope a provisioning command asks for.
///
/// `APPLICATION_IDENTITY_SPEC.md` section 4.1 and `IAM_SPEC.md` section 3: the
/// scope and its owner/organization pointer must agree. A mismatched pair is a
/// hard error — defaulting it would publish the application at a level the
/// caller never chose, and a `USER` release without an owner has no isolation
/// key at all.
pub fn resolve_installation_scope(
    requested: Option<&str>,
    organization_id: &str,
    owner_user_id: Option<&str>,
) -> Result<ResolvedInstallationScope, String> {
    let scope = match ApplicationOwnershipScope::parse_optional(requested)? {
        Some(scope) => scope,
        None => ApplicationOwnershipScope::DEFAULT,
    };
    let organization_id = organization_id.trim();
    if organization_id.is_empty() {
        return Err(
            "organizationId is required to provision an installation: use \"0\" for a tenant or personal release"
                .to_string(),
        );
    }
    let owner_user_id = owner_user_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned);
    let tenant_level = organization_id == "0";

    match scope {
        ApplicationOwnershipScope::Tenant => {
            if !tenant_level {
                return Err(format!(
                    "ownershipScope TENANT requires organizationId \"0\", got {organization_id:?}; \
                     an organization release must ask for ownershipScope ORGANIZATION"
                ));
            }
            if owner_user_id.is_some() {
                return Err(
                    "ownershipScope TENANT has no owner: omit ownerUserId, or ask for ownershipScope USER"
                        .to_string(),
                );
            }
        }
        ApplicationOwnershipScope::Organization => {
            if tenant_level || !organization_id.chars().all(|c| c.is_ascii_digit()) {
                return Err(format!(
                    "ownershipScope ORGANIZATION requires a positive numeric organizationId, got {organization_id:?}"
                ));
            }
            if owner_user_id.is_some() {
                return Err(
                    "ownershipScope ORGANIZATION has no owner: omit ownerUserId, or ask for ownershipScope USER"
                        .to_string(),
                );
            }
        }
        ApplicationOwnershipScope::User => {
            if !tenant_level {
                return Err(format!(
                    "ownershipScope USER requires organizationId \"0\", got {organization_id:?}; \
                     a personal release is not organization-scoped"
                ));
            }
            if owner_user_id.is_none() {
                return Err(
                    "ownershipScope USER requires ownerUserId: a personal release has no other isolation key"
                        .to_string(),
                );
            }
        }
    }

    Ok(ResolvedInstallationScope {
        scope,
        owner_user_id,
    })
}

/// Fails closed when a credential request declares a scope that the installation
/// was not released at.
///
/// The installation is the authority (`APPLICATION_IDENTITY_SPEC.md` section
/// 4.1 rule 3). An absent request value is the normal case and simply inherits
/// the installation's scope.
pub fn ensure_requested_scope_matches_installation(
    requested: Option<&str>,
    installation_scope: ApplicationOwnershipScope,
) -> Result<(), String> {
    let Some(requested) = ApplicationOwnershipScope::parse_optional(requested)? else {
        return Ok(());
    };
    if requested == installation_scope {
        return Ok(());
    }
    Err(format!(
        "requested ownershipScope {} does not match the installation's release scope {}; \
         the installation decides its scope and a credential must not change it",
        requested.as_str(),
        installation_scope.as_str()
    ))
}

/// Whether a claim value can name an IAM user.
///
/// `IAM_SPEC.md` §5.2 and `SUBJECT_ID_SPEC.md` §3 require a `user_id` claim to be
/// a positive numeric snowflake string; `0` is the tenant-level sentinel and
/// never names a user. An opaque or non-numeric value is therefore not a
/// subject id, and comparing it with `owner_user_id` would accept a malformed
/// claim whenever the installation happened to store the same string.
pub fn is_valid_user_id_claim(value: &str) -> bool {
    let value = value.trim();
    !value.is_empty()
        && value.bytes().all(|byte| byte.is_ascii_digit())
        && value.parse::<i64>().is_ok_and(|id| id > 0)
}

/// Fails closed when a public application access token's `user_id` claim is not
/// the owner of the `USER`-scoped installation it names.
///
/// `APPLICATION_IDENTITY_SPEC.md` §4.1 rules 7, 8, and 10 and
/// `APP_ACCESS_TOKEN_SPEC.md` §3.2.1: a personal release credentials exactly its
/// owner, so the credential's subject claim `MUST` be present, `MUST` be a legal
/// IAM user id, and `MUST` equal `iam_application_installation.owner_user_id`.
/// The error names the installation, the claim, and the expected owner, so an
/// operator can diagnose the rejection without inspecting the token payload.
///
/// Returns the owner user id the caller must project as the credential subject.
pub fn ensure_public_token_subject_is_installation_owner(
    installation_id: &str,
    owner_user_id: Option<&str>,
    claim_user_id: Option<&str>,
) -> Result<String, String> {
    let owner_user_id = owner_user_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            format!(
                "USER-scoped installation {installation_id} has no owner_user_id; \
                 a public application token cannot be bound to a subject"
            )
        })?;
    if !is_valid_user_id_claim(owner_user_id) {
        return Err(format!(
            "USER-scoped installation {installation_id} records owner_user_id {owner_user_id:?}, \
             which is not a positive decimal IAM user id; the installation cannot accept a public \
             application token until the owner is repaired"
        ));
    }
    let Some(claim_user_id) = claim_user_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return Err(format!(
            "USER-scoped installation {installation_id} requires the public application token's \
             user_id claim to equal its owner {owner_user_id}, but the claim is absent"
        ));
    };
    if !is_valid_user_id_claim(claim_user_id) {
        return Err(format!(
            "public application token user_id claim {claim_user_id:?} is not a positive decimal \
             IAM user id; USER-scoped installation {installation_id} requires its owner \
             {owner_user_id}"
        ));
    }
    if claim_user_id != owner_user_id {
        return Err(format!(
            "USER-scoped installation {installation_id} accepts only its owner's public \
             application token: user_id claim {claim_user_id} does not equal the installation \
             owner {owner_user_id}"
        ));
    }
    Ok(owner_user_id.to_owned())
}

/// Fails closed when a `USER`-scoped installation would issue a credential for a
/// subject other than its owner.
pub fn ensure_subject_is_installation_owner(
    installation_scope: ApplicationOwnershipScope,
    owner_user_id: Option<&str>,
    subject_user_id: &str,
) -> Result<(), String> {
    if installation_scope != ApplicationOwnershipScope::User {
        return Ok(());
    }
    let owner_user_id = owner_user_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            "USER-scoped installation has no ownerUserId; it cannot issue a credential until the owner is recorded"
                .to_string()
        })?;
    if owner_user_id != subject_user_id.trim() {
        return Err(format!(
            "USER-scoped installation belongs to user {owner_user_id} and must not issue a credential for {subject_user_id}"
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_release_scope_is_tenant() {
        assert_eq!(
            ApplicationOwnershipScope::DEFAULT,
            ApplicationOwnershipScope::Tenant
        );
        assert_eq!(
            resolve_installation_scope(None, "0", None).expect("default scope"),
            ResolvedInstallationScope {
                scope: ApplicationOwnershipScope::Tenant,
                owner_user_id: None,
            }
        );
        // A blank request value is an absent one, not an unknown enum.
        assert_eq!(
            resolve_installation_scope(Some("  "), "0", None)
                .expect("blank defaults")
                .scope,
            ApplicationOwnershipScope::Tenant
        );
    }

    #[test]
    fn scope_and_pointer_must_agree() {
        assert!(resolve_installation_scope(Some("TENANT"), "42", None).is_err());
        assert!(resolve_installation_scope(Some("ORGANIZATION"), "0", None).is_err());
        assert!(resolve_installation_scope(Some("ORGANIZATION"), "org-1", None).is_err());
        assert!(resolve_installation_scope(Some("USER"), "42", Some("u-1")).is_err());
        assert!(resolve_installation_scope(Some("USER"), "0", None).is_err());
        assert!(resolve_installation_scope(Some("PLATFORM"), "0", None).is_err());
        assert!(resolve_installation_scope(Some("GLOBAL"), "0", None).is_err());
        assert!(resolve_installation_scope(Some("TENANT"), "0", Some("u-1")).is_err());

        assert_eq!(
            resolve_installation_scope(Some("organization"), "42", None)
                .expect("organization release")
                .scope,
            ApplicationOwnershipScope::Organization
        );
        assert_eq!(
            resolve_installation_scope(Some("USER"), "0", Some(" u-1 "))
                .expect("personal release")
                .owner_user_id
                .as_deref(),
            Some("u-1")
        );
    }

    #[test]
    fn unknown_claim_values_never_fall_back_to_the_default() {
        assert_eq!(None, ApplicationOwnershipScope::parse("GLOBAL"));
        assert!(ApplicationOwnershipScope::parse_optional(Some("GLOBAL")).is_err());
        assert_eq!(
            Some(ApplicationOwnershipScope::User),
            ApplicationOwnershipScope::parse("user")
        );
    }

    #[test]
    fn legacy_derivation_never_yields_a_personal_release() {
        assert_eq!(
            ApplicationOwnershipScope::Tenant,
            ApplicationOwnershipScope::derive_from_organization_scope(None)
        );
        assert_eq!(
            ApplicationOwnershipScope::Tenant,
            ApplicationOwnershipScope::derive_from_organization_scope(Some("0"))
        );
        for organization_id in ["42", "100001"] {
            assert_eq!(
                ApplicationOwnershipScope::Organization,
                ApplicationOwnershipScope::derive_from_organization_scope(Some(organization_id))
            );
        }
    }

    #[test]
    fn isolation_keys_match_the_standard() {
        let tenant = ApplicationOwnershipScope::Tenant.isolation_key(
            "100001",
            Some("0"),
            "deploy-app",
            Some("user-1"),
        );
        assert_eq!(
            tenant.filter_columns(),
            vec![("tenant_id", "100001"), ("app_id", "deploy-app")]
        );

        let organization = ApplicationOwnershipScope::Organization.isolation_key(
            "100001",
            Some("42"),
            "deploy-app",
            Some("user-1"),
        );
        assert_eq!(
            organization.filter_columns(),
            vec![
                ("tenant_id", "100001"),
                ("app_id", "deploy-app"),
                ("organization_id", "42"),
            ]
        );

        let user = ApplicationOwnershipScope::User.isolation_key(
            "100001",
            Some("0"),
            "deploy-app",
            Some("user-1"),
        );
        assert_eq!(
            user.filter_columns(),
            vec![
                ("tenant_id", "100001"),
                ("app_id", "deploy-app"),
                ("user_id", "user-1"),
            ]
        );
    }

    #[test]
    fn issuance_rejects_a_scope_the_installation_does_not_have() {
        ensure_requested_scope_matches_installation(None, ApplicationOwnershipScope::User)
            .expect("an undeclared request inherits the installation scope");
        ensure_requested_scope_matches_installation(
            Some("user"),
            ApplicationOwnershipScope::User,
        )
        .expect("matching scope");

        let error =
            ensure_requested_scope_matches_installation(Some("TENANT"), ApplicationOwnershipScope::User)
                .expect_err("widening the installation scope must fail closed");
        assert!(error.contains("USER"), "{error}");
        assert!(error.contains("TENANT"), "{error}");
    }

    #[test]
    fn personal_issuance_is_bound_to_the_owner() {
        ensure_subject_is_installation_owner(
            ApplicationOwnershipScope::User,
            Some("owner-1"),
            "owner-1",
        )
        .expect("the owner may receive the credential");

        let error = ensure_subject_is_installation_owner(
            ApplicationOwnershipScope::User,
            Some("owner-1"),
            "someone-else",
        )
        .expect_err("a personal release must not credential another subject");
        assert!(error.contains("owner-1"), "{error}");

        assert!(
            ensure_subject_is_installation_owner(ApplicationOwnershipScope::User, None, "owner-1")
                .is_err()
        );
        // Tenant and organization releases are not subject-bound.
        ensure_subject_is_installation_owner(ApplicationOwnershipScope::Tenant, None, "anyone")
            .expect("tenant release");
    }

    #[test]
    fn a_user_id_claim_must_be_a_positive_decimal_snowflake() {
        for accepted in ["1", "900001", " 4000382910274560001 "] {
            assert!(is_valid_user_id_claim(accepted), "{accepted:?} should be legal");
        }
        for rejected in [
            "", " ", "0", "00", "-1", "+1", "1.0", "1e3", "abc", "iamu_abc", "user_1",
            "1 2", "99999999999999999999999999",
        ] {
            assert!(
                !is_valid_user_id_claim(rejected),
                "{rejected:?} must not name an IAM user"
            );
        }
    }

    #[test]
    fn a_public_token_must_carry_the_personal_installation_owner() {
        let owner = ensure_public_token_subject_is_installation_owner(
            "install-1",
            Some("900001"),
            Some("900001"),
        )
        .expect("the owner's own credential is accepted");
        assert_eq!(owner, "900001");

        let absent = ensure_public_token_subject_is_installation_owner(
            "install-1",
            Some("900001"),
            None,
        )
        .expect_err("a public token without a subject claim must fail closed");
        assert!(absent.contains("install-1"), "{absent}");
        assert!(absent.contains("user_id"), "{absent}");
        assert!(absent.contains("900001"), "{absent}");

        let wrong = ensure_public_token_subject_is_installation_owner(
            "install-1",
            Some("900001"),
            Some("900002"),
        )
        .expect_err("another subject must not receive the personal credential");
        assert!(wrong.contains("install-1"), "{wrong}");
        assert!(wrong.contains("900002"), "{wrong}");
        assert!(wrong.contains("900001"), "{wrong}");

        let illegal = ensure_public_token_subject_is_installation_owner(
            "install-1",
            Some("900001"),
            Some("owner-1"),
        )
        .expect_err("an opaque claim is not a subject id");
        assert!(illegal.contains("user_id"), "{illegal}");
        assert!(illegal.contains("900001"), "{illegal}");

        let tenant_sentinel = ensure_public_token_subject_is_installation_owner(
            "install-1",
            Some("900001"),
            Some("0"),
        )
        .expect_err("the tenant sentinel never names a personal owner");
        assert!(tenant_sentinel.contains("user_id"), "{tenant_sentinel}");

        let unowned = ensure_public_token_subject_is_installation_owner(
            "install-1",
            None,
            Some("900001"),
        )
        .expect_err("a personal installation without an owner cannot bind a token");
        assert!(unowned.contains("install-1"), "{unowned}");
        assert!(unowned.contains("owner_user_id"), "{unowned}");
    }
}
