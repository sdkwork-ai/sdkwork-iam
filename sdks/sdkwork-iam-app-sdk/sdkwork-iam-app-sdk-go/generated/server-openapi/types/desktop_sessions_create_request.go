package types

// Native-app exchange of a deep-link authorization code for a dual-token session.
type DesktopSessionsCreateRequest struct {
	ClientId string `json:"clientId"`
	AuthorizationCode string `json:"authorizationCode"`
	CodeVerifier string `json:"codeVerifier"`
	RedirectUri string `json:"redirectUri"`
	ClientSecret string `json:"clientSecret"`
	DeviceId string `json:"deviceId"`
}
