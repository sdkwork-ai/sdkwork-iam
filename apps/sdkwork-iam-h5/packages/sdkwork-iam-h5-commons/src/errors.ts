/**
 * Error presentation for the IAM H5 kit.
 *
 * The HTTP contracts answer failures as `application/problem+json`
 * (`ProblemDetail`), and the generated SDKs rethrow them as objects rather than
 * `Error` instances. A screen that only reads `error.message` therefore renders
 * "undefined" for every server refusal. This module is the single place that
 * turns whatever was thrown into a message a person can read, without leaking a
 * stack trace or an internal field name into the interface.
 */

/** A failure shape the API contract guarantees, in the parts a screen may show. */
export interface SdkworkIamH5ProblemLike {
  readonly code?: number | string;
  readonly detail?: string;
  readonly i18nKey?: string;
  readonly message?: string;
  readonly title?: string;
}

/** What a screen renders for a failed operation. */
export interface SdkworkIamH5ErrorInfo {
  /** Numeric or symbolic problem code, when the failure carried one. */
  readonly code?: string;
  /** Human-readable message. Never empty. */
  readonly message: string;
  /** Stable key a host may translate instead of rendering `message`. */
  readonly i18nKey?: string;
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Describe a thrown value for display.
 * @param error - anything a promise rejected with.
 * @param fallback - message used when the value carries no readable text.
 * @returns the presentation shape.
 */
export function describeSdkworkIamH5Error(
  error: unknown,
  fallback = "The request could not be completed.",
): SdkworkIamH5ErrorInfo {
  if (error === null || error === undefined) return { message: fallback };
  if (typeof error === "string") {
    return { message: readString(error) ?? fallback };
  }
  if (error instanceof Error) {
    const code = readString((error as { code?: unknown }).code);
    return {
      ...(code ? { code } : {}),
      message: readString(error.message) ?? fallback,
    };
  }
  if (typeof error === "object") {
    const problem = error as SdkworkIamH5ProblemLike & {
      error?: unknown;
      statusText?: unknown;
    };
    const message =
      readString(problem.message) ??
      readString(problem.detail) ??
      readString(problem.title) ??
      readString(problem.error) ??
      readString(problem.statusText) ??
      fallback;
    const rawCode = problem.code;
    const code =
      typeof rawCode === "number" && Number.isFinite(rawCode)
        ? String(rawCode)
        : readString(rawCode);
    const i18nKey = readString(problem.i18nKey);
    return {
      ...(code ? { code } : {}),
      ...(i18nKey ? { i18nKey } : {}),
      message,
    };
  }
  return { message: fallback };
}
