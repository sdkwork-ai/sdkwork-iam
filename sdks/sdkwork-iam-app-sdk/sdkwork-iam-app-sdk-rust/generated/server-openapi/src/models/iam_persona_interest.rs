use serde::{Deserialize, Serialize};

/// One selectable interest direction.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct IamPersonaInterest {
    pub code: String,

    #[serde(rename = "sortOrder")]
    pub sort_order: i64,

    /// Locale to display-text map, for example {"zh-CN":"学员","en-US":"Learner"}.
    pub labels: std::collections::HashMap<String, String>,
}
