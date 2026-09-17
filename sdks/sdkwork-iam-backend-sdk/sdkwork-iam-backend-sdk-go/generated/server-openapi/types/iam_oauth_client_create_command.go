package types

// Tenant-scoped OAuth provider client registration command.
type IamOauthClientCreateCommand struct {
	IntegrationId string `json:"integrationId"`
	ProviderCode string `json:"providerCode"`
	ClientCode string `json:"clientCode"`
	DisplayName string `json:"displayName"`
	ProviderClientId string `json:"providerClientId"`
	ProviderTenantId string `json:"providerTenantId"`
}
