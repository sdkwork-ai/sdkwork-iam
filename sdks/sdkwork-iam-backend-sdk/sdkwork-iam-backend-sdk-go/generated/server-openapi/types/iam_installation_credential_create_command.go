package types

// Creates the OAuth client of one environment. Omitted clientId is generated.
type IamInstallationCredentialCreateCommand struct {
	EnvironmentKey string `json:"environmentKey"`
	ClientId string `json:"clientId"`
	RedirectUris []string `json:"redirectUris"`
	GrantedScopes []string `json:"grantedScopes"`
}
