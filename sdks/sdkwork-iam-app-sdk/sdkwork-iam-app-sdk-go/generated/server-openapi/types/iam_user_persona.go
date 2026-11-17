package types

// The caller persona. role is null until a role is chosen.
type IamUserPersona struct {
	Role string `json:"role"`
	Interests []string `json:"interests"`
	PromptDismissed bool `json:"promptDismissed"`
	HasSelection bool `json:"hasSelection"`
	CatalogVersion string `json:"catalogVersion"`
	UpdatedAt string `json:"updatedAt"`
}
