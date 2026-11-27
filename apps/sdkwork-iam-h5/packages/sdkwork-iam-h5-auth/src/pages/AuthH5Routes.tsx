import { useLocation } from "react-router-dom";

import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";

import { SDKWORK_IAM_H5_AUTH_I18N_CATALOG } from "../i18n";
import type {
  SdkworkIamH5AuthController,
  SdkworkIamH5AuthSession,
} from "../types/auth-h5-types";
import { IAM_H5_AUTH_ROUTES } from "../types/auth-h5-types";
import { SdkworkIamH5AuthLoginContextSelectionScreen } from "./AuthLoginContextSelectionScreen";
import { SdkworkIamH5AuthLoginScreen } from "./AuthLoginScreen";
import { SdkworkIamH5AuthOAuthCallbackScreen } from "./AuthOAuthCallbackScreen";

export interface SdkworkIamH5AuthRoutesProps {
  /**
   * Mobile auth controller built over the host's IAM service. Successful
   * sessions are committed by the host runtime (session bridge), which emits
   * the host session-changed event and unlocks the app's auth gate.
   */
  controller: SdkworkIamH5AuthController;
  /**
   * Base path of the account surface; defaults to `/auth`.
   *
   * The login screen owns its own addressable modes, so this no longer decides
   * where the OAuth callback renders — `oauthCallbackPath` does.
   */
  basePath?: string;
  /** BCP-47 locale hint; defaults to the catalog default when omitted. */
  locale?: string | null;
  onAuthenticated?: (session: SdkworkIamH5AuthSession) => void;
  /** Invoked when a scan-login QR session was completed on this device. */
  onScanLoginCompleted?: () => void;
  /**
   * Invoked when a third-party provider entry is activated; the host decides
   * the provider flow (the IM product currently fails closed).
   */
  onThirdPartyLogin?: (platform: string) => void;
  /** Back affordance when the auth route was reached from another host page. */
  onBack?: () => void;
  /**
   * Provider callback path the third-party round trip returns to.
   *
   * Defaults to `IAM_H5_AUTH_ROUTES.callbackPath`; the SDKWork website passes
   * `/oauth/callback` so the OAuth hop stays out of `/auth/*`.
   */
  oauthCallbackPath?: string;
}

function isOAuthCallbackRoute(pathname: string, oauthCallbackPath: string): boolean {
  return pathname === oauthCallbackPath;
}

/**
 * Reusable mobile auth route host (zip-design login/register system).
 *
 * Mounts the login screen (password/code login, register, recovery, terms,
 * third-party, login-context selection and scan-login completion) and the OAuth
 * callback screen at `oauthCallbackPath` — the second path is a provider
 * callback, so it does not follow the account base path. Hosts render it at
 * their auth route; no per-host wiring beyond building the controller from the
 * host IAM service.
 */
export function SdkworkIamH5AuthRoutes({
  basePath = "/auth",
  controller,
  locale,
  onAuthenticated,
  onScanLoginCompleted,
  onThirdPartyLogin,
  onBack,
  oauthCallbackPath = IAM_H5_AUTH_ROUTES.callbackPath,
}: SdkworkIamH5AuthRoutesProps) {
  const location = useLocation();
  const contextPath = `${basePath.replace(/\/+$/u, "")}/login/context`;
  const challenge = controller.getState().challenge;

  return (
    <SdkworkI18nProvider
      catalogs={[SDKWORK_IAM_H5_AUTH_I18N_CATALOG]}
      locale={locale}
    >
      {isOAuthCallbackRoute(location.pathname, oauthCallbackPath) ? (
        <SdkworkIamH5AuthOAuthCallbackScreen
          controller={controller}
          onAuthenticated={onAuthenticated}
          onScanLoginCompleted={onScanLoginCompleted}
          oauthCallbackPath={oauthCallbackPath}
        />
      ) : (
        <SdkworkIamH5AuthLoginScreen
          controller={controller}
          onAuthenticated={onAuthenticated}
          onScanLoginCompleted={onScanLoginCompleted}
          onThirdPartyLogin={onThirdPartyLogin}
          oauthCallbackPath={oauthCallbackPath}
          {...(onBack ? { onBack } : {})}
        />
      )}
    </SdkworkI18nProvider>
  );
}
