/**
 * Pending app OAuth authorization carried by the hosted auth page's own URL.
 *
 * A desktop application opens the platform's authorize entry in the system
 * browser. The entry validates the request and renders the hosted auth surface
 * in place, without the pending IAM authorization state: the state is created
 * when the browser actually signs in (or confirms the account), so an anonymous
 * visitor sees the login form and a signed-in browser sees the account choice
 * immediately instead of a waiting page.
 */
export interface SdkworkAuthAppAuthorizeRequest {
  clientId: string;
  codeChallenge: string;
  redirectUri: string;
  scope: string;
  state: string;
}

/** PKCE S256 challenge: 43-128 base64url characters. */
const CODE_CHALLENGE_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/u;
/** OAuth client ids are short lower-case slugs. */
const CLIENT_ID_PATTERN = /^[a-z][a-z0-9._-]{0,127}$/u;
const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);
const DEFAULT_SCOPE = "openid profile offline_access";

/**
 * Whether the redirect URI is a native application callback.
 *
 * Only private-use schemes (`birdcoder://auth/callback`) and RFC 8252 loopback
 * callbacks may start the lazy state creation from a login page; an arbitrary
 * web callback must not turn the login screen into a general OAuth entry.
 */
function isNativeAppRedirectUri(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.username !== "" || url.password !== "") {
    return false;
  }
  if (url.protocol === "http:" || url.protocol === "https:") {
    return LOOPBACK_HOSTNAMES.has(url.hostname);
  }
  return url.protocol.endsWith(":") && url.protocol !== "javascript:" && url.protocol !== "data:";
}

/**
 * Read the pending app authorization from the page query string.
 * @param params - the current location search params.
 * @returns the request, or undefined when this page is not an app authorization.
 */
export function readSdkworkAuthAppAuthorizeRequest(
  params: URLSearchParams,
): SdkworkAuthAppAuthorizeRequest | undefined {
  const responseType = (params.get("response_type")?.trim() || "code").toLowerCase();
  if (responseType !== "code") {
    return undefined;
  }
  const challengeMethod = (params.get("code_challenge_method")?.trim() || "S256").toUpperCase();
  if (challengeMethod !== "S256") {
    return undefined;
  }
  const clientId = params.get("client_id")?.trim() || "";
  const redirectUri = params.get("redirect_uri")?.trim() || "";
  const state = params.get("state")?.trim() || "";
  const codeChallenge = params.get("code_challenge")?.trim() || "";
  if (
    !CLIENT_ID_PATTERN.test(clientId)
    || !state
    || !CODE_CHALLENGE_PATTERN.test(codeChallenge)
    || !isNativeAppRedirectUri(redirectUri)
  ) {
    return undefined;
  }
  const scope = params.get("scope")?.trim() || DEFAULT_SCOPE;
  return {
    clientId,
    codeChallenge,
    redirectUri,
    scope,
    state,
  };
}
