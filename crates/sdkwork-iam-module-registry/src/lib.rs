pub mod bootstrap_subject;
pub mod discover;
pub mod manifest;
pub mod materialize;
pub mod merge;
pub mod validate;

pub use bootstrap_subject::{
    DEFAULT_BOOTSTRAP_ADMIN_DISPLAY_NAME, DEFAULT_BOOTSTRAP_ADMIN_EMAIL,
    DEFAULT_BOOTSTRAP_ADMIN_ORGANIZATION_CODE, DEFAULT_BOOTSTRAP_ADMIN_ORGANIZATION_ID,
    DEFAULT_BOOTSTRAP_ADMIN_ORGANIZATION_MEMBERSHIP_ID, DEFAULT_BOOTSTRAP_ADMIN_ORGANIZATION_NAME,
    DEFAULT_BOOTSTRAP_ADMIN_ORGANIZATION_PATH,
    DEFAULT_BOOTSTRAP_ADMIN_ORGANIZATION_ROOT_CLOSURE_ID,
    DEFAULT_BOOTSTRAP_ADMIN_ORGANIZATION_SELF_CLOSURE_ID, DEFAULT_BOOTSTRAP_ADMIN_USERNAME,
    DEFAULT_BOOTSTRAP_ADMIN_USER_ID, DEFAULT_BOOTSTRAP_MANAGER_DISPLAY_NAME,
    DEFAULT_BOOTSTRAP_MANAGER_EMAIL, DEFAULT_BOOTSTRAP_MANAGER_ORGANIZATION_MEMBERSHIP_ID,
    DEFAULT_BOOTSTRAP_MANAGER_USERNAME, DEFAULT_BOOTSTRAP_MANAGER_USER_ID,
    DEFAULT_IAM_ORGANIZATION_CODE, DEFAULT_IAM_ORGANIZATION_DATA_BOUNDARY_KIND,
    DEFAULT_IAM_ORGANIZATION_ID, DEFAULT_IAM_ORGANIZATION_KIND, DEFAULT_IAM_ORGANIZATION_NAME,
    DEFAULT_IAM_ORGANIZATION_PATH, DEFAULT_IAM_ORGANIZATION_SQL_ID,
    DEFAULT_IAM_ORGANIZATION_TENANT_BOUNDARY_KIND, DEFAULT_IAM_ORGANIZATION_VERIFICATION_STATUS,
    DEFAULT_IAM_TENANT_CODE, DEFAULT_IAM_TENANT_ID, DEFAULT_IAM_TENANT_NAME,
    DEFAULT_IAM_TENANT_SQL_ID,
};
pub use discover::{
    discover_modules, discover_modules_with_manifests, load_registry_config, merge_discovered,
    DiscoveredModule,
};
pub use manifest::IamModuleManifest;
pub use materialize::{
    ensure_department_closure_postgres, materialize_postgres_catalog,
    materialize_postgres_catalog_with_manifests, upsert_tenant_roles_postgres, MaterializeReport,
};
#[cfg(feature = "sqlite")]
pub use materialize::{
    materialize_sqlite_catalog, materialize_sqlite_catalog_with_manifests,
    upsert_tenant_roles_sqlite,
};
pub use merge::MergedIamCatalog;
pub use validate::validate_catalog;

#[cfg(test)]
mod federation_tests {
    use std::path::PathBuf;

    use crate::discover::{discover_registry_modules, load_registry_config, merge_discovered};
    use crate::validate::validate_catalog;

    fn app_root() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
    }

    #[test]
    fn discovers_and_validates_bundled_modules() {
        let root = app_root();
        let config = load_registry_config(&root).expect("registry config");
        let modules = discover_registry_modules(&root, &config).expect("discover");
        validate_catalog(&modules).expect("validate");
        let merged = merge_discovered(&modules);
        assert!(merged.permissions.len() >= 140);
        assert!(merged.role_patterns.contains_key("platform_super_admin"));
        assert!(merged.permissions.contains_key("ai.agents.use"));
        assert!(merged
            .role_patterns
            .get("app_user")
            .is_some_and(|patterns| patterns.contains("ai.agents.use")));
    }

    /// AUTHORIZATION_STATE_SPEC 3.8: a shipped module manifest is materialized
    /// without editing a hand-maintained enable list, so a new module reaches
    /// existing sessions through the authorization epoch. Optional modules stay
    /// opt-in.
    #[test]
    fn shipped_modules_auto_enable_unless_optional() {
        use crate::discover::enabled_module_ids;
        use crate::manifest::IamRegistryConfig;

        let root = std::env::temp_dir().join(format!(
            "sdkwork-iam-registry-auto-discovery-{}",
            std::process::id()
        ));
        let modules = root.join("iam/modules");
        for module_id in ["alpha", "beta", "gamma"] {
            std::fs::create_dir_all(modules.join(module_id)).expect("module dir");
            std::fs::write(
                modules.join(module_id).join("iam.module.manifest.json"),
                "{}",
            )
            .expect("manifest placeholder");
        }
        let config = IamRegistryConfig {
            schema_version: 1,
            kind: "sdkwork.iam.registry.config".to_string(),
            default_profile: "operational".to_string(),
            enabled_modules: Vec::new(),
            optional_modules: vec!["gamma".to_string()],
        };
        let ids = enabled_module_ids(&root, &config).expect("enabled ids");
        assert_eq!(ids, vec!["alpha".to_string(), "beta".to_string()]);

        let opt_in = IamRegistryConfig {
            enabled_modules: vec!["gamma".to_string()],
            ..config
        };
        let ids = enabled_module_ids(&root, &opt_in).expect("enabled ids");
        assert!(ids.contains(&"gamma".to_string()), "explicit opt-in wins");

        std::fs::remove_dir_all(&root).expect("remove temp registry root");
    }
}
