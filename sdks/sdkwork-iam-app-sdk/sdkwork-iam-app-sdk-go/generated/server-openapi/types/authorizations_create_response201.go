package types


type AuthorizationsCreateResponse201 struct {
	Code int `json:"code"`
	TraceId string `json:"traceId"`
	Data map[string]interface{} `json:"data"`
}
