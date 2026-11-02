// SDKWORK-IAM-H5-CONSOLE-ACCOUNT-BINDING-I18N: authored barrel.
/**
 * Catalog of the IAM H5 console account-binding surface.
 *
 * The manifest stays the single source of the locale fragments; this module adds the
 * catalog object the kit provider registers and the hook the screen calls.
 */
import { createSdkworkIamH5MessageCatalog, useSdkworkIamH5Messages } from "@sdkwork/iam-h5-commons";

import {
  IAMH5CONSOLEACCOUNTBINDING_DEFAULT_LOCALE,
  IAMH5CONSOLEACCOUNTBINDING_I18N_FRAGMENTS,
  type iamH5ConsoleAccountBindingLocale,
} from "./manifest.js";

export * from "./manifest.js";

/** Namespace this capability registers its messages under. */
export const IAM_H5_CONSOLE_ACCOUNT_BINDING_I18N_NAMESPACE = "iam.h5.console.accountBinding";

/** The console account-binding surface catalog. */
export const IAM_H5_CONSOLE_ACCOUNT_BINDING_I18N_CATALOG = createSdkworkIamH5MessageCatalog({
  bundles: (
    Object.keys(IAMH5CONSOLEACCOUNTBINDING_I18N_FRAGMENTS) as iamH5ConsoleAccountBindingLocale[]
  ).map((locale) => ({
    locale,
    messages: IAMH5CONSOLEACCOUNTBINDING_I18N_FRAGMENTS[locale],
  })),
  defaultLocale: IAMH5CONSOLEACCOUNTBINDING_DEFAULT_LOCALE,
  namespace: IAM_H5_CONSOLE_ACCOUNT_BINDING_I18N_NAMESPACE,
});

/** Resolved messages of the console account-binding surface for the active locale. */
export function useIamH5ConsoleAccountBindingMessages() {
  return useSdkworkIamH5Messages(IAM_H5_CONSOLE_ACCOUNT_BINDING_I18N_CATALOG);
}
