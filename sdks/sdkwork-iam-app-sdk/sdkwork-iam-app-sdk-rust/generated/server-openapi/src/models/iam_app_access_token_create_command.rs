use serde::{Deserialize, Serialize};

/// Selectors for the application whose access credential is requested. Supply at least one; the tenant and the organization are derived from the authenticated session and the installation, never from this body.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct IamAppAccessTokenCreateCommand {
    /// Installation deploy application anchor (iam_application_installation.deploy_application_id). Preferred selector: it is the identity the deployment plane publishes.
    #[serde(rename = "appId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub app_id: Option<String>,

    /// IAM installation row id (tapp_...) of the caller's tenant.
    #[serde(rename = "installationId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub installation_id: Option<String>,

    /// Installation instance key of the caller's tenant.
    #[serde(rename = "instanceKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instance_key: Option<String>,

    /// Exact installation lifecycle to initialize. Omitted means the caller session environment when the installation registered it, otherwise the installation's only active environment. An operator can initialize a lifecycle that differs from its own session environment.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub environment: Option<String>,

    /// Release scope the caller declares. It is a declaration to be checked, never a selector: the installation decides the level. Omit it to inherit the installation scope (a tenant-level application therefore yields a tenant-level credential); an explicit value that disagrees with the installation is refused.
    #[serde(rename = "ownershipScope")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ownership_scope: Option<String>,
}
