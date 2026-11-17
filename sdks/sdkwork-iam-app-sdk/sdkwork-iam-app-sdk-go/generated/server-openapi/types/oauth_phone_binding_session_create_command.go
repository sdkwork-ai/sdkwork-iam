package types

// Completes a pending OAuth account association after the person proved ownership of the phone. Answered with the standard session payload, or with the `LOGIN_CONTEXT_SELECTION` challenge for an account that belongs to several organizations.
type OauthPhoneBindingSessionCreateCommand struct {
	ContinuationToken string `json:"continuationToken"`
	Phone string `json:"phone"`
	VerificationCode string `json:"verificationCode"`
	SurfaceCode string `json:"surfaceCode"`
	DeviceId string `json:"deviceId"`
}
