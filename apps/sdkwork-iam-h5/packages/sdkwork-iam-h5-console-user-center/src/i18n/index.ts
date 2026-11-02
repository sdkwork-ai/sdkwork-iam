// SDKWORK-IAM-H5-CONSOLE-USER-CENTER-I18N: authored barrel.
/**
 * Catalog of the IAM H5 console user-center surface.
 *
 * The manifest stays the single source of the locale fragments; this module adds the
 * catalog object the kit provider registers and the hook the screen calls.
 */
import { createSdkworkIamH5MessageCatalog, useSdkworkIamH5Messages } from "@sdkwork/iam-h5-commons";

import {
  IAMH5CONSOLEUSERCENTER_DEFAULT_LOCALE,
  IAMH5CONSOLEUSERCENTER_I18N_FRAGMENTS,
  type iamH5ConsoleUserCenterLocale,
} from "./manifest.js";

export * from "./manifest.js";

/** Namespace this capability registers its messages under. */
export const IAM_H5_CONSOLE_USER_CENTER_I18N_NAMESPACE = "iam.h5.console.userCenter";

/** The console user-center surface catalog. */
export const IAM_H5_CONSOLE_USER_CENTER_I18N_CATALOG = createSdkworkIamH5MessageCatalog({
  bundles: (Object.keys(IAMH5CONSOLEUSERCENTER_I18N_FRAGMENTS) as iamH5ConsoleUserCenterLocale[]).map(
    (locale) => ({
      locale,
      messages: IAMH5CONSOLEUSERCENTER_I18N_FRAGMENTS[locale],
    }),
  ),
  defaultLocale: IAMH5CONSOLEUSERCENTER_DEFAULT_LOCALE,
  namespace: IAM_H5_CONSOLE_USER_CENTER_I18N_NAMESPACE,
});

/** Resolved messages of the console user-center surface for the active locale. */
export function useIamH5ConsoleUserCenterMessages() {
  return useSdkworkIamH5Messages(IAM_H5_CONSOLE_USER_CENTER_I18N_CATALOG);
}
