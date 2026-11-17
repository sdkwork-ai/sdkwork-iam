package types

// One selectable interest direction.
type IamPersonaInterest struct {
	Code string `json:"code"`
	SortOrder int `json:"sortOrder"`
	Labels IamPersonaLabels `json:"labels"`
}
