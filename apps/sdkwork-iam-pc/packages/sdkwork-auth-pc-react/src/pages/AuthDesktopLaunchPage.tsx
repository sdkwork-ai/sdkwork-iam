import {
  useEffect,
  useRef,
  useState,
} from "react";
import { ArrowRight, ExternalLink, MonitorSmartphone } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { createAuthRouteCatalog } from "../auth.ts";
import { SdkworkAuthPageRouterContextBoundary } from "./routerContextBoundary.tsx";

export interface SdkworkAuthDesktopLaunchPageProps {
  appearance?: SdkworkAuthAppearanceConfig;
  basePath?: string;
  /**
   * Hands the deep-link redirect URL to the operating system. Defaults to a
   * `window.location.assign` navigation; hosts with their own launcher
   * (for example a custom shell bridge) may inject it.
   */
  onLaunch?: (redirectUrl: string) => void;
  routerContextMode?: "auto" | "external";
}

type SdkworkDesktopLaunchPhase = "launching" | "launched" | "failed";

const AUTO_LAUNCH_DELAY_MS = 400;

function defaultLaunchSdkworkDesktopRedirect(redirectUrl: string): void {
  window.location.assign(redirectUrl);
}

function resolveLoginRoutePath(basePath: string): string {
  return createAuthRouteCatalog(basePath).find((route) => route.id === "login")?.path
    ?? "/auth/login";
}

/**
 * Hosted login-success page for desktop-originated authorizations
 * (Electron/Tauri). After the browser completes login / registration /
 * password reset and the authorization is granted, the flow lands here with
 * the deep-link redirect URL and hands it to the operating system so the
 * desktop app opens and finishes its own login.
 *
 * The redirect URL carries a single-use authorization code: it is transported
 * through the hand-off only and is never logged or rendered.
 */
function SdkworkAuthDesktopLaunchPageContent({
  appearance,
  basePath = "/auth",
  onLaunch = defaultLaunchSdkworkDesktopRedirect,
}: SdkworkAuthDesktopLaunchPageProps) {
  const { copy } = useSdkworkAuthIntl();
  const resolvedAppearance = resolveSdkworkAuthAppearance(appearance);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get("redirectUrl")?.trim() ?? "";
  const loginRoute = resolveLoginRoutePath(basePath);
  const [phase, setPhase] = useState<SdkworkDesktopLaunchPhase>(
    redirectUrl ? "launching" : "failed",
  );
  const launchAttemptedRef = useRef(false);

  useEffect(() => {
    if (!redirectUrl || launchAttemptedRef.current) {
      return undefined;
    }
    launchAttemptedRef.current = true;
    const timer = globalThis.setTimeout(() => {
      try {
        onLaunch(redirectUrl);
        setPhase("launched");
      } catch {
        setPhase("failed");
      }
    }, AUTO_LAUNCH_DELAY_MS);
    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [onLaunch, redirectUrl]);

  const handleOpenApp = () => {
    if (!redirectUrl) {
      return;
    }
    try {
      onLaunch(redirectUrl);
      setPhase("launched");
    } catch {
      setPhase("failed");
    }
  };

  return (
    <div
      className={mergeSdkworkAuthClassNames(
        "sdkwork-auth-surface relative flex h-[100dvh] min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-zinc-100 p-4 dark:bg-zinc-950 sm:p-8",
        resolvedAppearance?.pageClassName,
      )}
      style={resolvedAppearance?.pageStyle}
    >
      <style>{SDKWORK_AUTH_SURFACE_THEME_STYLE}</style>
      <div
        className={mergeSdkworkAuthClassNames(
          "sdkwork-auth-desktop-launch-shell relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-white/92 shadow-2xl dark:bg-zinc-900/92",
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
              <MonitorSmartphone className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-200">
                {copy.desktop.launchBadge}
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight">
                {copy.desktop.launchTitle}
              </h1>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-8 py-8">
          {redirectUrl ? (
            <>
              <p
                className="text-sm leading-7 text-zinc-600 dark:text-zinc-300"
                data-testid="sdkwork-desktop-launch-description"
              >
                {copy.desktop.launchDescription}
              </p>
              <Button
                className="h-auto w-full py-3 font-bold"
                data-testid="sdkwork-desktop-launch-open-app"
                onClick={handleOpenApp}
                type="button"
              >
                {copy.desktop.openApp}
                <ExternalLink className="h-4 w-4" />
              </Button>
              <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
                {phase === "failed" ? copy.desktop.launchFailed : copy.desktop.openAppRetryHint}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                {copy.desktop.missingRedirect}
              </p>
            </>
          )}
          <Button
            className="h-auto w-full border border-zinc-200 bg-transparent py-3 font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
            onClick={() => navigate(loginRoute, { replace: true })}
            type="button"
            variant="outline"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            {copy.common.backToLogin}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SdkworkAuthDesktopLaunchPage({
  routerContextMode = "auto",
  ...props
}: SdkworkAuthDesktopLaunchPageProps) {
  return (
    <SdkworkAuthPageRouterContextBoundary mode={routerContextMode}>
      <SdkworkAuthDesktopLaunchPageContent {...props} />
    </SdkworkAuthPageRouterContextBoundary>
  );
}
