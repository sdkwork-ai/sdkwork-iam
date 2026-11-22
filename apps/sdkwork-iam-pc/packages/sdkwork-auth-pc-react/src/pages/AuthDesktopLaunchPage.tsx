import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowRight, Check, ExternalLink } from "lucide-react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@sdkwork/ui-pc-react";
import {
  clearSdkworkDesktopLaunchRedirect,
  readSdkworkDesktopLaunchRedirect,
} from "../desktop-launch-handoff.ts";
import {
  useSdkworkAuthController,
  useSdkworkAuthControllerState,
  type SdkworkAuthController,
} from "../auth-controller.ts";
import type { SdkworkAuthLoginFollowQr } from "../auth-service.ts";
import { formatSdkworkAuthTemplate } from "../auth-copy.ts";
import { SdkworkAuthSurfaceHeader } from "../components/auth-surface-header.tsx";
import {
  createSdkworkAuthLightShellStyle,
  SDKWORK_AUTH_SURFACE_THEME_STYLE,
  mergeSdkworkAuthClassNames,
  mergeSdkworkAuthStyles,
  resolveSdkworkAuthAppearance,
  type SdkworkAuthAppearanceConfig,
} from "../auth-appearance.ts";
import { useSdkworkAuthIntl } from "../auth-intl.tsx";
import {
  resolveSdkworkAuthBrandName,
  type SdkworkAuthBrand,
} from "../auth-brand.ts";
import { createAuthRouteCatalog } from "../auth.ts";
import { isSafeSdkworkDesktopLaunchUrl } from "../auth-redirect.ts";
import { SdkworkAuthPageRouterContextBoundary } from "./routerContextBoundary.tsx";

export interface SdkworkAuthDesktopLaunchPageProps {
  appearance?: SdkworkAuthAppearanceConfig;
  basePath?: string;
  /**
   * Product brand configured by the host application's admin surface. The
   * shared page renders the IAM identity when the host supplies none.
   */
  brand?: SdkworkAuthBrand;
  /** Host-rendered brand lockup; matches the product's own navigation. */
  brandHeader?: ReactNode;
  controller?: SdkworkAuthController;
  /**
   * Hands the deep-link redirect URL to the operating system. Defaults to a
   * `window.location.assign` navigation; hosts with their own launcher
   * (for example a custom shell bridge) may inject it.
   */
  onLaunch?: (redirectUrl: string) => void;
  routerContextMode?: "auto" | "external";
}

type SdkworkDesktopLaunchPhase = "launching" | "launched" | "failed";

/**
 * How long the login-success page stays on screen before the deep link fires.
 *
 * The page exists so the visitor sees that the sign-in worked, and it carries
 * the follow QR and the manual hand-off. A near-instant hand-off (the previous
 * 400 ms) replaced that page before it could be read, which looked like the app
 * opening the moment the sign-in button was pressed; two seconds keep the
 * success step visible while the deep link still opens by itself.
 */
const AUTO_LAUNCH_DELAY_MS = 2000;

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
  brand,
  brandHeader,
  controller: providedController,
  onLaunch = defaultLaunchSdkworkDesktopRedirect,
}: SdkworkAuthDesktopLaunchPageProps) {
  const { copy } = useSdkworkAuthIntl();
  const brandName = resolveSdkworkAuthBrandName(brand);
  const controller = useSdkworkAuthController(providedController);
  const authState = useSdkworkAuthControllerState(controller);
  const resolvedAppearance = resolveSdkworkAuthAppearance(appearance);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Prefer the same-origin transfer written by the auth page. The query form
  // remains readable for already-issued links, but it is stripped from the
  // visible URL as soon as the page has adopted it; either way the single-use
  // code is never left in the address bar or history for the new flow.
  const [requestedRedirectUrl] = useState(() => {
    const transferred = readSdkworkDesktopLaunchRedirect();
    if (transferred !== undefined) {
      return transferred;
    }
    return searchParams.get("redirectUrl")?.trim() ?? "";
  });
  // The requested URL is attacker-influenced: only a native-app hand-off
  // surface (custom scheme or loopback) may be auto-navigated to, otherwise
  // this page would be an open redirect.
  const redirectUrl = isSafeSdkworkDesktopLaunchUrl(requestedRedirectUrl)
    ? requestedRedirectUrl
    : "";
  const loginRoute = resolveLoginRoutePath(basePath);
  const [phase, setPhase] = useState<SdkworkDesktopLaunchPhase>(
    redirectUrl ? "launching" : "failed",
  );
  const launchAttemptedRef = useRef(false);
  const bootstrapAttemptedRef = useRef(false);
  const [signingOut, setSigningOut] = useState(false);
  // Operator-published follow QR for this tenant. Optional decoration: the
  // hand-off renders the moment the page mounts, and the QR joins it when (and
  // if) the public read answers.
  const [followQr, setFollowQr] = useState<SdkworkAuthLoginFollowQr | null>(null);

  useEffect(() => {
    let disposed = false;
    void controller.getLoginFollowQr()
      .then((qr) => {
        if (!disposed) {
          setFollowQr(qr);
        }
      })
      .catch(() => {
        // A missing/failed QR read never fails the login-success page.
      });
    return () => {
      disposed = true;
    };
  }, [controller]);

  // The header can only name the account when the session is hydrated, but the
  // success hand-off must render immediately: bootstrap runs once in the
  // background instead of gating the page. A controller that already holds the
  // session a login just created is left alone — re-retrieving it would let a
  // transient read failure clear that brand-new session.
  useEffect(() => {
    if (
      bootstrapAttemptedRef.current
      || authState.isBootstrapped
      || authState.isAuthenticated
    ) {
      return;
    }
    bootstrapAttemptedRef.current = true;
    void controller.bootstrap().catch(() => {
      // An anonymous or expired session simply leaves the header without an
      // account chip; the hand-off itself does not depend on it.
    });
  }, [authState.isAuthenticated, authState.isBootstrapped, controller]);

  useEffect(() => {
    clearSdkworkDesktopLaunchRedirect();
    if (searchParams.has("redirectUrl")) {
      navigate(
        { pathname: location.pathname, search: "" },
        { replace: true },
      );
    }
  }, [location.pathname, navigate, searchParams]);

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

  const handleSignOut = async () => {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    try {
      await controller.signOut();
    } catch {
      // `signOut()` clears the local controller state in its own finally path,
      // so a rejected remote revoke still signs this page out.
    } finally {
      setSigningOut(false);
      navigate(loginRoute, { replace: true });
    }
  };

  return (
    <div
      className={mergeSdkworkAuthClassNames(
        "sdkwork-auth-surface relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden bg-zinc-100 p-4 dark:bg-zinc-950 sm:p-8",
        resolvedAppearance?.pageClassName,
      )}
      style={resolvedAppearance?.pageStyle}
    >
      <style>{SDKWORK_AUTH_SURFACE_THEME_STYLE}</style>
      <div className="relative z-20 mx-auto w-full max-w-lg shrink-0">
        <SdkworkAuthSurfaceHeader
          account={authState.isAuthenticated && authState.user
            ? {
              displayName: authState.user.displayName,
              email: authState.user.email,
              initials: authState.user.initials,
              menuLabel: copy.account.menuLabel,
              onSignOut: () => { void handleSignOut() },
              signedInLabel: copy.account.signedInAs,
              signOutLabel: signingOut ? copy.account.signingOut : copy.account.signOut,
              signingOut,
            }
            : undefined}
          brand={brand}
          brandNode={brandHeader}
        />
      </div>
      <div
        className={mergeSdkworkAuthClassNames(
          "sdkwork-auth-desktop-launch-shell relative z-10 mx-auto my-auto w-full max-w-lg overflow-hidden rounded-3xl bg-white/92 shadow-2xl dark:bg-zinc-900/92",
          resolvedAppearance?.callbackShellClassName,
        )}
        style={mergeSdkworkAuthStyles(
          createSdkworkAuthLightShellStyle(),
          resolvedAppearance?.callbackShellStyle,
        )}
      >
        <div
          className={mergeSdkworkAuthClassNames(
            "flex flex-col items-center px-8 pt-10 pb-8 text-center",
            resolvedAppearance?.callbackHeaderClassName,
          )}
          style={resolvedAppearance?.callbackHeaderStyle}
        >
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"
            data-testid="sdkwork-desktop-launch-success"
          >
            <Check className="h-6 w-6" strokeWidth={3} />
          </span>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {copy.desktop.launchTitle}
          </h1>
          <p
            className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400"
            data-testid="sdkwork-desktop-launch-description"
          >
            {formatSdkworkAuthTemplate(copy.desktop.continueInApp, { brand: brandName })}
          </p>
        </div>

        <div className="space-y-5 px-8 pb-8">
          {followQr ? (
            <figure className="flex flex-col items-center gap-3">
              <img
                alt={copy.desktop.followQrAlt}
                className="h-44 w-44 rounded-2xl border border-zinc-200 bg-white object-contain p-2 dark:border-zinc-800"
                data-testid="sdkwork-desktop-launch-follow-qr"
                src={followQr.qrCode}
              />
              <figcaption className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                {copy.desktop.followQrCaption}
              </figcaption>
            </figure>
          ) : null}
          {redirectUrl ? (
            <>
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
              {/* A plain anchor is the hand-off of last resort: browsers that
                  refuse a scripted navigation to a custom scheme still follow
                  a user-activated link. Its text stays a label, never the URL,
                  so the one-time authorization code is not rendered. */}
              <a
                className="block w-full rounded-xl border border-zinc-200 bg-transparent px-4 py-2.5 text-center text-sm font-semibold text-zinc-700 transition-colors hover:border-primary-300 hover:text-primary-600 dark:border-zinc-800 dark:text-zinc-200"
                data-testid="sdkwork-desktop-launch-link"
                href={redirectUrl}
                onClick={() => { setPhase("launched") }}
              >
                {copy.desktop.manualLink}
              </a>
            </>
          ) : (
            <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              {copy.desktop.missingRedirect}
            </p>
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
