import { SdkworkDesktopAuthError } from "./errors.ts";
import type { SdkworkDesktopAuthCallback } from "./types.ts";

function parseRedirectShape(redirectUri: string): { host: string; pathname: string; protocol: string } {
  const parsed = new URL(redirectUri);
  return {
    host: parsed.host.toLowerCase(),
    pathname: parsed.pathname.replace(/\/+$/u, ""),
    protocol: parsed.protocol.toLowerCase(),
  };
}

/**
 * Parses and validates a deep-link callback URI (`scheme://host/path?code=…`
 * or `?error=…`). The URI must match the registered redirect URI shape
 * (scheme, host, path) so a look-alike scheme or foreign path cannot smuggle
 * a foreign code into the flow.
 */
export function parseSdkworkDesktopAuthCallbackUri(
  rawUri: string,
  options: { redirectUri: string },
): SdkworkDesktopAuthCallback {
  const trimmed = rawUri.trim();
  if (!trimmed) {
    throw new SdkworkDesktopAuthError("invalid-callback", "Deep-link callback URI is empty.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new SdkworkDesktopAuthError(
      "invalid-callback",
      "Deep-link callback URI is not a valid absolute URI.",
      trimmed,
    );
  }

  let expected: { host: string; pathname: string; protocol: string };
  try {
    expected = parseRedirectShape(options.redirectUri);
  } catch {
    throw new SdkworkDesktopAuthError(
      "invalid-callback",
      "The configured redirect URI is not a valid absolute URI.",
      options.redirectUri,
    );
  }

  const actual = {
    host: parsed.host.toLowerCase(),
    pathname: parsed.pathname.replace(/\/+$/u, ""),
    protocol: parsed.protocol.toLowerCase(),
  };
  if (actual.protocol !== expected.protocol || actual.host !== expected.host || actual.pathname !== expected.pathname) {
    throw new SdkworkDesktopAuthError(
      "invalid-callback",
      "Deep-link callback does not match the registered redirect URI.",
      `${actual.protocol}//${actual.host}${actual.pathname}`,
    );
  }

  const error = parsed.searchParams.get("error")?.trim() ?? "";
  if (error) {
    const description = parsed.searchParams.get("error_description")?.trim() ?? undefined;
    const state = parsed.searchParams.get("state")?.trim() ?? undefined;
    return {
      callbackUri: trimmed,
      error,
      ...(description ? { errorDescription: description } : {}),
      kind: "error",
      ...(state ? { state } : {}),
    };
  }

  const code = parsed.searchParams.get("code")?.trim() ?? "";
  const state = parsed.searchParams.get("state")?.trim() ?? "";
  if (!code || !state) {
    throw new SdkworkDesktopAuthError(
      "invalid-callback",
      "Deep-link callback is missing the authorization code or state.",
    );
  }

  return { callbackUri: trimmed, code, kind: "success", state };
}
