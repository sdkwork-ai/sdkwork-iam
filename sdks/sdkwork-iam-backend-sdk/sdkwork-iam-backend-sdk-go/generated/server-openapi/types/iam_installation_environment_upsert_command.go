package types

// Idempotent registration of one environment. The path environmentKey is authoritative; an explicit body value must match it. Omitted status keeps the stored status on update and defaults to pending on insert.
type IamInstallationEnvironmentUpsertCommand struct {
	EnvironmentKey string `json:"environmentKey"`
	PrimaryDomain string `json:"primaryDomain"`
	DomainConfig map[string]interface{} `json:"domainConfig"`
	Status string `json:"status"`
}
