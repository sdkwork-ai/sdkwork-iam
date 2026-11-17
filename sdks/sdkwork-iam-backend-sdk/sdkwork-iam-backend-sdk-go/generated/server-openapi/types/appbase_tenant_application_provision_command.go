package types

// Provision a tenant installation from the deploy application it serves plus explicit attributes. Application templates are retired, so no template reference is accepted.
type AppbaseTenantApplicationProvisionCommand struct {
	AuthToken string `json:"authToken"`
	Username string `json:"username"`
	Email string `json:"email"`
	Phone string `json:"phone"`
	Password string `json:"password"`
	TenantId string `json:"tenantId"`
	OrganizationId string `json:"organizationId"`
	InstanceKey string `json:"instanceKey"`
	DisplayName string `json:"displayName"`
	Environment string `json:"environment"`
	ApplicationType string `json:"applicationType"`
	PrimaryDomain string `json:"primaryDomain"`
	AccessPermissions []string `json:"accessPermissions"`
	RuntimeConfig map[string]interface{} `json:"runtimeConfig"`
	DeployApplicationId string `json:"deployApplicationId"`
	ProvisioningIdempotencyKey string `json:"provisioningIdempotencyKey"`
}
