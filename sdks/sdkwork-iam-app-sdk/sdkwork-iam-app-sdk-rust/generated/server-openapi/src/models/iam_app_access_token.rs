use serde::{Deserialize, Serialize};

/// Signed application access credential. It is a session-class credential: it expires after one hour and can be revoked like any other IAM session.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct IamAppAccessToken {
    /// Signed access token; send it as the Access-Token header.
    #[serde(rename = "accessToken")]
    pub access_token: String,

    /// Signed auth token; send it as the Authorization: Bearer header.
    #[serde(rename = "authToken")]
    pub auth_token: String,

    /// Credential expiry instant.
    #[serde(rename = "expiresAt")]
    pub expires_at: String,

    /// Deploy application anchor carried as the token app_id/aud.
    #[serde(rename = "appId")]
    pub app_id: String,

    /// Installation the credential was issued for.
    #[serde(rename = "installationId")]
    pub installation_id: String,

    /// Organization claim of the installation; 0 for tenant- and user-released installations.
    #[serde(rename = "organizationId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub organization_id: Option<String>,

    /// Release scope of the installation.
    #[serde(rename = "ownershipScope")]
    pub ownership_scope: String,

    /// Persisted session that can be revoked.
    #[serde(rename = "sessionId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,

    /// Installation lifecycle environment the credential was gated on (development, production, ...).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub environment: Option<String>,
}
