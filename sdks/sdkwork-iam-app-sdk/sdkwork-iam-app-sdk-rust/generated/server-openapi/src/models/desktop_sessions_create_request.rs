use serde::{Deserialize, Serialize};

/// Native-app exchange of a deep-link authorization code for a dual-token session.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DesktopSessionsCreateRequest {
    #[serde(rename = "clientId")]
    pub client_id: String,

    #[serde(rename = "authorizationCode")]
    pub authorization_code: String,

    #[serde(rename = "codeVerifier")]
    pub code_verifier: String,

    /// Registered native redirect URI; the code must have been issued for a desktop surface (custom scheme or loopback).
    #[serde(rename = "redirectUri")]
    pub redirect_uri: String,

    #[serde(rename = "clientSecret")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_secret: Option<String>,

    /// Stable opaque per-install device identity. A new login replaces only this device's previous session for the same application.
    #[serde(rename = "deviceId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub device_id: Option<String>,
}
