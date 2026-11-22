/**
 * The hosted app-login path contract is the single source platform front-ends
 * import. It must agree with the auth route catalog (the pages the hosted
 * login renders) and keep the two authorize spellings plus the IAM open-api
 * forward endpoint distinct.
 *
 * The OAuth namespace and the account surface are disjoint: `/auth/*` owns the
 * website's own login, registration, recovery, scan login, and sign-out, while
 * `/oauth/*` owns the browser-login flow of a native application, its login
 * step, its deep-link hand-off, and the provider callback of the website's
 * OAuth client.
 */
import { describe, expect, it } from "vitest";
import { createAuthRouteCatalog } from "../src/auth.ts";
import {
  isSdkworkOAuthSurfacePath,
  SDKWORK_OAUTH_APP_ALIAS_PATH,
  SDKWORK_OAUTH_APP_AUTHORIZE_ENDPOINT_PATH,
  SDKWORK_OAUTH_APP_AUTHORIZE_PATH,
  SDKWORK_OAUTH_APP_AUTHORIZE_PATHS,
  SDKWORK_OAUTH_APP_AUTHORIZE_VERSIONLESS_PATH,
  SDKWORK_OAUTH_APP_LAUNCH_PATH,
  SDKWORK_OAUTH_APP_LOGIN_PATH,
  SDKWORK_OAUTH_AUTHORIZATION_STATE_PARAM,
  SDKWORK_OAUTH_PROVIDER_CALLBACK_PATH,
  SDKWORK_OAUTH_PROVIDER_CALLBACK_ROUTE_PATTERN,
} from "../src/oauth-app-paths.ts";

describe("hosted OAuth path contract", () => {
  it("agrees with the auth route catalog", () => {
    const routes = createAuthRouteCatalog("/auth");
    const pathFor = (id: string) => routes.find((route) => route.id === id)?.path;
    // The hand-off page and the provider callback are OAuth protocol routes,
    // so the catalog carries their fixed paths rather than base-path ones.
    expect(SDKWORK_OAUTH_APP_LAUNCH_PATH).toBe(pathFor("desktop-launch"));
    expect(SDKWORK_OAUTH_PROVIDER_CALLBACK_ROUTE_PATTERN).toBe(pathFor("oauth-callback"));
  });

  it("keeps every OAuth path in the /oauth namespace", () => {
    expect(SDKWORK_OAUTH_APP_ALIAS_PATH).toBe("/oauth/app");
    expect(SDKWORK_OAUTH_APP_LOGIN_PATH).toBe("/oauth/login");
    expect(SDKWORK_OAUTH_APP_LAUNCH_PATH).toBe("/oauth/desktop/launch");
    expect(SDKWORK_OAUTH_PROVIDER_CALLBACK_PATH).toBe("/oauth/callback");
    expect(SDKWORK_OAUTH_PROVIDER_CALLBACK_ROUTE_PATTERN).toBe("/oauth/callback/:provider");
    for (const path of [
      SDKWORK_OAUTH_APP_ALIAS_PATH,
      SDKWORK_OAUTH_APP_LOGIN_PATH,
      SDKWORK_OAUTH_APP_LAUNCH_PATH,
      SDKWORK_OAUTH_PROVIDER_CALLBACK_PATH,
    ]) {
      expect(isSdkworkOAuthSurfacePath(path), path).toBe(true);
    }
    expect(isSdkworkOAuthSurfacePath("/auth/login")).toBe(false);
    expect(isSdkworkOAuthSurfacePath("/auth/oauth/callback")).toBe(false);
  });

  it("keeps the website's account surface out of the OAuth namespace", () => {
    const routes = createAuthRouteCatalog("/auth");
    const pathFor = (id: string) => routes.find((route) => route.id === id)?.path;
    // The site's login page is not the OAuth login step, and the site's auth
    // pages keep the account base path.
    expect(pathFor("login")).toBe("/auth/login");
    expect(pathFor("register")).toBe("/auth/register");
    expect(pathFor("forgot-password")).toBe("/auth/forgot-password");
    expect(pathFor("qr-login")).toBe("/auth/qr-login");
    expect(SDKWORK_OAUTH_APP_LOGIN_PATH).not.toBe(pathFor("login"));
  });

  it("keeps the versioned, versionless, and forward endpoint distinct", () => {
    expect(SDKWORK_OAUTH_APP_AUTHORIZE_PATH).toBe("/iam/v3/oauth/authorize");
    expect(SDKWORK_OAUTH_APP_AUTHORIZE_VERSIONLESS_PATH).toBe("/iam/oauth/authorize");
    expect(SDKWORK_OAUTH_APP_AUTHORIZE_ENDPOINT_PATH).toBe("/iam/v3/api/oauth/authorize");
    expect([...SDKWORK_OAUTH_APP_AUTHORIZE_PATHS]).toEqual([
      SDKWORK_OAUTH_APP_AUTHORIZE_PATH,
      SDKWORK_OAUTH_APP_AUTHORIZE_VERSIONLESS_PATH,
    ]);
  });

  it("names the state parameter the OAuth login step reads", () => {
    expect(SDKWORK_OAUTH_AUTHORIZATION_STATE_PARAM).toBe("oauthAuthorizationStateId");
  });
});
