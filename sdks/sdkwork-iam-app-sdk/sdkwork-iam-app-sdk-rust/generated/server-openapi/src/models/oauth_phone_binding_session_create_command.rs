use serde::{Deserialize, Serialize};

/// Completes a pending OAuth account association after the person proved ownership of the phone. Answered with the standard session payload, or with the `LOGIN_CONTEXT_SELECTION` challenge for an account that belongs to several organizations.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OauthPhoneBindingSessionCreateCommand {
    /// One-time `continuationToken` returned by the `OAUTH_PHONE_BINDING_REQUIRED` challenge of an OAuth, mini-program, or official-account session exchange.
    #[serde(rename = "continuationToken")]
    pub continuation_token: String,

    /// Phone number that owns the target IAM account. When no account owns it yet, a new account is registered for the OAuth identity if the tenant allows OAuth auto-registration.
    pub phone: String,

    /// One-time SMS verification code requested for this phone.
    #[serde(rename = "verificationCode")]
    pub verification_code: String,

    /// Originating client surface, recorded with the association.
    #[serde(rename = "surfaceCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub surface_code: Option<String>,

    /// Opaque client device identity kept from the challenge. Omit it only when the original request did not send one; the session then binds no device slot.
    #[serde(rename = "deviceId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub device_id: Option<String>,
}
