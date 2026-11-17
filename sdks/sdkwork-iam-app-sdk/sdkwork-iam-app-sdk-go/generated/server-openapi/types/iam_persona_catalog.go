package types

// The selectable persona taxonomy with every active locale.
type IamPersonaCatalog struct {
	Version string `json:"version"`
	Roles []IamPersonaRole `json:"roles"`
	Interests []IamPersonaInterest `json:"interests"`
}
