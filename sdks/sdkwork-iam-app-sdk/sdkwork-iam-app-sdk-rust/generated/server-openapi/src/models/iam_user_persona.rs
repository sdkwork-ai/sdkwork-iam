use serde::{Deserialize, Serialize};

/// The caller persona. role is null until a role is chosen.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct IamUserPersona {
    /// Chosen persona role code, or null while unchosen.
    pub role: String,

    /// Followed interest codes in catalog order.
    pub interests: Vec<String>,

    /// Whether the first-run prompt was answered without choosing a role.
    #[serde(rename = "promptDismissed")]
    pub prompt_dismissed: bool,

    /// True once a role is chosen.
    #[serde(rename = "hasSelection")]
    pub has_selection: bool,

    /// Catalog version the stored selection was validated against.
    #[serde(rename = "catalogVersion")]
    pub catalog_version: String,

    /// Last write time, or null before the first write.
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}
