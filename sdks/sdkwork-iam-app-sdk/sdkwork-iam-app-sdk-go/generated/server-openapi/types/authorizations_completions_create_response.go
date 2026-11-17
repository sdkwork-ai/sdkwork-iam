package types


type AuthorizationsCompletionsCreateResponse struct {
	Code int `json:"code"`
	TraceId string `json:"traceId"`
	Data map[string]interface{} `json:"data"`
}
