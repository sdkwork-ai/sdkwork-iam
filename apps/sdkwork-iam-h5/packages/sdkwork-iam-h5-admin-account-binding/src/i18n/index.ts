// SDKWORK-IAM-H5-ADMIN-ACCOUNT-BINDING-I18N: authored barrel.
/**
 * Catalog of the IAM H5 admin account-binding surface.
 *
 * The manifest stays the single source of the locale fragments; this module adds the catalog
 * the kit provider registers and the hook the screen calls.
 */
import { createSdkworkIamH5MessageCatalog, useSdkworkIamH5Messages } from "@sdkwork/iam-h5-commons";

import {
  IAMH5ADMINACCOUNTBINDING_DEFAULT_LOCALE,
  IAMH5ADMINACCOUNTBINDING_I18N_FRAGMENTS,
  type iamH5AdminAccountBindingLocale,
} from "./manifest.js";

export * from "./manifest.js";

/** Namespace this capability registers its messages under. */
export const IAM_H5_ADMIN_ACCOUNT_BINDING_I18N_NAMESPACE = "iam.h5.admin.account-binding";

/** The admin account-binding surface catalog. */
export const IAM_H5_ADMIN_ACCOUNT_BINDING_I18N_CATALOG = createSdkworkIamH5MessageCatalog({
  bundles: (Object.keys(IAMH5ADMINACCOUNTBINDING_I18N_FRAGMENTS) as iamH5AdminAccountBindingLocale[]).map(
    (locale) => ({
      locale,
      messages: IAMH5ADMINACCOUNTBINDING_I18N_FRAGMENTS[locale],
    }),
  ),
  defaultLocale: IAMH5ADMINACCOUNTBINDING_DEFAULT_LOCALE,
  namespace: IAM_H5_ADMIN_ACCOUNT_BINDING_I18N_NAMESPACE,
});

/** Resolved messages of the admin account-binding surface for the active locale. */
export function useIamH5AdminAccountBindingMessages() {
  return useSdkworkIamH5Messages(IAM_H5_ADMIN_ACCOUNT_BINDING_I18N_CATALOG);
}
