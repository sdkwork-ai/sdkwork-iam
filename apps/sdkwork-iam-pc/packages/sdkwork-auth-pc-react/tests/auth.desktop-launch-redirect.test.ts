/**
 * Hand-off URL safety: `/auth/desktop/launch?redirectUrl=...` is reachable by
 * anyone, so only a native app surface (custom scheme) or an RFC 8252 loopback
 * redirect may be auto-navigated to. A web origin, `javascript:`, `data:` or
 * `file:` URL would turn the page into an open redirect.
 */
import { describe, expect, it } from "vitest";
import { isSafeSdkworkDesktopLaunchUrl } from "../src/auth-redirect.ts";

describe("isSafeSdkworkDesktopLaunchUrl", () => {
  it("accepts native app hand-offs", () => {
    expect(
      isSafeSdkworkDesktopLaunchUrl(
        "birdcoder://auth/callback?code=abc&state=xyz",
      ),
    ).toBe(true);
    expect(
      isSafeSdkworkDesktopLaunchUrl("sdkwork-iam://auth/callback?code=abc"),
    ).toBe(true);
  });

  it("accepts RFC 8252 loopback redirects", () => {
    expect(isSafeSdkworkDesktopLaunchUrl("http://127.0.0.1:53682/callback?code=abc")).toBe(true);
    expect(isSafeSdkworkDesktopLaunchUrl("http://localhost:3000/callback")).toBe(true);
    expect(isSafeSdkworkDesktopLaunchUrl("http://[::1]:8080/callback")).toBe(true);
  });

  it("rejects web origins and scriptable destinations", () => {
    const unsafe = [
      "https://evil.example/phish",
      "http://evil.example/phish",
      "https://platform.birdcoder.com.evil.example/callback",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "vbscript:msgbox(1)",
      "about:blank",
      "//evil.example/callback",
      "",
      "   ",
      "not a url",
      "birdcoder://auth/callback\u0000extra",
    ];
    for (const value of unsafe) {
      expect(isSafeSdkworkDesktopLaunchUrl(value), value).toBe(false);
    }
  });

  it("rejects custom schemes without an authority", () => {
    expect(isSafeSdkworkDesktopLaunchUrl("birdcoder:foo")).toBe(false);
    expect(isSafeSdkworkDesktopLaunchUrl("birdcoder://")).toBe(false);
  });
});
