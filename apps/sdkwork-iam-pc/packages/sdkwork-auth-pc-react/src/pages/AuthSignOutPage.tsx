import {
  useEffect,
  useRef,
  useState,
} from "react";
import { ArrowRight, LoaderCircle, LogOut, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@sdkwork/ui-pc-react";
import {
  createSdkworkAuthDarkHeaderStyle,
  createSdkworkAuthLightShellStyle,
  SDKWORK_AUTH_SURFACE_THEME_STYLE,
  mergeSdkworkAuthClassNames,
  mergeSdkworkAuthStyles,
  resolveSdkworkAuthAppearance,
  type SdkworkAuthAppearanceConfig,
} from "../auth-appearance.ts";
import { useSdkworkAuthIntl } from "../auth-intl.tsx";
import {
  resolveSdkworkAuthBrandLogoUrl,
  resolveSdkworkAuthBrandMark,
  resolveSdkworkAuthBrandName,
  type SdkworkAuthBrand,
} from "../auth-brand.ts";
import { createAuthRouteCatalog } from "../auth.ts";
import {
  useSdkworkAuthController,
  useSdkworkAuthControllerState,
  type SdkworkAuthController,
} from "../auth-controller.ts";
import type { SdkworkAuthPageRouterContextMode } from "./routerContextBoundary.tsx";
import { SdkworkAuthPageRouterContextBoundary } from "./routerContextBoundary.tsx";

export interface SdkworkAuthSignOutPageProps {
  appearance?: SdkworkAuthAppearanceConfig;
  basePath?: string;
  /**
   * Product brand configured by the host application. The shared page falls
   * back to the SDKWork identity when the host supplies none.
   */
  brand?: SdkworkAuthBrand;
  controller?: SdkworkAuthController;
  /**
   * Where "back to the product" goes once the session has ended. Defaults to
   * `/dashboard`, matching the other hosted auth pages.
   */
  homePath?: string;
  routerContextMode?: SdkworkAuthPageRouterContextMode;
}

type SdkworkAuthSignOutPhase = "working" | "signed-out";

function resolveLoginRoutePath(basePath: string): string {
  return createAuthRouteCatalog(basePath).find((route) => route.id === "login")?.path
    ?? "/auth/login";
}

/**
 * Hosted sign-out page.
 *
 * The page is the URL a product opens in the system browser to end the account
 * session the IAM server issued — a desktop shell's "sign out" hands the flow
 * here so the browser (and every SDKWork surface sharing that session) ends it
 * as well, instead of only clearing the calling application's local copy.
 *
 * It ends the session once on mount when one is present, then reports the
 * outcome. The remote revoke is best-effort: `signOut()` clears the local
 * controller state in its own `finally` path, so an unreachable gateway still
 * leaves the visitor signed out here.
 */
function SdkworkAuthSignOutPageContent({
  appearance,
  basePath = "/auth",
  brand,
  controller: providedController,
  homePath = "/dashboard",
}: SdkworkAuthSignOutPageProps) {
  const { copy } = useSdkworkAuthIntl();
  const brandName = resolveSdkworkAuthBrandName(brand);
  const brandLogoUrl = resolveSdkworkAuthBrandLogoUrl(brand);
  const resolvedAppearance = resolveSdkworkAuthAppearance(appearance);
  const controller = useSdkworkAuthController(providedController);
  const authState = useSdkworkAuthControllerState(controller);
  const navigate = useNavigate();
  const loginRoute = resolveLoginRoutePath(basePath);
  const [phase, setPhase] = useState<SdkworkAuthSignOutPhase>("working");
  // One sign-out per mount: the phase change re-renders, and a second remote
  // revoke would fire against a session that is already gone.
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (phase !== "working" || attemptedRef.current) {
      return;
    }
    if (!authState.isBootstrapped) {
      // The session is read first: an anonymous visitor is already signed out,
      // and a failed read must not be reported as a successful sign-out.
      void controller.bootstrap().catch(() => {
        // An unreachable account endpoint leaves the state as it was; the
        // local sign-out below still runs.
      });
      return;
    }
    attemptedRef.current = true;
    if (!authState.isAuthenticated) {
      setPhase("signed-out");
      return;
    }
    void controller.signOut()
      .catch(() => {
        // `signOut()` clears the local session in its own `finally` path, so a
        // rejected remote revoke still ends the session on this page.
      })
      .finally(() => {
        setPhase("signed-out");
      });
  }, [authState.isAuthenticated, authState.isBootstrapped, controller, phase]);

  return (
    <div
      className={mergeSdkworkAuthClassNames(
        "sdkwork-auth-surface relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden bg-zinc-100 p-4 dark:bg-zinc-950 sm:p-8",
        resolvedAppearance?.pageClassName,
      )}
      style={resolvedAppearance?.pageStyle}
    >
      <style>{SDKWORK_AUTH_SURFACE_THEME_STYLE}</style>
      <header className="relative z-20 mx-auto flex w-full max-w-lg shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-bold tracking-tight text-zinc-600 dark:text-zinc-300">
          {brandLogoUrl ? (
            <img
              alt=""
              className="h-7 w-auto max-w-[6rem] shrink-0 rounded-lg object-contain"
              data-testid="sdkwork-auth-brand-logo"
              src={brandLogoUrl}
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-[10px] font-black tracking-wide text-white dark:bg-white dark:text-zinc-950"
              data-testid="sdkwork-auth-brand-mark"
            >
              {resolveSdkworkAuthBrandMark(brandName)}
            </span>
          )}
          <span className="truncate" data-testid="sdkwork-auth-brand-name">
            {brandName}
          </span>
        </div>
      </header>
      <div
        className={mergeSdkworkAuthClassNames(
          "sdkwork-auth-sign-out-shell relative z-10 mx-auto my-auto w-full max-w-lg overflow-hidden rounded-3xl bg-white/92 shadow-2xl dark:bg-zinc-900/92",
          resolvedAppearance?.callbackShellClassName,
        )}
        style={mergeSdkworkAuthStyles(
          createSdkworkAuthLightShellStyle(),
          resolvedAppearance?.callbackShellStyle,
        )}
      >
        <div
          className={mergeSdkworkAuthClassNames(
            "border-b border-zinc-200/80 bg-zinc-950 px-8 py-6 text-white dark:border-zinc-800",
            resolvedAppearance?.callbackHeaderClassName,
          )}
          style={mergeSdkworkAuthStyles(
            createSdkworkAuthDarkHeaderStyle(),
            resolvedAppearance?.callbackHeaderStyle,
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600/90">
              <LogOut className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-200">
                {copy.signOut.badge}
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight">
                {phase === "working" ? copy.signOut.workingTitle : copy.signOut.title}
              </h1>
            </div>
          </div>
        </div>
        <div className="space-y-6 px-8 py-8">
          {phase === "working" ? (
            <div className="flex items-center gap-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              <span role="status">{copy.signOut.signingOut}</span>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <p role="status">{copy.signOut.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  className="gap-2"
                  onClick={() => {
                    navigate(loginRoute, { replace: true });
                  }}
                >
                  {copy.signOut.backToLogin}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigate(homePath, { replace: true });
                  }}
                >
                  {copy.signOut.backToHome}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Render the hosted sign-out page.
 *
 * The router context boundary lets the page run both inside the host's router
 * (the shipped application mounting the auth routes) and in a standalone test
 * or preview composition without one.
 * @param props - appearance, brand, controller and navigation options.
 * @returns the sign-out page element tree.
 */
export function SdkworkAuthSignOutPage({
  routerContextMode = "auto",
  ...props
}: SdkworkAuthSignOutPageProps) {
  return (
    <SdkworkAuthPageRouterContextBoundary mode={routerContextMode}>
      <SdkworkAuthSignOutPageContent
        {...props}
        routerContextMode="external"
      />
    </SdkworkAuthPageRouterContextBoundary>
  );
}
