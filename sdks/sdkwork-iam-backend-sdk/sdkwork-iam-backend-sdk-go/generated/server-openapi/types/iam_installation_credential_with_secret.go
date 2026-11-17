package types

// The create/rotate result: credential metadata plus the one-time plaintext secret. No read operation returns this shape.
type IamInstallationCredentialWithSecret struct {
	CredentialId string `json:"credentialId"`
	TenantId string `json:"tenantId"`
	InstallationEnvironmentId string `json:"installationEnvironmentId"`
	EnvironmentKey string `json:"environmentKey"`
	ClientId string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
	RedirectUris []string `json:"redirectUris"`
	GrantedScopes []string `json:"grantedScopes"`
	Status string `json:"status"`
	RotatedAt string `json:"rotatedAt"`
	RetiredAt string `json:"retiredAt"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}
