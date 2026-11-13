/** One-time WeChat Mini Program login-code exchange command. */
export interface WechatMiniProgramSessionCreateCommand {
  /** One-time code returned by wx.login(). */
  jsCode: string;
  /** One-time code returned by the mini program getPhoneNumber grant. WeChat verified the subscriber SIM for this code, so the resulting phone may associate the WeChat identity with an existing account (subject to the tenant OAuth phone-association policy). Omit it to require the phone-binding step instead. */
  phoneCode?: string;
  providerCode?: 'wechat_mini_program';
  /** Registered IAM OAuth mini-program surface code. */
  surfaceCode?: string;
  /** Opaque client device identity. Sessions are replaced per application per device, so the same device signing in again revokes only its own previous session instead of every session of the application. Carried forward across refresh and the phone-binding step. */
  deviceId?: string;
}
