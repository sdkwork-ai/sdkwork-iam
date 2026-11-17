use serde::{Deserialize, Serialize};

/// Session creation command for credential login and external user-center session exchange.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AppbaseSessionCreateCommand {
    /// Credential grant to run. Omitted `grantType` means the password grant, which is the body the platform hosted login posts.
    #[serde(rename = "grantType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub grant_type: Option<String>,

    /// Shared account identifier understood by hosted-login clients; `email`/`username`/`phone` remain the authoritative identity fields.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub account: Option<String>,

    /// Email credential used by standard password login.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,

    /// Username credential used by standard password login.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,

    /// Phone credential used by standard password login.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,

    /// Write-only password credential used by standard password login.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,

    /// Opaque upstream credential used only by an external user-center session exchange.
    #[serde(rename = "externalToken")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub external_token: Option<String>,

    /// External authority provider key used to select the configured bridge.
    #[serde(rename = "providerKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_key: Option<String>,

    /// Verified tenant id supplied by an external user-center session exchange after upstream identity validation.
    #[serde(rename = "tenantId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tenant_id: Option<String>,

    /// Verified organization id supplied by an external user-center session exchange when the upstream identity resolved an organization scope.
    #[serde(rename = "organizationId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub organization_id: Option<String>,

    /// Opaque client device identity. Sessions are replaced per application per device; omitting it keeps the legacy single-slot behaviour where only sessions without a device are revoked.
    #[serde(rename = "deviceId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub device_id: Option<String>,
}
