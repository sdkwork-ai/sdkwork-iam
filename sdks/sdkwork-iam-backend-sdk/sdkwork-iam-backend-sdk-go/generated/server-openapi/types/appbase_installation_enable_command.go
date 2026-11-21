package types

// Enable a provisioned tenant application before access credential issuance.
type AppbaseInstallationEnableCommand struct {
	AuthToken string `json:"authToken"`
	Username string `json:"username"`
	Email string `json:"email"`
	Phone string `json:"phone"`
	Password string `json:"password"`
}
