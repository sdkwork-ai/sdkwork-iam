//! Standard role catalog and permission matrix seeds for `iam_role` / `iam_role_permission`.
//! Canonical grant patterns live in `iam/modules/iam-kernel/iam.module.manifest.json`.
//! Runtime role expansion uses `sdkwork-iam-module-registry::upsert_tenant_roles_postgres`.

use sdkwork_iam_context_service::{
    expand_permission_patterns, APP_USER_ROLE_CODE, IAM_STANDARD_ROLE_DEFINITIONS,
    ORG_ADMIN_ROLE_CODE, ORG_ASSISTANT_ROLE_CODE, ORG_AUDITOR_ROLE_CODE, ORG_FINANCE_ROLE_CODE,
    ORG_OPERATIONS_ROLE_CODE, PLATFORM_SUPER_ADMIN_ROLE_CODE, PLATFORM_SYSTEM_ADMIN_ROLE_CODE,
};

use crate::permission_catalog::IAM_STANDARD_PERMISSION_SEEDS;

#[derive(Debug, Clone, Copy)]
pub struct StandardRoleGrant {
    pub role_code: &'static str,
    pub patterns: &'static [&'static str],
}

pub const IAM_STANDARD_ROLE_GRANTS: &[StandardRoleGrant] = &[
    StandardRoleGrant {
        role_code: APP_USER_ROLE_CODE,
        patterns: &[
            "iam:self",
            "iam.profile.read",
            "iam.profile.update",
            "iam.sessions.read",
            "iam.organizations.read",
            "iam.memberships.read",
            "iam.departments.read",
            "iam.assignments.read",
            // Self-service cloud accounts (§scope-visibility tier `user`): the
            // `app_user` role may manage *its own* provider accounts and
            // credentials only. Deliberately absent:
            // - `iam.provider_accounts.manage_shared` → no tenant/organization
            //   shared account is visible or writable;
            // - `iam.provider_accounts.resolve` → consumer/service-only right.
            "iam.provider_accounts.read",
            "iam.provider_accounts.create",
            "iam.provider_accounts.update",
            "iam.provider_accounts.delete",
            "iam.provider_credentials.read",
            "iam.provider_credentials.create",
            "iam.provider_credentials.revoke",
            "iam.provider_credentials.delete",
            "apps.app_center.read",
            "courses.catalog.read",
            "courses.content.read",
            "commerce.catalog.read",
            "commerce.orders.read",
            "commerce.memberships.read",
            "drive.spaces.read",
            "drive.nodes.read",
            "messaging.requests.read",
            "ai.agents.read",
            "ai.skills.read",
            "knowledge.spaces.read",
            "knowledge.spaces.write",
            "knowledge.documents.read",
            "knowledge.documents.write",
            "knowledge.ingests.read",
            "knowledge.ingests.write",
            "knowledge.imports.write",
            "knowledge.okf.read",
            "knowledge.okf.write",
            "mail.accounts.read",
            "mail.folders.read",
            "mail.threads.read",
            "mail.messages.read",
            "mail.messages.write",
            "mail.verification.write",
            "mail.transactional.write",
        ],
    },
    StandardRoleGrant {
        role_code: ORG_ADMIN_ROLE_CODE,
        patterns: &[
            "iam:self",
            "iam.*",
            "iam.oauth.*",
            "commerce.*",
            "courses.*",
            "ai.*",
            "messaging.*",
            "integrations.*",
            "drive.*",
            "storage.*",
            "ops.monitor.read",
            "system.site.read",
            "system.settings.read",
            "system.announcements.read",
        ],
    },
    StandardRoleGrant {
        role_code: ORG_ASSISTANT_ROLE_CODE,
        patterns: &[
            "iam.users.read",
            "iam.memberships.read",
            "iam.departments.read",
            "commerce.catalog.read",
            "commerce.catalog.manage",
            "commerce.orders.read",
            "commerce.orders.manage",
            "courses.catalog.read",
            "courses.content.read",
            "courses.content.update",
            "messaging.templates.read",
            "messaging.requests.manage",
        ],
    },
    StandardRoleGrant {
        role_code: ORG_AUDITOR_ROLE_CODE,
        patterns: &[
            "*.read",
            "*.approve",
            "*.reject",
            "iam.audit_events.read",
            "iam.security_events.read",
            "system.audit.read",
        ],
    },
    StandardRoleGrant {
        role_code: ORG_FINANCE_ROLE_CODE,
        patterns: &[
            "finance.*",
            "commerce.orders.read",
            "commerce.payments.*",
            "commerce.revenue.read",
            "iam.users.read",
        ],
    },
    StandardRoleGrant {
        role_code: ORG_OPERATIONS_ROLE_CODE,
        patterns: &[
            "commerce.*",
            "courses.*",
            "apps.app_center.*",
            "messaging.*",
            "integrations.*",
            "ai.*",
            "ops.monitor.read",
        ],
    },
    StandardRoleGrant {
        role_code: PLATFORM_SYSTEM_ADMIN_ROLE_CODE,
        patterns: &[
            "iam.*",
            "ops.*",
            "system.*",
            "iam.tenant_applications.provision",
            "iam.tenant_applications.update",
            "iam.tenant_applications.enable",
            "iam.access_credentials.create",
        ],
    },
    StandardRoleGrant {
        role_code: PLATFORM_SUPER_ADMIN_ROLE_CODE,
        patterns: &["*"],
    },
];

pub use sdkwork_iam_module_registry::materialize::{standard_role_id, standard_role_permission_id};

pub fn catalog_permission_codes() -> Vec<&'static str> {
    IAM_STANDARD_PERMISSION_SEEDS
        .iter()
        .map(|seed| seed.code)
        .collect()
}

pub fn expanded_role_permission_codes(role_code: &str) -> Vec<String> {
    let catalog = catalog_permission_codes();
    let patterns = IAM_STANDARD_ROLE_GRANTS
        .iter()
        .find(|grant| grant.role_code == role_code)
        .map(|grant| grant.patterns)
        .unwrap_or(&[]);
    expand_permission_patterns(patterns, &catalog)
}

pub fn role_display_name(role_code: &str) -> &str {
    IAM_STANDARD_ROLE_DEFINITIONS
        .iter()
        .find(|definition| definition.code == role_code)
        .map(|definition| definition.name)
        .unwrap_or(role_code)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn super_admin_expands_full_catalog() {
        let expanded = expanded_role_permission_codes(PLATFORM_SUPER_ADMIN_ROLE_CODE);
        assert!(expanded.contains(&"*".to_string()));
        assert!(expanded.len() >= IAM_STANDARD_PERMISSION_SEEDS.len());
    }

    #[test]
    fn app_user_does_not_receive_iam_admin_permissions() {
        let expanded = expanded_role_permission_codes(APP_USER_ROLE_CODE);
        assert!(!expanded.iter().any(|code| code.starts_with("iam.users")));
    }

    #[test]
    fn app_user_receives_directory_browse_permissions() {
        let expanded = expanded_role_permission_codes(APP_USER_ROLE_CODE);
        for permission in [
            "iam.organizations.read",
            "iam.memberships.read",
            "iam.departments.read",
            "iam.assignments.read",
        ] {
            assert!(
                expanded.iter().any(|code| code == permission),
                "app_user should include {permission}, got: {expanded:?}"
            );
        }
    }

    #[test]
    fn app_user_receives_embedded_member_capabilities() {
        let expanded = expanded_role_permission_codes(APP_USER_ROLE_CODE);
        for permission in [
            "knowledge.spaces.read",
            "knowledge.spaces.write",
            "mail.messages.read",
            "mail.messages.write",
        ] {
            assert!(
                expanded.iter().any(|code| code == permission),
                "app_user should include {permission}, got: {expanded:?}"
            );
        }
    }

    /// Requirement: an ordinary user owns and may fully manage *their own*
    /// cloud (provider) accounts — but must never see a tenant-global or
    /// organization-scoped shared account, and must never be able to resolve
    /// (i.e. "use") one on behalf of the platform.
    #[test]
    fn app_user_owns_its_provider_accounts_but_not_shared_ones() {
        let expanded = expanded_role_permission_codes(APP_USER_ROLE_CODE);

        for permission in [
            "iam.provider_accounts.read",
            "iam.provider_accounts.create",
            "iam.provider_accounts.update",
            "iam.provider_accounts.delete",
            "iam.provider_credentials.read",
            "iam.provider_credentials.create",
            "iam.provider_credentials.revoke",
            "iam.provider_credentials.delete",
        ] {
            assert!(
                expanded.iter().any(|code| code == permission),
                "app_user should be able to self-manage via {permission}, got: {expanded:?}"
            );
        }

        for forbidden in [
            "iam.provider_accounts.manage_shared",
            "iam.provider_accounts.resolve",
        ] {
            assert!(
                !expanded.iter().any(|code| code == forbidden),
                "app_user must never hold {forbidden}, got: {expanded:?}"
            );
        }
    }

    /// The management right for *shared* accounts must stay out of every
    /// member-facing role and be reachable only through `iam.*` / `*` admins.
    #[test]
    fn shared_provider_account_management_is_admin_only() {
        for role in [
            APP_USER_ROLE_CODE,
            ORG_ASSISTANT_ROLE_CODE,
            ORG_AUDITOR_ROLE_CODE,
            ORG_FINANCE_ROLE_CODE,
            ORG_OPERATIONS_ROLE_CODE,
        ] {
            let expanded = expanded_role_permission_codes(role);
            assert!(
                !expanded
                    .iter()
                    .any(|code| code == "iam.provider_accounts.manage_shared"),
                "{role} must not hold iam.provider_accounts.manage_shared, got: {expanded:?}"
            );
        }

        for role in [
            ORG_ADMIN_ROLE_CODE,
            PLATFORM_SYSTEM_ADMIN_ROLE_CODE,
            PLATFORM_SUPER_ADMIN_ROLE_CODE,
        ] {
            let expanded = expanded_role_permission_codes(role);
            assert!(
                expanded
                    .iter()
                    .any(|code| code == "iam.provider_accounts.manage_shared"),
                "{role} is an admin role and should hold iam.provider_accounts.manage_shared, got: {expanded:?}"
            );
        }
    }

    /// Guards the `resolve` split: read-only wildcards must not imply the
    /// consumer right, otherwise a read-only role could name a shared account
    /// it cannot list.
    #[test]
    fn read_only_wildcards_do_not_imply_provider_account_resolution() {
        use sdkwork_iam_context_service::permission_matches;
        assert!(permission_matches("*.read", "iam.provider_accounts.read"));
        assert!(!permission_matches(
            "*.read",
            "iam.provider_accounts.resolve"
        ));
        assert!(!permission_matches(
            "*.read",
            "iam.provider_accounts.manage_shared"
        ));
        // Admins reach both through the `iam.*` / `*` prefixes.
        assert!(permission_matches("iam.*", "iam.provider_accounts.resolve"));
        assert!(permission_matches(
            "iam.*",
            "iam.provider_accounts.manage_shared"
        ));
    }
}
