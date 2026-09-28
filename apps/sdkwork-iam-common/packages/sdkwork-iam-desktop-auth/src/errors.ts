/**
 * Typed errors for the desktop browser-login flow. Renderer and host code
 * branch on `code`, never on message text.
 */
export type SdkworkDesktopAuthErrorCode =
  | "browser-open-failed"
  | "exchange-failed"
  | "exchange-unavailable"
  | "flow-expired"
  | "host-unavailable"
  | "invalid-callback"
  | "invalid-session"
  | "no-pending-flow"
  | "provider-denied"
  | "state-mismatch";

const SDKWORK_DESKTOP_AUTH_ERROR_PREFIX = "SdkworkDesktopAuthError";

export class SdkworkDesktopAuthError extends Error {
  readonly code: SdkworkDesktopAuthErrorCode;
  readonly detail?: string;

  constructor(code: SdkworkDesktopAuthErrorCode, message: string, detail?: string) {
    super(`[${SDKWORK_DESKTOP_AUTH_ERROR_PREFIX}:${code}] ${message}`);
    this.name = SDKWORK_DESKTOP_AUTH_ERROR_PREFIX;
    this.code = code;
    if (detail !== undefined) {
      this.detail = detail;
    }
  }
}

export function isSdkworkDesktopAuthError(error: unknown): error is SdkworkDesktopAuthError {
  return error instanceof SdkworkDesktopAuthError;
}
