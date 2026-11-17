package types

// One member of an organization roster as IAM publishes it.
type IamOrganizationMember struct {
	UserId string `json:"userId"`
	MembershipId string `json:"membershipId"`
	DisplayName string `json:"displayName"`
	Username string `json:"username"`
	Email string `json:"email"`
	MembershipKind string `json:"membershipKind"`
	Status string `json:"status"`
	IsPrimary bool `json:"isPrimary"`
}
