package types

// OAuth client metadata of one installation environment. The secret is write-only and is returned only by create/rotate.
type IamInstallationCredential struct {
	CredentialId string `json:"credentialId"`
	TenantId string `json:"tenantId"`
	InstallationEnvironmentId string `json:"installationEnvironmentId"`
	EnvironmentKey string `json:"environmentKey"`
	ClientId string `json:"clientId"`
	RedirectUris []string `json:"redirectUris"`
	GrantedScopes []string `json:"grantedScopes"`
	Status string `json:"status"`
	RotatedAt string `json:"rotatedAt"`
	RetiredAt string `json:"retiredAt"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}
