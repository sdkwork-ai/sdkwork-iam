package types

// Signed application access credential. It is a session-class credential: it expires after one hour and can be revoked like any other IAM session.
type IamAppAccessToken struct {
	AccessToken string `json:"accessToken"`
	AuthToken string `json:"authToken"`
	ExpiresAt string `json:"expiresAt"`
	AppId string `json:"appId"`
	InstallationId string `json:"installationId"`
	OrganizationId string `json:"organizationId"`
	OwnershipScope string `json:"ownershipScope"`
	SessionId string `json:"sessionId"`
	Environment string `json:"environment"`
}
