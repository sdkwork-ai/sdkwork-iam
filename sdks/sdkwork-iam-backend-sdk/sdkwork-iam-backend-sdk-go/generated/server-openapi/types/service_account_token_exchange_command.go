package types

// Exchange a workload client credential for short-lived tenant-bound dual tokens.
type ServiceAccountTokenExchangeCommand struct {
	ClientId string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
}
