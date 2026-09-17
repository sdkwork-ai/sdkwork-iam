package types

// Provision a registered application template for a tenant through an authenticated operator workflow.
type IamTenantApplicationManagementProvisionCommand struct {
	OrganizationId string `json:"organizationId"`
	TemplateId string `json:"templateId"`
	AppKey string `json:"appKey"`
	InstanceKey string `json:"instanceKey"`
	DisplayName string `json:"displayName"`
	Environment string `json:"environment"`
	ApplicationType string `json:"applicationType"`
	PrimaryDomain string `json:"primaryDomain"`
	AccessPermissions []string `json:"accessPermissions"`
}
