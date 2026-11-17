use serde::{Deserialize, Serialize};

/// Creates the OAuth client of one environment. Omitted clientId is generated.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct IamInstallationCredentialCreateCommand {
    /// Registered environment of the installation, by key or canonical alias.
    #[serde(rename = "environmentKey")]
    pub environment_key: String,

    /// Explicit client id. Omitted generates one; an id already in use conflicts.
    #[serde(rename = "clientId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_id: Option<String>,

    #[serde(rename = "redirectUris")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub redirect_uris: Option<Vec<String>>,

    #[serde(rename = "grantedScopes")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub granted_scopes: Option<Vec<String>>,
}
