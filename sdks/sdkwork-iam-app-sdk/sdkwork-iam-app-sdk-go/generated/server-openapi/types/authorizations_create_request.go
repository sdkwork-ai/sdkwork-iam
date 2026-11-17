package types


type AuthorizationsCreateRequest struct {
	ClientId string `json:"clientId"`
	ResponseType string `json:"responseType"`
	RedirectUri string `json:"redirectUri"`
	Scope string `json:"scope"`
	State string `json:"state"`
	CodeChallenge string `json:"codeChallenge"`
	CodeChallengeMethod string `json:"codeChallengeMethod"`
	TenantId string `json:"tenantId"`
}
