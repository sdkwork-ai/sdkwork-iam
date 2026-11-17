use serde::{Deserialize, Serialize};

/// One-time WeChat Mini Program login-code exchange command.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct WechatMiniProgramSessionCreateCommand {
    /// One-time code returned by wx.login().
    #[serde(rename = "jsCode")]
    pub js_code: String,

    /// One-time code returned by the mini program getPhoneNumber grant. WeChat verified the subscriber SIM for this code, so the resulting phone may associate the WeChat identity with an existing account (subject to the tenant OAuth phone-association policy). Omit it to require the phone-binding step instead.
    #[serde(rename = "phoneCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub phone_code: Option<String>,

    #[serde(rename = "providerCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_code: Option<String>,

    /// Registered IAM OAuth mini-program surface code.
    #[serde(rename = "surfaceCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub surface_code: Option<String>,

    /// Opaque client device identity. Sessions are replaced per application per device, so the same device signing in again revokes only its own previous session instead of every session of the application. Carried forward across refresh and the phone-binding step.
    #[serde(rename = "deviceId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub device_id: Option<String>,
}
