/**
 * Locale-complete mount of the IAM H5 OAuth callback screen.
 *
 * Same reason as `AuthLoginSurface`: the auth screens resolve copy through the PC
 * i18n binding, which silently falls back to the catalog default when no provider
 * is above it. A host that mounts the callback screen without this boundary gets
 * an English consent page inside a zh-CN session and no error anywhere.
 */

import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import type { ReactElement } from "react";

import { SDKWORK_IAM_H5_AUTH_I18N_CATALOG } from "../i18n/index.js";
import type {
  SdkworkIamH5AuthController,
  SdkworkIamH5AuthOAuthCallbackScreenProps,
  SdkworkIamH5AuthSession,
} from "../types/auth-h5-types.js";
import { SdkworkIamH5AuthOAuthCallbackScreen } from "./AuthOAuthCallbackScreen.js";

/** Props of {@link SdkworkIamH5AuthCallbackSurface}. */
export interface SdkworkIamH5AuthCallbackSurfaceProps {
  controller: SdkworkIamH5AuthController;
  /** BCP-47 locale; the catalog default applies when omitted. */
  locale?: string | null;
  onAuthenticated?: (session: SdkworkIamH5AuthSession) => void;
  onScanLoginCompleted?: () => void;
  title?: string;
}

/**
 * Render the OAuth callback screen inside its locale provider.
 * @param props - screen props plus the locale hint.
 * @returns the localized callback surface.
 */
export function SdkworkIamH5AuthCallbackSurface({
  locale,
  ...screenProps
}: SdkworkIamH5AuthCallbackSurfaceProps): ReactElement {
  // The prop shape is asserted against the screen's own contract so a change there
  // breaks here rather than at the call site.
  const screen: SdkworkIamH5AuthOAuthCallbackScreenProps = screenProps;
  return (
    <SdkworkI18nProvider catalogs={[SDKWORK_IAM_H5_AUTH_I18N_CATALOG]} locale={locale}>
      <SdkworkIamH5AuthOAuthCallbackScreen {...screen} />
    </SdkworkI18nProvider>
  );
}
