/**
 * Canonical hosted OAuth protocol paths.
 *
 * The two namespaces are disjoint and each owns one system:
 *
 * - `/auth/*` is the website's own account surface: login, registration,
 *   password recovery, scan login, and sign-out of the portal itself.
 * - `/oauth/*` is the OAuth system: the browser-login flow a desktop
 *   application starts, its login step and deep-link hand-off, the provider
 *   callback of the website's OAuth client, and the hosted authorize alias.
 *   The IAM authorization server and its open-platform clients live under
 *   `/iam/oauth/*`.
 *
 * A native application opens `GET /iam/oauth/authorize` (or the versionless
 * `/iam/oauth/authorize`) in the system browser. The page creates the pending
 * authorization state through the IAM app-api, sends the browser to the
 * `/oauth/login` step, and hands the deep link back from
 * `/oauth/desktop/launch`.
 *
 * These strings are the protocol, so every browser host imports them from one
 * place instead of restating literals.
 */

/** Legacy versioned authorize path; still answered for installed clients. */
export const SDKWORK_OAUTH_APP_AUTHORIZE_PATH = "/iam/v3/oauth/authorize";

/** Authorize path native applications open on the platform origin. */
export const SDKWORK_OAUTH_APP_AUTHORIZE_VERSIONLESS_PATH = "/iam/oauth/authorize";

/** Every authorize path the hosted entry answers. */
export const SDKWORK_OAUTH_APP_AUTHORIZE_PATHS: readonly string[] = Object.freeze([
  SDKWORK_OAUTH_APP_AUTHORIZE_PATH,
  SDKWORK_OAUTH_APP_AUTHORIZE_VERSIONLESS_PATH,
]);

/** IAM open-api authorize endpoint the hosted entry forwards to. */
export const SDKWORK_OAUTH_APP_AUTHORIZE_ENDPOINT_PATH = "/iam/v3/api/oauth/authorize";

/** Short alias route that also renders the hosted authorize entry. */
export const SDKWORK_OAUTH_APP_ALIAS_PATH = "/oauth/app";

/**
 * Hosted login step of the OAuth browser flow.
 *
 * The IAM authorization server sends the browser here with
 * `oauthAuthorizationStateId`. The page signs the visitor in — or confirms the
 * already signed-in account — and completes the pending authorization, so the
 * OAuth flow never lands on the website's `/auth/login` account page.
 */
export const SDKWORK_OAUTH_APP_LOGIN_PATH = "/oauth/login";

/**
 * Hand-off page that fires the deep link after the authorization completes.
 *
 * The page is a platform-level route, not a page under whichever auth base path
 * a host mounts: the browser lands here after a desktop authorization, so the
 * path is fixed for every host that serves the app-login flow.
 */
export const SDKWORK_OAUTH_APP_LAUNCH_PATH = "/oauth/desktop/launch";

/**
 * Provider callback of the website's OAuth client (no `:provider` segment).
 *
 * The server registers this path as the provider redirect URI, and the H5 host
 * mounts it as-is. The path is fixed, not derived from the host's auth base
 * path, because a third-party round trip is an OAuth hop rather than a page of
 * the account surface.
 */
export const SDKWORK_OAUTH_PROVIDER_CALLBACK_PATH = "/oauth/callback";

/** Provider callback route pattern a browser host mounts. */
export const SDKWORK_OAUTH_PROVIDER_CALLBACK_ROUTE_PATTERN = "/oauth/callback/:provider";

/** Prefix the OAuth namespace owns. */
export const SDKWORK_OAUTH_SURFACE_PATH_PREFIX = "/oauth";

/**
 * Whether a path belongs to the OAuth namespace rather than the account
 * surface. A redirect target inside it is refused, exactly like an auth route.
 * @param pathname - browser pathname to classify.
 * @returns true for the OAuth namespace itself and anything under it.
 */
export function isSdkworkOAuthSurfacePath(pathname: string): boolean {
  const normalized = pathname.trim();
  return normalized === SDKWORK_OAUTH_SURFACE_PATH_PREFIX
    || normalized.startsWith(`${SDKWORK_OAUTH_SURFACE_PATH_PREFIX}/`);
}

/** Query parameter the IAM authorization server hands to the hosted login. */
export const SDKWORK_OAUTH_AUTHORIZATION_STATE_PARAM = "oauthAuthorizationStateId";
