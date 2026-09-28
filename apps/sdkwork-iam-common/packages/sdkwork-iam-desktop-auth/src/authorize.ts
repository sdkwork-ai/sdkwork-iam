import { SdkworkDesktopAuthError } from "./errors.ts";
import {
  DEFAULT_DESKTOP_LOGIN_SCOPES,
  type SdkworkDesktopBrowserLoginDescriptor,
  type SdkworkDesktopPendingFlow,
} from "./types.ts";

export const SDKWORK_OAUTH_AUTHORIZE_PATH = "/iam/v3/oauth/authorize";

export interface SdkworkDesktopAuthorizeInput {
  codeChallenge: string;
  state: string;
}

/**
 * Builds the authorization-redirect URL the desktop app hands to the system
 * browser. Public desktop clients always send PKCE S256 plus state, so the
 * IAM authorize endpoint can validate the request before showing the hosted
 * login surface.
 */
export function buildSdkworkDesktopAuthorizeUrl(
  descriptor: SdkworkDesktopBrowserLoginDescriptor,
  input: SdkworkDesktopAuthorizeInput,
): string {
  const appId = descriptor.appId.trim();
  const redirectUri = descriptor.redirectUri.trim();
  if (!appId) {
    throw new SdkworkDesktopAuthError(
      "host-unavailable",
      "Desktop browser login requires the application id (OAuth client_id).",
    );
  }
  if (!redirectUri) {
    throw new SdkworkDesktopAuthError(
      "host-unavailable",
      "Desktop browser login requires the registered redirect URI.",
    );
  }

  const endpoint = descriptor.authorizeUrl?.trim()
    || `${(descriptor.authorizeBaseUrl ?? "").trim().replace(/\/+$/u, "")}${SDKWORK_OAUTH_AUTHORIZE_PATH}`;
  if (!endpoint) {
    throw new SdkworkDesktopAuthError(
      "host-unavailable",
      "Desktop browser login requires authorizeBaseUrl or authorizeUrl.",
    );
  }

  const url = new URL(endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set(
    "scope",
    (descriptor.scopes ?? DEFAULT_DESKTOP_LOGIN_SCOPES).join(" "),
  );
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

/** Random one-time state token (base64url of 24 bytes). */
export function createSdkworkDesktopStateToken(): string {
  const crypto = globalThis.crypto;
  if (!crypto?.getRandomValues) {
    throw new SdkworkDesktopAuthError(
      "host-unavailable",
      "A WebCrypto implementation with getRandomValues is required for state tokens.",
    );
  }
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

/** Constant-time-ish state comparison to avoid trivial timing oracles. */
export function statesMatch(expected: string, actual: string): boolean {
  if (expected.length !== actual.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ actual.charCodeAt(index);
  }
  return difference === 0;
}

export function isFlowExpired(flow: SdkworkDesktopPendingFlow, now: number): boolean {
  return flow.expiresAt <= now;
}
