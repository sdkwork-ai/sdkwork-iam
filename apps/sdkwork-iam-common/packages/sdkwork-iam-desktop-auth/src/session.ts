import { SdkworkDesktopAuthError } from "./errors.ts";
import type { SdkworkDesktopAuthSession } from "./types.ts";

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Fails closed unless the redeem leg returned a real dual-token session.
 * Partial, token-less, or user-only payloads never authenticate the desktop
 * app (`IAM_LOGIN_INTEGRATION_SPEC.md` session validation rules).
 */
export function normalizeSdkworkDesktopAuthSession(raw: unknown): SdkworkDesktopAuthSession {
  if (raw === null || typeof raw !== "object") {
    throw new SdkworkDesktopAuthError(
      "invalid-session",
      "Desktop session exchange returned no session payload.",
    );
  }
  const record = raw as Record<string, unknown>;
  const authToken = readString(record.authToken);
  const accessToken = readString(record.accessToken);
  if (!authToken || !accessToken) {
    throw new SdkworkDesktopAuthError(
      "invalid-session",
      "Desktop session exchange returned an incomplete session without dual tokens.",
    );
  }

  const refreshToken = readString(record.refreshToken);
  const sessionId = readString(record.sessionId);
  const user = record.user !== undefined
    ? (record.user as Record<string, unknown> | null)
    : null;
  const context = record.context !== undefined
    ? (record.context as Record<string, unknown> | null)
    : null;

  return {
    accessToken,
    authToken,
    ...(context ? { context } : {}),
    ...(refreshToken ? { refreshToken } : {}),
    ...(sessionId ? { sessionId } : {}),
    ...(user ? { user } : {}),
  };
}
