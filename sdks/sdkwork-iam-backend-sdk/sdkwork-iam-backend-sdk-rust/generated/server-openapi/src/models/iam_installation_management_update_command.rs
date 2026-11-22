use serde::{Deserialize, Serialize};

/// Update operator-managed tenant application domain, access permissions, and deploy anchor.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct IamInstallationManagementUpdateCommand {
    #[serde(rename = "primaryDomain")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub primary_domain: Option<String>,

    #[serde(rename = "accessPermissions")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub access_permissions: Option<Vec<String>>,

    /// Deploy application the installation serves. An update may only fill a MISSING anchor: this is the repair for an installation provisioned before the deployment link existed, and it makes the access-token subject and the relying party resolvable. Re-pointing an installation that already serves a deploy application is a deploy identity migration, not an update, and is answered with 409.
    #[serde(rename = "deployApplicationId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deploy_application_id: Option<String>,
}
