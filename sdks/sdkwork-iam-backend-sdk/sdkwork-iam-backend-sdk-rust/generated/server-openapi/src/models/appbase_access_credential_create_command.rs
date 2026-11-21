use serde::{Deserialize, Serialize};

/// Issue a delegated access credential for an enabled tenant application.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AppbaseAccessCredentialCreateCommand {
    /// Super-admin auth token used for bootstrap body authentication.
    #[serde(rename = "authToken")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auth_token: Option<String>,

    /// Super-admin username credential for bootstrap body authentication.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,

    /// Super-admin email credential for bootstrap body authentication.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,

    /// Super-admin phone credential for bootstrap body authentication.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,

    /// Super-admin password credential for bootstrap body authentication.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,

    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    #[serde(rename = "organizationId")]
    pub organization_id: String,

    #[serde(rename = "installationId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub installation_id: Option<String>,

    #[serde(rename = "appId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub app_id: Option<String>,

    #[serde(rename = "instanceKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instance_key: Option<String>,

    /// Release scope the caller declares. It is checked against the installation, never used to select one: a value the installation was not released at fails closed (`APPLICATION_IDENTITY_SPEC.md` section 4.1 rule 3). Omit it to inherit the installation scope.
    #[serde(rename = "ownershipScope")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ownership_scope: Option<String>,
}
