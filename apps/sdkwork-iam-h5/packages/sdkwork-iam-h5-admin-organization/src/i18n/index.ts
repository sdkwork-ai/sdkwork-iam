// SDKWORK-IAM-H5-ADMIN-ORGANIZATION-I18N: authored barrel.
/**
 * Catalog of the IAM H5 admin organization surface.
 *
 * The manifest stays the single source of the locale fragments; this module adds the
 * catalog object the kit provider registers and the hook the screen calls.
 */
import { createSdkworkIamH5MessageCatalog, useSdkworkIamH5Messages } from "@sdkwork/iam-h5-commons";

import {
  IAMH5ADMINORGANIZATION_DEFAULT_LOCALE,
  IAMH5ADMINORGANIZATION_I18N_FRAGMENTS,
  type iamH5AdminOrganizationLocale,
} from "./manifest.js";

export * from "./manifest.js";

/** Namespace this capability registers its messages under. */
export const IAM_H5_ADMIN_ORGANIZATION_I18N_NAMESPACE = "iam.h5.admin.organization";

/** The admin organization surface catalog. */
export const IAM_H5_ADMIN_ORGANIZATION_I18N_CATALOG = createSdkworkIamH5MessageCatalog({
  bundles: (
    Object.keys(IAMH5ADMINORGANIZATION_I18N_FRAGMENTS) as iamH5AdminOrganizationLocale[]
  ).map((locale) => ({
    locale,
    messages: IAMH5ADMINORGANIZATION_I18N_FRAGMENTS[locale],
  })),
  defaultLocale: IAMH5ADMINORGANIZATION_DEFAULT_LOCALE,
  namespace: IAM_H5_ADMIN_ORGANIZATION_I18N_NAMESPACE,
});

/** Resolved messages of the admin organization surface for the active locale. */
export function useIamH5AdminOrganizationMessages() {
  return useSdkworkIamH5Messages(IAM_H5_ADMIN_ORGANIZATION_I18N_CATALOG);
}
