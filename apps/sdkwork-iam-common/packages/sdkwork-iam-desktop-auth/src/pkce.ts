import { SdkworkDesktopAuthError } from "./errors.ts";

const VERIFIER_BYTE_LENGTH = 32;
const BASE64_URL_PATTERN = /^[A-Za-z0-9_-]+$/;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const encoded = btoa(binary);
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function randomVerifier(): string {
  const crypto = globalThis.crypto;
  if (!crypto?.getRandomValues) {
    throw new SdkworkDesktopAuthError(
      "host-unavailable",
      "A WebCrypto implementation with getRandomValues is required for PKCE.",
    );
  }
  const bytes = new Uint8Array(VERIFIER_BYTE_LENGTH);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

async function sha256Base64Url(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new SdkworkDesktopAuthError(
      "host-unavailable",
      "A WebCrypto implementation with subtle.digest is required for S256 PKCE (secure context).",
    );
  }
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(digest));
}

export interface SdkworkDesktopPkcePair {
  codeChallenge: string;
  codeVerifier: string;
}

/**
 * Creates an S256 PKCE pair (RFC 7636 section 4): a high-entropy verifier and
 * its base64url SHA-256 challenge. The verifier never leaves the desktop app.
 */
export async function createSdkworkDesktopPkcePair(): Promise<SdkworkDesktopPkcePair> {
  const codeVerifier = randomVerifier();
  const codeChallenge = await sha256Base64Url(codeVerifier);
  return { codeChallenge, codeVerifier };
}

/** Deterministic S256 challenge, exposed for tests and diagnostics. */
export async function computeSdkworkDesktopPkceChallenge(
  codeVerifier: string,
): Promise<string> {
  return sha256Base64Url(codeVerifier);
}

export function isValidPkceVerifierShape(codeVerifier: string): boolean {
  return (
    codeVerifier.length >= 43
    && codeVerifier.length <= 128
    && BASE64_URL_PATTERN.test(codeVerifier)
  );
}
