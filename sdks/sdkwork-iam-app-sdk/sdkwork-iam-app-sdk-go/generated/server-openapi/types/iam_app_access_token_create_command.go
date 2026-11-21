package types

// Selectors for the application whose access credential is requested. Supply at least one; the tenant and the organization are derived from the authenticated session and the installation, never from this body.
type IamAppAccessTokenCreateCommand struct {
	AppId string `json:"appId"`
	InstallationId string `json:"installationId"`
	InstanceKey string `json:"instanceKey"`
	Environment string `json:"environment"`
	OwnershipScope string `json:"ownershipScope"`
}
