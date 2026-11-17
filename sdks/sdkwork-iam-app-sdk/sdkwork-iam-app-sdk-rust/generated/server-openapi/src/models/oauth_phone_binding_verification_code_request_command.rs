use serde::{Deserialize, Serialize};

/// Requests the ownership-proof SMS code for a pending OAuth account association. Unlike `auth/verification_code_requests` the caller is not yet authenticated; the pending-binding ticket is the authorization.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OauthPhoneBindingVerificationCodeRequestCommand {
    /// One-time `continuationToken` returned by the `OAUTH_PHONE_BINDING_REQUIRED` challenge.
    #[serde(rename = "continuationToken")]
    pub continuation_token: String,

    /// Phone number to prove ownership of.
    pub phone: String,
}
