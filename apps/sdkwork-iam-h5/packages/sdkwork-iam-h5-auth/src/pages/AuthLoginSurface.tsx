/**
 * Locale-complete mount of the IAM H5 sign-in screen.
 *
 * The auth screens resolve their copy through `@sdkwork/i18n-pc-react`'s
 * `useSdkworkModuleMessages`, which falls back to the catalog's **default** locale
 * when no provider is above them. That fallback is silent: a zh-CN host would get
 * an English sign-in page with no error anywhere. This surface is the provider
 * boundary, so a host that mounts the screen without it cannot quietly lose
 * localization — it has to mount this instead.
 */

import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import type { ReactElement } from "react";

import { SDKWORK_IAM_H5_AUTH_I18N_CATALOG } from "../i18n/index.js";
import { SdkworkIamH5AuthLoginScreen, type SdkworkIamH5AuthLoginScreenProps } from "./AuthLoginScreen.js";

/** Props of {@link SdkworkIamH5AuthLoginSurface}. */
export interface SdkworkIamH5AuthLoginSurfaceProps extends SdkworkIamH5AuthLoginScreenProps {
  /** BCP-47 locale; the catalog default applies when omitted. */
  locale?: string | null;
}

/**
 * Render the sign-in screen inside its locale provider.
 * @param props - screen props plus the locale hint.
 * @returns the localized sign-in surface.
 */
export function SdkworkIamH5AuthLoginSurface({
  locale,
  ...screenProps
}: SdkworkIamH5AuthLoginSurfaceProps): ReactElement {
  return (
    <SdkworkI18nProvider catalogs={[SDKWORK_IAM_H5_AUTH_I18N_CATALOG]} locale={locale}>
      <SdkworkIamH5AuthLoginScreen {...screenProps} />
    </SdkworkI18nProvider>
  );
}
