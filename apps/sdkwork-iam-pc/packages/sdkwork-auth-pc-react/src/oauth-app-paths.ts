/**
 * Canonical hosted app-login protocol paths.
 *
 * A platform that hosts `GET /iam/v3/oauth/authorize` for native applications
 * (and the versionless alias) forwards the validated request to the IAM
 * open-api authorize endpoint, then lets the hosted login continue on
 * `/auth/login` and hand the deep link back from `/auth/desktop/launch`.
 * These strings are the protocol, so every browser host imports them from one
 * place instead of restating literals.
 */

/** Authorize path a native application opens on the platform origin. */
export const SDKWORK_OAUTH_APP_AUTHORIZE_PATH = "/iam/v3/oauth/authorize";

/** Versionless alias of the authorize path; both render the same hosted entry. */
export const SDKWORK_OAUTH_APP_AUTHORIZE_VERSIONLESS_PATH = "/iam/oauth/authorize";

/** Every authorize path the hosted entry answers. */
export const SDKWORK_OAUTH_APP_AUTHORIZE_PATHS: readonly string[] = Object.freeze([
  SDKWORK_OAUTH_APP_AUTHORIZE_PATH,
  SDKWORK_OAUTH_APP_AUTHORIZE_VERSIONLESS_PATH,
]);

/** IAM open-api authorize endpoint the hosted entry forwards to. */
export const SDKWORK_OAUTH_APP_AUTHORIZE_ENDPOINT_PATH = "/iam/v3/api/oauth/authorize";

/** Short alias route that also renders the hosted entry. */
export const SDKWORK_OAUTH_APP_ALIAS_PATH = "/auth/app";

/** Hosted login page the IAM authorization server redirects the browser to. */
export const SDKWORK_OAUTH_APP_LOGIN_PATH = "/auth/login";

/** Hand-off page that fires the deep link after the authorization completes. */
export const SDKWORK_OAUTH_APP_LAUNCH_PATH = "/auth/desktop/launch";

/** Query parameter the IAM authorization server hands to the hosted login. */
export const SDKWORK_OAUTH_AUTHORIZATION_STATE_PARAM = "oauthAuthorizationStateId";
