use serde::{Deserialize, Serialize};

/// Provision a tenant installation from the deploy application it serves plus explicit attributes, through an authenticated operator workflow. Application templates are retired, so no template reference is accepted.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct IamTenantApplicationManagementProvisionCommand {
    #[serde(rename = "organizationId")]
    pub organization_id: String,

    #[serde(rename = "instanceKey")]
    pub instance_key: String,

    #[serde(rename = "displayName")]
    pub display_name: String,

    pub environment: String,

    /// Product-semantic application type (api | h5 | pc | flutter | other). Required: application templates are retired, so nothing else can supply it.
    #[serde(rename = "applicationType")]
    pub application_type: String,

    #[serde(rename = "primaryDomain")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub primary_domain: Option<String>,

    /// Access permissions granted to the installation. An empty array or null is a valid explicit choice: the installation grants no API scope.
    #[serde(rename = "accessPermissions")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub access_permissions: Option<Vec<String>>,

    /// Explicit runtime config, including `oauth.relyingParty`; absent registers no OAuth relying party.
    #[serde(rename = "runtimeConfig")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub runtime_config: Option<std::collections::HashMap<String, serde_json::Value>>,

    /// Deploy application this installation serves. It is the identity every access token carries, and the one-to-one relation is enforced by the database.
    #[serde(rename = "deployApplicationId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deploy_application_id: Option<String>,

    /// Replay-safe key for the cross-module provisioning call.
    #[serde(rename = "provisioningIdempotencyKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provisioning_idempotency_key: Option<String>,
}
