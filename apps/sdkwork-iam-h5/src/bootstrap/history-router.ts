// SDKWORK-IAM-H5-BOOTSTRAP: authored history router.
/**
 * Minimal history router for the H5 application root.
 *
 * The root owns routing (the shell stays router-agnostic). A full router package
 * is deliberately not a dependency of this app root: the surface needs exactly
 * three things — read the current path, push a path, react to the back button —
 * and the host that embeds this client (browser or Capacitor) supplies the
 * history object either way.
 */

import { useCallback, useEffect, useState } from "react";

/**
 * Normalize a pathname for comparison and matching.
 * @param pathname - raw path, with or without query, hash or trailing slash.
 * @returns the canonical path.
 */
export function normalizeIamH5Path(pathname: string): string {
  const withoutQuery = pathname.split(/[?#]/u, 1)[0] ?? "/";
  const compact = `/${withoutQuery.replace(/^\/+/u, "")}`.replace(/\/{2,}/gu, "/");
  return compact.length > 1 ? compact.replace(/\/+$/u, "") : "/";
}

/** Current path and the two navigation actions. */
export interface IamH5HistoryRoute {
  /** Canonical current path. */
  readonly path: string;
  /** Push a new entry (forward navigation). */
  readonly navigate: (path: string) => void;
  /** Replace the current entry (redirects, post-login landing). */
  readonly replace: (path: string) => void;
}

/**
 * Bind the browser history to React state.
 * @param options - initial path used when the document has no location (tests, SSR).
 * @returns the route binding.
 */
export function useIamH5HistoryRoute(options: { initialPath?: string } = {}): IamH5HistoryRoute {
  const readPath = useCallback((): string => {
    if (typeof window === "undefined") return normalizeIamH5Path(options.initialPath ?? "/");
    return normalizeIamH5Path(window.location.pathname);
  }, [options.initialPath]);

  const [path, setPath] = useState<string>(readPath);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onPopState = () => setPath(readPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [readPath]);

  const navigate = useCallback((next: string) => {
    const target = normalizeIamH5Path(next);
    if (typeof window !== "undefined") {
      if (target === normalizeIamH5Path(window.location.pathname)) return;
      window.history.pushState(null, "", target);
    }
    setPath(target);
  }, []);

  const replace = useCallback((next: string) => {
    const target = normalizeIamH5Path(next);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", target);
    }
    setPath(target);
  }, []);

  return { navigate, path, replace };
}
