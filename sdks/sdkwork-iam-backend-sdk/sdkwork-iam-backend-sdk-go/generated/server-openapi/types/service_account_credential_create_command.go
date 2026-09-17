package types

// Create a one-time-returned workload credential bound to a service account and tenant application.
type ServiceAccountCredentialCreateCommand struct {
	TenantApplicationId string `json:"tenantApplicationId"`
	ExpiresAt string `json:"expiresAt"`
}
