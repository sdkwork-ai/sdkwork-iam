/**
 * Hosted sign-out contract.
 *
 * The sign-out page is served by this package below whichever auth base path
 * the host application mounts it at (`/auth` by convention). Hosts that open
 * the page from another process — a desktop shell ending its own session, a
 * marketing that links "sign out everywhere" — build the URL through these
 * helpers instead of carrying their own copy of the path, so the producer and
 * the consumer cannot drift apart.
 */

/** Route segment of the hosted sign-out page below the auth base path. */
export const SDKWORK_AUTH_SIGN_OUT_SEGMENT = "sign-out";

/**
 * Normalize a host-supplied auth base path: no trailing slash, empty means the
 * conventional `/auth`, and a relative value is anchored at the root.
 * @param basePath - the auth base path the host mounts the routes at.
 * @returns the normalized base path.
 */
export function normalizeSdkworkAuthSignOutBasePath(
  basePath?: string | null,
): string {
  const trimmed = (basePath ?? "").trim().replace(/\/+$/u, "");
  if (trimmed === "") {
    return "/auth";
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * Path of the hosted sign-out page inside one auth base path.
 * @param basePath - the auth base path the host mounts the routes at.
 * @returns the sign-out path, e.g. `/auth/sign-out`.
 */
export function buildSdkworkAuthSignOutPath(basePath = "/auth"): string {
  return `${normalizeSdkworkAuthSignOutBasePath(basePath)}/${SDKWORK_AUTH_SIGN_OUT_SEGMENT}`;
}

/** Identity of one hosted sign-out URL. */
export interface BuildSdkworkAuthSignOutUrlOptions {
  /** Product origin serving the auth routes, e.g. `https://router.sdkwork.com`. */
  baseUrl: string;
  /** Auth base path the host mounts the routes at; defaults to `/auth`. */
  basePath?: string;
}

/**
 * Absolute URL of the hosted sign-out page on one product origin.
 * @param options - product origin and auth base path.
 * @returns the absolute sign-out URL.
 */
export function buildSdkworkAuthSignOutUrl({
  baseUrl,
  basePath,
}: BuildSdkworkAuthSignOutUrlOptions): string {
  const origin = baseUrl.trim().replace(/\/+$/u, "");
  return `${origin}${buildSdkworkAuthSignOutPath(basePath)}`;
}

/**
 * Whether a browser pathname addresses the hosted sign-out page.
 * @param pathname - the browser pathname.
 * @param basePath - the auth base path the host mounts the routes at.
 * @returns true for the sign-out page (and its sub-paths).
 */
export function isSdkworkAuthSignOutPath(
  pathname: string,
  basePath = "/auth",
): boolean {
  const path = buildSdkworkAuthSignOutPath(basePath);
  const normalized = pathname.length > 1
    ? pathname.replace(/\/+$/u, "")
    : pathname;
  return normalized === path || normalized.startsWith(`${path}/`);
}
