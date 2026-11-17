use serde::{Deserialize, Serialize};

/// One selectable persona role.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct IamPersonaRole {
    pub code: String,

    /// Authorization role code this persona maps onto, when one exists.
    #[serde(rename = "iamRoleCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub iam_role_code: Option<String>,

    #[serde(rename = "sortOrder")]
    pub sort_order: i64,

    /// Locale to display-text map, for example {"zh-CN":"学员","en-US":"Learner"}.
    pub labels: std::collections::HashMap<String, String>,

    /// Locale to display-text map, for example {"zh-CN":"学员","en-US":"Learner"}.
    pub descriptions: std::collections::HashMap<String, String>,
}
