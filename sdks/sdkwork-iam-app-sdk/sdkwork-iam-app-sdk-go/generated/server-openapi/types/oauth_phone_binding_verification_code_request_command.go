package types

// Requests the ownership-proof SMS code for a pending OAuth account association. Unlike `auth/verification_code_requests` the caller is not yet authenticated; the pending-binding ticket is the authorization.
type OauthPhoneBindingVerificationCodeRequestCommand struct {
	ContinuationToken string `json:"continuationToken"`
	Phone string `json:"phone"`
}
