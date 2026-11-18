package types

// One lifecycle environment registered for an installation.
type IamInstallationEnvironment struct {
	EnvironmentId string `json:"environmentId"`
	TenantId string `json:"tenantId"`
	OrganizationId string `json:"organizationId"`
	InstallationId string `json:"installationId"`
	EnvironmentKey string `json:"environmentKey"`
	PrimaryDomain string `json:"primaryDomain"`
	DomainConfig map[string]interface{} `json:"domainConfig"`
	Status string `json:"status"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}
