// SDKWORK-IAM-H5-BOOTSTRAP: authored application composition.
import { useEffect, type ReactElement, type ReactNode } from "react";

export interface AuthGateRoute {
  access: "protected" | "public";
  path: string;
}

export interface AuthGateProps {
  authenticated: boolean;
  children: ReactNode;
  guestOnlyPaths: readonly string[];
  loading: boolean;
  loadingLabel: string;
  loginPath: string;
  onRedirect: (path: string) => void;
  path: string;
  postLoginPath: string;
  routes: readonly AuthGateRoute[];
}

/**
 * Fail-closed route guard for the H5 root.
 *
 * Protected content is never rendered while bootstrap validation is pending or
 * while the active route is anonymous. Authentication-only screens redirect an
 * already authenticated visitor to the post-login landing route.
 */
export function AuthGate({
  authenticated,
  children,
  guestOnlyPaths,
  loading,
  loadingLabel,
  loginPath,
  onRedirect,
  path,
  postLoginPath,
  routes,
}: AuthGateProps): ReactElement {
  const activeRoute = routes.find((route) => route.path === path);
  const requiresLogin = !loading && activeRoute?.access === "protected" && !authenticated;
  const redirectAuthenticatedGuest = !loading
    && authenticated
    && guestOnlyPaths.includes(path);

  useEffect(() => {
    if (requiresLogin) onRedirect(loginPath);
    else if (redirectAuthenticatedGuest) onRedirect(postLoginPath);
  }, [onRedirect, postLoginPath, redirectAuthenticatedGuest, requiresLogin, loginPath]);

  if (loading || requiresLogin || redirectAuthenticatedGuest) {
    return (
      <div
        aria-live="polite"
        className="flex min-h-[100dvh] items-center justify-center bg-[var(--iam-h5-auth-bg)] px-8 text-center text-[14px] text-[var(--iam-h5-auth-text-sub)]"
        data-auth-gate-state={loading ? "loading" : "redirecting"}
        role="status"
      >
        {loadingLabel}
      </div>
    );
  }

  return <div data-authenticated={authenticated ? "true" : "false"}>{children}</div>;
}
