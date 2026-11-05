/** Native-app exchange of a deep-link authorization code for a dual-token session. */
export interface DesktopSessionsCreateRequest {
  clientId: string;
  authorizationCode: string;
  codeVerifier: string;
  /** Registered native redirect URI; the code must have been issued for a desktop surface (custom scheme or loopback). */
  redirectUri: string;
  clientSecret?: string;
  /** Stable opaque per-install device identity. A new login replaces only this device's previous session for the same application. */
  deviceId?: string;
}
