/**
 * Same-origin transfer for the desktop deep-link redirect URL.
 *
 * The URL carries a single-use authorization code. Passing it through the
 * `/auth/desktop/launch?redirectUrl=...` query string would put that code in
 * the browser history, the address bar, and potentially in a `Referer` header
 * or an access log. The writer stores it in `sessionStorage` and the launch
 * page consumes it instead; the query-string form stays readable for links
 * that were already issued, and the page strips it from the visible URL.
 */

const DESKTOP_LAUNCH_REDIRECT_STORAGE_KEY = "sdkwork.auth.desktopLaunchRedirect.v1";

function sessionStore(): Storage | undefined {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
}

/**
 * Store the deep-link redirect URL for the next launch-page navigation.
 * @param redirectUrl - the validated native-app callback URL.
 * @returns true when the value was stored; false when storage is unavailable
 *   or the value is empty (the caller then falls back to the query form).
 */
export function storeSdkworkDesktopLaunchRedirect(redirectUrl: string): boolean {
  const value = redirectUrl.trim();
  if (value === "") {
    return false;
  }
  try {
    const store = sessionStore();
    if (store === undefined) {
      return false;
    }
    store.setItem(DESKTOP_LAUNCH_REDIRECT_STORAGE_KEY, value);
    return true;
  } catch {
    // Storage can be unavailable (private mode, disabled cookies); the
    // caller falls back to the query-string hand-off.
    return false;
  }
}

/**
 * Read the stored redirect URL without consuming it.
 * @returns the stored URL, or undefined when none exists.
 */
export function readSdkworkDesktopLaunchRedirect(): string | undefined {
  try {
    const value = sessionStore()?.getItem(DESKTOP_LAUNCH_REDIRECT_STORAGE_KEY)?.trim();
    return value === undefined || value === "" ? undefined : value;
  } catch {
    return undefined;
  }
}

/** Remove the stored redirect URL after the launch page has adopted it. */
export function clearSdkworkDesktopLaunchRedirect(): void {
  try {
    sessionStore()?.removeItem(DESKTOP_LAUNCH_REDIRECT_STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
