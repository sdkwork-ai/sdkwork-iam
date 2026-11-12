/**
 * Hosted sign-out URL contract: the page a desktop shell opens in the system
 * browser must be the same route this package mounts inside the host's auth
 * base path, whichever base path the host chose.
 */
import { describe, expect, it } from "vitest";
import {
  buildSdkworkAuthSignOutPath,
  buildSdkworkAuthSignOutUrl,
  isSdkworkAuthSignOutPath,
  SDKWORK_AUTH_SIGN_OUT_SEGMENT,
} from "../src/auth-sign-out.ts";

describe("hosted sign-out path", () => {
  it("mounts below the conventional auth base path", () => {
    expect(SDKWORK_AUTH_SIGN_OUT_SEGMENT).toBe("sign-out");
    expect(buildSdkworkAuthSignOutPath()).toBe("/auth/sign-out");
  });

  it("normalizes the host base path", () => {
    expect(buildSdkworkAuthSignOutPath("/auth")).toBe("/auth/sign-out");
    expect(buildSdkworkAuthSignOutPath("/auth/")).toBe("/auth/sign-out");
    expect(buildSdkworkAuthSignOutPath("auth")).toBe("/auth/sign-out");
    expect(buildSdkworkAuthSignOutPath("  ")).toBe("/auth/sign-out");
    expect(buildSdkworkAuthSignOutPath("/identity")).toBe("/identity/sign-out");
  });

  it("builds the absolute URL from a product origin", () => {
    expect(buildSdkworkAuthSignOutUrl({ baseUrl: "https://router.sdkwork.com" }))
      .toBe("https://router.sdkwork.com/auth/sign-out");
    expect(buildSdkworkAuthSignOutUrl({ baseUrl: "https://router.sdkwork.com/" }))
      .toBe("https://router.sdkwork.com/auth/sign-out");
    expect(buildSdkworkAuthSignOutUrl({ baseUrl: "https://router.sdkwork.com", basePath: "/identity" }))
      .toBe("https://router.sdkwork.com/identity/sign-out");
  });

  it("recognizes only the sign-out page", () => {
    expect(isSdkworkAuthSignOutPath("/auth/sign-out")).toBe(true);
    expect(isSdkworkAuthSignOutPath("/auth/sign-out/")).toBe(true);
    expect(isSdkworkAuthSignOutPath("/auth/sign-out/done")).toBe(true);
    expect(isSdkworkAuthSignOutPath("/auth/login")).toBe(false);
    expect(isSdkworkAuthSignOutPath("/auth/sign-outside")).toBe(false);
    expect(isSdkworkAuthSignOutPath("/auth")).toBe(false);
  });
});
