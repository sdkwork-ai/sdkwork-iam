package types


type AuthorizationsCreateResponse struct {
	Code int `json:"code"`
	TraceId string `json:"traceId"`
	Data map[string]interface{} `json:"data"`
}
