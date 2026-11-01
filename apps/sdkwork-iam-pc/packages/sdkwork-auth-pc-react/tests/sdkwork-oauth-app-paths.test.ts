/**
 * The hosted app-login path contract is the single source platform front-ends
 * import. It must agree with the auth route catalog (the pages the hosted
 * login renders) and keep the two authorize spellings plus the IAM open-api
 * forward endpoint distinct.
 */
import { describe, expect, it } from "vitest";
import { createAuthRouteCatalog } from "../src/auth.ts";
import {
  SDKWORK_OAUTH_APP_AUTHORIZE_ENDPOINT_PATH,
  SDKWORK_OAUTH_APP_AUTHORIZE_PATH,
  SDKWORK_OAUTH_APP_AUTHORIZE_PATHS,
  SDKWORK_OAUTH_APP_AUTHORIZE_VERSIONLESS_PATH,
  SDKWORK_OAUTH_APP_LAUNCH_PATH,
  SDKWORK_OAUTH_APP_LOGIN_PATH,
  SDKWORK_OAUTH_AUTHORIZATION_STATE_PARAM,
} from "../src/oauth-app-paths.ts";

describe("hosted app-login path contract", () => {
  it("agrees with the auth route catalog", () => {
    const routes = createAuthRouteCatalog("/auth");
    const pathFor = (id: string) => routes.find((route) => route.id === id)?.path;
    expect(SDKWORK_OAUTH_APP_LOGIN_PATH).toBe(pathFor("login"));
    expect(SDKWORK_OAUTH_APP_LAUNCH_PATH).toBe(pathFor("desktop-launch"));
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

  it("names the state parameter the hosted login reads", () => {
    expect(SDKWORK_OAUTH_AUTHORIZATION_STATE_PARAM).toBe("oauthAuthorizationStateId");
  });
});
