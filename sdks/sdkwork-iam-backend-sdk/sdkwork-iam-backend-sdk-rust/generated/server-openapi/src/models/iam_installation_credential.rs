use serde::{Deserialize, Serialize};

/// OAuth client metadata of one installation environment. The secret is write-only and is returned only by create/rotate.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct IamInstallationCredential {
    #[serde(rename = "credentialId")]
    pub credential_id: String,

    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    #[serde(rename = "installationEnvironmentId")]
    pub installation_environment_id: String,

    #[serde(rename = "environmentKey")]
    pub environment_key: String,

    /// OAuth client id; globally unique across every credential row.
    #[serde(rename = "clientId")]
    pub client_id: String,

    #[serde(rename = "redirectUris")]
    pub redirect_uris: Vec<String>,

    #[serde(rename = "grantedScopes")]
    pub granted_scopes: Vec<String>,

    pub status: String,

    /// When this credential was replaced by a rotation, or null.
    #[serde(rename = "rotatedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rotated_at: Option<String>,

    /// When this credential was revoked, or null.
    #[serde(rename = "retiredAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub retired_at: Option<String>,

    /// Creation timestamp.
    #[serde(rename = "createdAt")]
    pub created_at: String,

    /// Last write timestamp.
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}
