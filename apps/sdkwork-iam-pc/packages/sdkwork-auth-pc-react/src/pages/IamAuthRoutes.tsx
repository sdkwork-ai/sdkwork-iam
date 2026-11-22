import {
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  useLocation,
} from "react-router-dom";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import type { SdkworkAuthAppearanceConfig } from "../auth-appearance.ts";
import type { SdkworkAuthBrand } from "../auth-brand.ts";
import type {
  CreateSdkworkIamRuntimeAuthControllerOptions,
  SdkworkIamRuntimeAuthRuntimeLike,
} from "../auth-iam-runtime.ts";
import { createSdkworkIamRuntimeAuthController } from "../auth-iam-runtime.ts";
import type { SdkworkAuthPageRouterContextMode } from "./routerContextBoundary.tsx";
import {
  SdkworkAuthPageRouterContextBoundary,
} from "./routerContextBoundary.tsx";
import {
  SdkworkAuthDesktopLaunchPage,
} from "./AuthDesktopLaunchPage.tsx";
import {
  SdkworkAuthOAuthCallbackPage,
} from "./AuthOAuthCallbackPage.tsx";
import { SdkworkAuthSignOutPage } from "./AuthSignOutPage.tsx";
import { isSdkworkAuthSignOutPath } from "../auth-sign-out.ts";
import {
  SdkworkAuthPage,
  type SdkworkAuthPageEvents,
  type SdkworkAuthPageSlots,
} from "./AuthPage.tsx";
import type { SdkworkAuthDesktopBrowserLoginBinding } from "../desktop-browser-login.ts";
import type { SdkworkAuthRuntimeConfig } from "../auth-config.ts";
import {
  formatSdkworkAuthTemplate,
  SDKWORK_AUTH_I18N_CATALOG,
} from "../auth-copy.ts";
import { useSdkworkAuthIntl } from "../auth-intl.tsx";
import {
  mergeSdkworkAuthClassNames,
  mergeSdkworkAuthStyles,
} from "../auth-appearance.ts";
import {
  SDKWORK_OAUTH_APP_LAUNCH_PATH,
  SDKWORK_OAUTH_PROVIDER_CALLBACK_PATH,
} from "../oauth-app-paths.ts";

export interface SdkworkIamAuthRoutesProps {
  appearance?: SdkworkAuthAppearanceConfig;
  basePath?: string;
  /**
   * Product brand configured by the host application. Auth pages that render
   * a product header show it instead of the shared IAM identity.
   */
  brand?: SdkworkAuthBrand;
  /**
   * Host-rendered brand lockup (logo plus wordmark) for the surface header, so
   * the hosted auth page matches the product's own navigation exactly.
   */
  brandHeader?: ReactNode;
  className?: string;
  controllerOptions?: Omit<
    CreateSdkworkIamRuntimeAuthControllerOptions,
    "getRuntime"
  >;
  /** Desktop (Electron/Tauri) browser-login entry; absent on pure web. */
  desktopBrowserLogin?: SdkworkAuthDesktopBrowserLoginBinding;
  events?: SdkworkAuthPageEvents;
  getRuntime: () =>
    | Promise<SdkworkIamRuntimeAuthRuntimeLike>
    | SdkworkIamRuntimeAuthRuntimeLike;
  homePath?: string;
  locale?: string | null;
  methodUnavailableMessage?: string;
  routerContextMode?: SdkworkAuthPageRouterContextMode;
  runtimeConfig?: SdkworkAuthRuntimeConfig;
  slots?: SdkworkAuthPageSlots;
  style?: CSSProperties;
  viewportMode?: "fixed" | "flow";
}

function isOAuthCallbackRoute(pathname: string): boolean {
  // The provider callback is a fixed OAuth route, not a page of the host's
  // account base path: a third-party round trip never enters `/auth/*`.
  return pathname === SDKWORK_OAUTH_PROVIDER_CALLBACK_PATH
    || pathname.startsWith(`${SDKWORK_OAUTH_PROVIDER_CALLBACK_PATH}/`);
}

function isDesktopLaunchRoute(pathname: string): boolean {
  // The hand-off page is a protocol-level route under `/oauth`, not a page of
  // the host's auth base path: only a native-application login lands here.
  return pathname === SDKWORK_OAUTH_APP_LAUNCH_PATH
    || pathname.startsWith(`${SDKWORK_OAUTH_APP_LAUNCH_PATH}/`);
}

export function SdkworkIamAuthRoutes({
  routerContextMode = "auto",
  ...props
}: SdkworkIamAuthRoutesProps) {
  return (
    <SdkworkAuthPageRouterContextBoundary mode={routerContextMode}>
      <SdkworkIamAuthRoutesContent
        {...props}
        routerContextMode="external"
      />
    </SdkworkAuthPageRouterContextBoundary>
  );
}

function SdkworkIamAuthRoutesContent({
  className,
  locale,
  style,
  viewportMode = "fixed",
  ...props
}: SdkworkIamAuthRoutesProps) {
  return (
    <section
      className={mergeSdkworkAuthClassNames(
        viewportMode === "fixed"
          ? "sdkwork-iam-auth-routes fixed inset-0 z-[60] h-full w-full min-w-0 shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-950"
          : "sdkwork-iam-auth-routes relative isolate h-full w-full min-w-0 shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-950",
        className,
      )}
      style={mergeSdkworkAuthStyles(
        {
          colorScheme: "light dark",
        },
        style,
      )}
    >
      <SdkworkI18nProvider
        catalogs={[SDKWORK_AUTH_I18N_CATALOG]}
        locale={locale}
      >
        <SdkworkIamAuthRoutesPage {...props} />
      </SdkworkI18nProvider>
    </section>
  );
}

function SdkworkIamAuthRoutesPage({
  appearance,
  basePath = "/auth",
  brand,
  brandHeader,
  controllerOptions,
  desktopBrowserLogin,
  events,
  getRuntime,
  homePath = "/dashboard",
  methodUnavailableMessage,
  routerContextMode,
  runtimeConfig,
  slots,
}: SdkworkIamAuthRoutesProps) {
  const { copy } = useSdkworkAuthIntl();
  const location = useLocation();
  const localizedMethodUnavailableMessage = useMemo(
    () => formatSdkworkAuthTemplate(copy.service.methodUnavailableTemplate, {
      name: copy.service.iamRuntimeAuthMethodName,
    }),
    [
      copy.service.iamRuntimeAuthMethodName,
      copy.service.methodUnavailableTemplate,
    ],
  );
  const resolvedMethodUnavailableMessage =
    methodUnavailableMessage
    ?? controllerOptions?.methodUnavailableMessage
    ?? localizedMethodUnavailableMessage;
  const controller = useMemo(
    () =>
      createSdkworkIamRuntimeAuthController({
        ...(controllerOptions ?? {}),
        getRuntime,
        methodUnavailableMessage: resolvedMethodUnavailableMessage,
      }),
    [
      controllerOptions,
      getRuntime,
      resolvedMethodUnavailableMessage,
    ],
  );
  const commonProps = {
    appearance,
    basePath,
    controller,
    homePath,
    routerContextMode,
    runtimeConfig,
  } satisfies Pick<
    Parameters<typeof SdkworkAuthPage>[0],
    | "appearance"
    | "basePath"
    | "controller"
    | "homePath"
    | "routerContextMode"
    | "runtimeConfig"
  >;

  // Sign-out runs before the OAuth branches: it is the one account-area route
  // an authenticated visitor must keep, and the desktop shell opens it in the
  // system browser to end the shared account session.
  if (isSdkworkAuthSignOutPath(location.pathname, basePath)) {
    return <SdkworkAuthSignOutPage {...commonProps} brand={brand} />;
  }

  if (isDesktopLaunchRoute(location.pathname)) {
    return <SdkworkAuthDesktopLaunchPage {...commonProps} brand={brand} brandHeader={brandHeader} />;
  }

  if (isOAuthCallbackRoute(location.pathname)) {
    return <SdkworkAuthOAuthCallbackPage {...commonProps} />;
  }

  // Everything else is the account surface, including the OAuth login step at
  // `/oauth/login`: it renders the same login page, and that page detects the
  // `oauthAuthorizationStateId` it carries and completes the pending
  // authorization itself.
  return (
    <SdkworkAuthPage
      {...commonProps}
      brand={brand}
      brandHeader={brandHeader}
      desktopBrowserLogin={desktopBrowserLogin}
      events={events}
      slots={slots}
    />
  );
}
