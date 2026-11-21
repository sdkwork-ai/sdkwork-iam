package types

// Update operator-managed tenant application domain and access permissions.
type IamInstallationManagementUpdateCommand struct {
	PrimaryDomain string `json:"primaryDomain"`
	AccessPermissions []string `json:"accessPermissions"`
}
