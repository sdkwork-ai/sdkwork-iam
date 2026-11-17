use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct SessionsCurrentLogoutRequest {
    /// Refresh token of the session to revoke. Accepted without an access token so logout still revokes the server session after the access token expired.
    #[serde(rename = "refreshToken")]
    pub refresh_token: String,
}
