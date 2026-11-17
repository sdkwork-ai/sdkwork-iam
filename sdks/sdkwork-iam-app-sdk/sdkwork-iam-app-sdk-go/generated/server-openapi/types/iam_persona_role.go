package types

// One selectable persona role.
type IamPersonaRole struct {
	Code string `json:"code"`
	IamRoleCode string `json:"iamRoleCode"`
	SortOrder int `json:"sortOrder"`
	Labels IamPersonaLabels `json:"labels"`
	Descriptions IamPersonaLabels `json:"descriptions"`
}
