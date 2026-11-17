use serde::{Deserialize, Serialize};

/// The create/rotate result: credential metadata plus the one-time plaintext secret. No read operation returns this shape.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct IamInstallationCredentialWithSecret {
    #[serde(rename = "credentialId")]
    pub credential_id: String,

    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    #[serde(rename = "installationEnvironmentId")]
    pub installation_environment_id: String,

    #[serde(rename = "environmentKey")]
    pub environment_key: String,

    #[serde(rename = "clientId")]
    pub client_id: String,

    /// Plaintext OAuth client secret. Emitted exactly once by create/rotate and never on reads.
    #[serde(rename = "clientSecret")]
    pub client_secret: String,

    #[serde(rename = "redirectUris")]
    pub redirect_uris: Vec<String>,

    #[serde(rename = "grantedScopes")]
    pub granted_scopes: Vec<String>,

    pub status: String,

    #[serde(rename = "rotatedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rotated_at: Option<String>,

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
