package types

// Rotates the active credential: the replacement becomes active with a new client id and secret, and the predecessor is kept as rotated history.
type IamInstallationCredentialRotateCommand struct {
	ClientId string `json:"clientId"`
}
