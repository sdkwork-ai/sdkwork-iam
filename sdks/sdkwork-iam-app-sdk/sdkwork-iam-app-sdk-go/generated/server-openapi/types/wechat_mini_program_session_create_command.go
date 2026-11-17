package types

// One-time WeChat Mini Program login-code exchange command.
type WechatMiniProgramSessionCreateCommand struct {
	JsCode string `json:"jsCode"`
	PhoneCode string `json:"phoneCode"`
	ProviderCode string `json:"providerCode"`
	SurfaceCode string `json:"surfaceCode"`
	DeviceId string `json:"deviceId"`
}
