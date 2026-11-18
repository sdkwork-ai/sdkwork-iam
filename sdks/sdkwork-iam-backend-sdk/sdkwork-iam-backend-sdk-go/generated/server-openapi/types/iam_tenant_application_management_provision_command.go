package types

// Provision a tenant installation from the deploy application it serves plus explicit attributes, through an authenticated operator workflow. Application templates are retired, so no template reference is accepted.
type IamTenantApplicationManagementProvisionCommand struct {
	OrganizationId string `json:"organizationId"`
	InstanceKey string `json:"instanceKey"`
	DisplayName string `json:"displayName"`
	Environment string `json:"environment"`
	ApplicationType string `json:"applicationType"`
	PrimaryDomain string `json:"primaryDomain"`
	AccessPermissions []string `json:"accessPermissions"`
	RuntimeConfig map[string]interface{} `json:"runtimeConfig"`
	DeployApplicationId string `json:"deployApplicationId"`
	OwnershipScope string `json:"ownershipScope"`
	OwnerUserId string `json:"ownerUserId"`
	ProvisioningIdempotencyKey string `json:"provisioningIdempotencyKey"`
}
