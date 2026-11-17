package types

// Full persona replacement; omitted interests mean an empty list.
type IamUserPersonaUpdateCommand struct {
	Role string `json:"role"`
	Interests []string `json:"interests"`
	PromptDismissed bool `json:"promptDismissed"`
}
