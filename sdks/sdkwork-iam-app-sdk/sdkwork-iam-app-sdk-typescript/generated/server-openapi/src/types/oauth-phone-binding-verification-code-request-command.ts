/** Requests the ownership-proof SMS code for a pending OAuth account association. Unlike `auth/verification_code_requests` the caller is not yet authenticated; the pending-binding ticket is the authorization. */
export interface OauthPhoneBindingVerificationCodeRequestCommand {
  /** One-time `continuationToken` returned by the `OAUTH_PHONE_BINDING_REQUIRED` challenge. */
  continuationToken: string;
  /** Phone number to prove ownership of. */
  phone: string;
}
