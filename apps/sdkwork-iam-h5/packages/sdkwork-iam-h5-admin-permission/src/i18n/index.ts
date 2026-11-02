// SDKWORK-IAM-H5-ADMIN-PERMISSION-I18N: authored barrel.
/**
 * Catalog of the IAM H5 admin permission surface.
 *
 * The manifest stays the single source of the locale fragments; this module adds the
 * catalog object the kit provider registers and the hook the screen calls.
 */
import { createSdkworkIamH5MessageCatalog, useSdkworkIamH5Messages } from "@sdkwork/iam-h5-commons";

import {
  IAMH5ADMINPERMISSION_DEFAULT_LOCALE,
  IAMH5ADMINPERMISSION_I18N_FRAGMENTS,
  type iamH5AdminPermissionLocale,
} from "./manifest.js";

export * from "./manifest.js";

/** Namespace this capability registers its messages under. */
export const IAM_H5_ADMIN_PERMISSION_I18N_NAMESPACE = "iam.h5.admin.permission";

/** The admin permission surface catalog. */
export const IAM_H5_ADMIN_PERMISSION_I18N_CATALOG = createSdkworkIamH5MessageCatalog({
  bundles: (Object.keys(IAMH5ADMINPERMISSION_I18N_FRAGMENTS) as iamH5AdminPermissionLocale[]).map(
    (locale) => ({
      locale,
      messages: IAMH5ADMINPERMISSION_I18N_FRAGMENTS[locale],
    }),
  ),
  defaultLocale: IAMH5ADMINPERMISSION_DEFAULT_LOCALE,
  namespace: IAM_H5_ADMIN_PERMISSION_I18N_NAMESPACE,
});

/** Resolved messages of the admin permission surface for the active locale. */
export function useIamH5AdminPermissionMessages() {
  return useSdkworkIamH5Messages(IAM_H5_ADMIN_PERMISSION_I18N_CATALOG);
}
