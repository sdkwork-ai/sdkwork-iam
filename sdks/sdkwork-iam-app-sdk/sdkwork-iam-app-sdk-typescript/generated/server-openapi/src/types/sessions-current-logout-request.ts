export interface SessionsCurrentLogoutRequest {
  /** Refresh token of the session to revoke. Accepted without an access token so logout still revokes the server session after the access token expired. */
  refreshToken: string;
}
