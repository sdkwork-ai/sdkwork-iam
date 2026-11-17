use serde::{Deserialize, Serialize};

/// One member of an organization roster as IAM publishes it.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct IamOrganizationMember {
    /// IAM user id.
    #[serde(rename = "userId")]
    pub user_id: String,

    /// Organization membership row id that binds the user to the organization.
    #[serde(rename = "membershipId")]
    pub membership_id: String,

    /// Display name of the member.
    #[serde(rename = "displayName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,

    /// Login name of the member.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,

    /// Contact email. Omitted unless the caller holds an owner or admin membership in the same organization.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,

    #[serde(rename = "membershipKind")]
    pub membership_kind: String,

    /// Membership status; an active roster only reports active rows.
    pub status: String,

    /// Whether this membership is the member primary organization membership.
    #[serde(rename = "isPrimary")]
    pub is_primary: bool,
}
