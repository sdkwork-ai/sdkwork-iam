/** Completes a pending OAuth account association after the person proved ownership of the phone. Answered with the standard session payload, or with the `LOGIN_CONTEXT_SELECTION` challenge for an account that belongs to several organizations. */
export interface OauthPhoneBindingSessionCreateCommand {
  /** One-time `continuationToken` returned by the `OAUTH_PHONE_BINDING_REQUIRED` challenge of an OAuth, mini-program, or official-account session exchange. */
  continuationToken: string;
  /** Phone number that owns the target IAM account. When no account owns it yet, a new account is registered for the OAuth identity if the tenant allows OAuth auto-registration. */
  phone: string;
  /** One-time SMS verification code requested for this phone. */
  verificationCode: string;
  /** Originating client surface, recorded with the association. */
  surfaceCode?: string;
  /** Opaque client device identity kept from the challenge. Omit it only when the original request did not send one; the session then binds no device slot. */
  deviceId?: string;
}
