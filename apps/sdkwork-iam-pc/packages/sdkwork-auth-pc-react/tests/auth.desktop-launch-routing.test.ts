/**
 * Desktop hand-off routing without a renderer: the decision that turns a
 * completed desktop authorization into the hosted login-success page, and the
 * route the page lives on. `AuthPage` classifies the redirect, stores the deep
 * link with `storeSdkworkDesktopLaunchRedirect`, and navigates to the launch
 * path; this suite pins that routing contract without jsdom/react.
 */
import { describe, expect, it } from "vitest";
import {
  buildSdkworkAuthDesktopLaunchLocation,
  buildSdkworkAuthDesktopLaunchPath,
  isSdkworkDesktopDeepLinkRedirect,
} from "../src/auth.ts";
import {
  SDKWORK_OAUTH_APP_LAUNCH_PATH,
  SDKWORK_OAUTH_ROUTES,
} from "../src/oauth-app-paths.ts";

describe("desktop deep-link classification", () => {
  it("hands custom-scheme completions to the desktop launch page", () => {
    expect(isSdkworkDesktopDeepLinkRedirect("birdcoder://auth/callback?code=abc&state=xyz")).toBe(true);
    expect(isSdkworkDesktopDeepLinkRedirect("sdkwork-iam://auth/callback")).toBe(true);
    expect(isSdkworkDesktopDeepLinkRedirect("  BIRDCODER://AUTH/CALLBACK?code=a  ")).toBe(true);
  });

  it("keeps web redirects on the ordinary navigation path", () => {
    expect(isSdkworkDesktopDeepLinkRedirect("https://app.example.com/auth/callback?code=a")).toBe(false);
    expect(isSdkworkDesktopDeepLinkRedirect("http://127.0.0.1:41017/auth/desktop/callback")).toBe(false);
    expect(isSdkworkDesktopDeepLinkRedirect("")).toBe(false);
    expect(isSdkworkDesktopDeepLinkRedirect(null)).toBe(false);
    expect(isSdkworkDesktopDeepLinkRedirect("not a uri")).toBe(false);
  });
});

describe("desktop launch location", () => {
  it("carries the deep link in the redirectUrl parameter", () => {
    const redirect = "birdcoder://auth/callback?code=abc&state=xyz";
    expect(buildSdkworkAuthDesktopLaunchPath()).toBe("/oauth/desktop/launch");
    expect(buildSdkworkAuthDesktopLaunchLocation(redirect)).toBe(
      `/oauth/desktop/launch?redirectUrl=${encodeURIComponent(redirect)}`,
    );
  });

  it("stays on the protocol route whatever auth base path a host mounts", () => {
    expect(buildSdkworkAuthDesktopLaunchLocation("birdcoder://auth/callback"))
      .toBe(`/oauth/desktop/launch?redirectUrl=${encodeURIComponent("birdcoder://auth/callback")}`);
  });

  it("exposes the launch route through the OAuth route model", () => {
    // The hand-off page is an OAuth surface, so it comes from the OAuth route
    // model rather than the account route catalog.
    expect(SDKWORK_OAUTH_APP_LAUNCH_PATH).toBe("/oauth/desktop/launch");
    expect(SDKWORK_OAUTH_ROUTES.desktopLaunch).toBe("/oauth/desktop/launch");
  });
});
