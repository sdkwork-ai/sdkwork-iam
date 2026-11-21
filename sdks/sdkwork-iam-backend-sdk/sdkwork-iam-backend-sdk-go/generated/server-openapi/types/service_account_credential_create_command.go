package types

// Create a one-time-returned workload credential bound to a service account and tenant application.
type ServiceAccountCredentialCreateCommand struct {
	InstallationId string `json:"installationId"`
	ExpiresAt string `json:"expiresAt"`
}
