package types

// Update operator-managed tenant application domain and access permissions.
type IamTenantApplicationManagementUpdateCommand struct {
	PrimaryDomain string `json:"primaryDomain"`
	AccessPermissions []string `json:"accessPermissions"`
}
