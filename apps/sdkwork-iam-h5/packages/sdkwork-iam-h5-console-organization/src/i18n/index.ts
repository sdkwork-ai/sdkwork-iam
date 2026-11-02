// SDKWORK-IAM-H5-CONSOLE-ORGANIZATION-I18N: authored barrel.
/**
 * Catalog of the IAM H5 console organization surface.
 *
 * The manifest stays the single source of the locale fragments; this module adds the
 * catalog object the kit provider registers and the hook the screen calls.
 */
import { createSdkworkIamH5MessageCatalog, useSdkworkIamH5Messages } from "@sdkwork/iam-h5-commons";

import {
  IAMH5CONSOLEORGANIZATION_DEFAULT_LOCALE,
  IAMH5CONSOLEORGANIZATION_I18N_FRAGMENTS,
  type iamH5ConsoleOrganizationLocale,
} from "./manifest.js";

export * from "./manifest.js";

/** Namespace this capability registers its messages under. */
export const IAM_H5_CONSOLE_ORGANIZATION_I18N_NAMESPACE = "iam.h5.console.organization";

/** The console organization surface catalog. */
export const IAM_H5_CONSOLE_ORGANIZATION_I18N_CATALOG = createSdkworkIamH5MessageCatalog({
  bundles: (Object.keys(IAMH5CONSOLEORGANIZATION_I18N_FRAGMENTS) as iamH5ConsoleOrganizationLocale[]).map(
    (locale) => ({
      locale,
      messages: IAMH5CONSOLEORGANIZATION_I18N_FRAGMENTS[locale],
    }),
  ),
  defaultLocale: IAMH5CONSOLEORGANIZATION_DEFAULT_LOCALE,
  namespace: IAM_H5_CONSOLE_ORGANIZATION_I18N_NAMESPACE,
});

/** Resolved messages of the console organization surface for the active locale. */
export function useIamH5ConsoleOrganizationMessages() {
  return useSdkworkIamH5Messages(IAM_H5_CONSOLE_ORGANIZATION_I18N_CATALOG);
}
