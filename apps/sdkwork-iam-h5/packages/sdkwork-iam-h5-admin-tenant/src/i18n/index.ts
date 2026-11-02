// SDKWORK-IAM-H5-ADMIN-TENANT-I18N: authored barrel.
/**
 * Catalog of the IAM H5 admin tenant surface.
 *
 * The manifest stays the single source of the locale fragments; this module adds the
 * catalog object the kit provider registers and the hook the screen calls.
 */
import { createSdkworkIamH5MessageCatalog, useSdkworkIamH5Messages } from "@sdkwork/iam-h5-commons";

import {
  IAMH5ADMINTENANT_DEFAULT_LOCALE,
  IAMH5ADMINTENANT_I18N_FRAGMENTS,
  type iamH5AdminTenantLocale,
} from "./manifest.js";

export * from "./manifest.js";

/** Namespace this capability registers its messages under. */
export const IAM_H5_ADMIN_TENANT_I18N_NAMESPACE = "iam.h5.admin.tenant";

/** The admin tenant surface catalog. */
export const IAM_H5_ADMIN_TENANT_I18N_CATALOG = createSdkworkIamH5MessageCatalog({
  bundles: (Object.keys(IAMH5ADMINTENANT_I18N_FRAGMENTS) as iamH5AdminTenantLocale[]).map((locale) => ({
    locale,
    messages: IAMH5ADMINTENANT_I18N_FRAGMENTS[locale],
  })),
  defaultLocale: IAMH5ADMINTENANT_DEFAULT_LOCALE,
  namespace: IAM_H5_ADMIN_TENANT_I18N_NAMESPACE,
});

/** Resolved messages of the admin tenant surface for the active locale. */
export function useIamH5AdminTenantMessages() {
  return useSdkworkIamH5Messages(IAM_H5_ADMIN_TENANT_I18N_CATALOG);
}
