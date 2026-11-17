use serde::{Deserialize, Serialize};

/// Idempotent registration of one environment. The path environmentKey is authoritative; an explicit body value must match it. Omitted status keeps the stored status on update and defaults to pending on insert.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct IamInstallationEnvironmentUpsertCommand {
    #[serde(rename = "environmentKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub environment_key: Option<String>,

    /// Blank or null clears the domain; a domain is unique per tenant.
    #[serde(rename = "primaryDomain")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub primary_domain: Option<String>,

    #[serde(rename = "domainConfig")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub domain_config: Option<std::collections::HashMap<String, serde_json::Value>>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}
