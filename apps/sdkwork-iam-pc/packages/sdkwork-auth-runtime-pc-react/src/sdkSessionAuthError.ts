export const SDKWORK_SESSION_AUTH_ERROR_CODES = new Set([
  "401",
  "4010",
  "40103",
  "UNAUTHORIZED",
  "TOKEN_EXPIRED",
  "TOKEN_INVALID",
]);

/**
 * Retired: free-text session-auth message matching.
 *
 * Classification is structural only (HTTP 401, `code`, or `businessCode`).
 * Matching on message prose logged operators out on unrelated failures: a 404
 * or 403 whose detail merely contained a phrase like "invalid token" — for
 * example an absent route, a missing permission, or a dependency backend that
 * echoes a token-shaped business key — was treated as an expired session, which
 * clears the stored session and navigates to the login page. The table stays
 * exported (empty) so downstream imports and declarations keep resolving; it is
 * never consulted.
 */
export const SDKWORK_SESSION_AUTH_ERROR_MESSAGES: readonly string[] = [];

function isErrorRecord(error: unknown): error is Record<string, unknown> {
  return typeof error === "object" && error !== null && !Array.isArray(error);
}

function readStringField(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return undefined;
}

function normalizeSdkErrorCode(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return typeof value === "string" ? value.trim() : "";
}

function readSdkErrorField(error: unknown, key: string): unknown {
  if (!isErrorRecord(error)) {
    return undefined;
  }
  return error[key];
}

export function readSdkworkSessionAuthErrorCode(error: unknown): string {
  return normalizeSdkErrorCode(readSdkErrorField(error, "code"));
}

export function readSdkworkSessionAuthBusinessCode(error: unknown): string {
  return normalizeSdkErrorCode(readSdkErrorField(error, "businessCode"));
}

export function readSdkworkSessionAuthErrorHttpStatus(error: unknown): number | undefined {
  const value = readSdkErrorField(error, "httpStatus")
    ?? readSdkErrorField(error, "status");
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isInteger(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function readSdkworkSessionAuthErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  const value = readSdkErrorField(error, "message")
    ?? readSdkErrorField(error, "msg")
    ?? readSdkErrorField(error, "detail")
    ?? readSdkErrorField(error, "title");
  return typeof value === "string" ? value : "";
}

export function isSdkworkSdkSessionAuthError(error: unknown): boolean {
  const httpStatus = readSdkworkSessionAuthErrorHttpStatus(error);
  // An explicit non-401 HTTP status is never a session-auth failure, whatever
  // the error code or message says. This keeps a business rejection (a 400/403/
  // 404/5xx that happens to carry an auth-looking code or detail) from clearing
  // the operator's session.
  if (httpStatus !== undefined && httpStatus !== 401) {
    return false;
  }
  if (httpStatus === 401) {
    return true;
  }

  const code = readSdkworkSessionAuthErrorCode(error);
  if (code && SDKWORK_SESSION_AUTH_ERROR_CODES.has(code.toUpperCase())) {
    return true;
  }
  const businessCode = readSdkworkSessionAuthBusinessCode(error);
  return Boolean(
    businessCode && SDKWORK_SESSION_AUTH_ERROR_CODES.has(businessCode.toUpperCase()),
  );
}

export function formatSdkworkSessionAuthUnauthorizedDetail(
  error: unknown,
  context: { path?: string } = {},
) {
  const record = isErrorRecord(error) ? error : {};
  const httpStatus = readSdkworkSessionAuthErrorHttpStatus(error);
  const code = readStringField(record, "code");
  const businessCode = readStringField(record, "businessCode");
  const message =
    readStringField(record, "message")
    ?? readStringField(record, "msg")
    ?? readStringField(record, "detail")
    ?? readStringField(record, "title")
    ?? (error instanceof Error ? error.message : undefined)
    ?? "Session authentication failed";

  return {
    businessCode,
    code,
    httpStatus,
    message,
    occurredAt: new Date().toISOString(),
    path: context.path,
    raw: error,
  };
}
