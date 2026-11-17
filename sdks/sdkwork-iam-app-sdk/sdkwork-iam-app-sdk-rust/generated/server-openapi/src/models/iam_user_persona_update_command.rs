use serde::{Deserialize, Serialize};

/// Full persona replacement; omitted interests mean an empty list.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct IamUserPersonaUpdateCommand {
    /// Chosen persona role code, or null to clear it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,

    /// Followed interest codes; must be active catalog codes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub interests: Option<Vec<String>>,

    /// Whether the first-run prompt was answered.
    #[serde(rename = "promptDismissed")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_dismissed: Option<bool>,
}
