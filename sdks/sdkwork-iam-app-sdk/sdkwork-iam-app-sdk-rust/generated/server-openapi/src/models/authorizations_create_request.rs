use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AuthorizationsCreateRequest {
    #[serde(rename = "clientId")]
    pub client_id: String,

    #[serde(rename = "responseType")]
    pub response_type: String,

    #[serde(rename = "redirectUri")]
    pub redirect_uri: String,

    pub scope: String,

    pub state: String,

    #[serde(rename = "codeChallenge")]
    pub code_challenge: String,

    #[serde(rename = "codeChallengeMethod")]
    pub code_challenge_method: String,

    #[serde(rename = "tenantId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tenant_id: Option<String>,
}
