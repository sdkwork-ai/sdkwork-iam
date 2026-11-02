// SDKWORK-IAM-H5-TENANT-I18N: authored barrel.
/**
 * Catalog of the IAM H5 tenant surface.
 *
 * The manifest stays the single source of the locale fragments; this module adds
 * the catalog object the kit provider registers and the hook the screen calls.
 */
import { createSdkworkIamH5MessageCatalog, useSdkworkIamH5Messages } from "@sdkwork/iam-h5-commons";

import { IAMH5TENANT_DEFAULT_LOCALE, IAMH5TENANT_I18N_FRAGMENTS, type iamH5TenantLocale } from "./manifest.js";

export * from "./manifest.js";

/** Namespace this capability registers its messages under. */
export const IAM_H5_TENANT_I18N_NAMESPACE = "iam.h5.tenant";

/** The tenant surface catalog. */
export const IAM_H5_TENANT_I18N_CATALOG = createSdkworkIamH5MessageCatalog({
  bundles: (Object.keys(IAMH5TENANT_I18N_FRAGMENTS) as iamH5TenantLocale[]).map((locale) => ({
    locale,
    messages: IAMH5TENANT_I18N_FRAGMENTS[locale],
  })),
  defaultLocale: IAMH5TENANT_DEFAULT_LOCALE,
  namespace: IAM_H5_TENANT_I18N_NAMESPACE,
});

/** Resolved messages of the tenant surface for the active locale. */
export function useIamH5TenantMessages() {
  return useSdkworkIamH5Messages(IAM_H5_TENANT_I18N_CATALOG);
}
