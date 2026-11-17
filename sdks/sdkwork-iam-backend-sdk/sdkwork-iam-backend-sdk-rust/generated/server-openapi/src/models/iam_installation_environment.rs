use serde::{Deserialize, Serialize};

/// One lifecycle environment registered for an installation.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct IamInstallationEnvironment {
    #[serde(rename = "environmentId")]
    pub environment_id: String,

    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    #[serde(rename = "organizationId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub organization_id: Option<String>,

    /// Installation (tenant application) id.
    #[serde(rename = "installationId")]
    pub installation_id: String,

    /// Environment key, unique per installation.
    #[serde(rename = "environmentKey")]
    pub environment_key: String,

    /// Public domain of this environment. Null when the environment has no domain; null is the only value allowed to repeat inside one tenant.
    #[serde(rename = "primaryDomain")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub primary_domain: Option<String>,

    /// Environment-specific domain configuration document.
    #[serde(rename = "domainConfig")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub domain_config: Option<std::collections::HashMap<String, serde_json::Value>>,

    pub status: String,

    /// Creation timestamp.
    #[serde(rename = "createdAt")]
    pub created_at: String,

    /// Last write timestamp.
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}
