use serde::{Deserialize, Serialize};

/// Rotates the active credential: the replacement becomes active with a new client id and secret, and the predecessor is kept as rotated history.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct IamInstallationCredentialRotateCommand {
    /// Explicit replacement client id. Omitted generates one.
    #[serde(rename = "clientId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_id: Option<String>,
}
