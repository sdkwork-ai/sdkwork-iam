// SDKWORK-IAM-H5-ACCOUNT-BINDING-I18N: authored barrel.
/**
 * Catalog of the IAM H5 account-binding surface.
 */
import { createSdkworkIamH5MessageCatalog, useSdkworkIamH5Messages } from "@sdkwork/iam-h5-commons";

import {
  IAMH5ACCOUNTBINDING_DEFAULT_LOCALE,
  IAMH5ACCOUNTBINDING_I18N_FRAGMENTS,
  type iamH5AccountBindingLocale,
} from "./manifest.js";

export * from "./manifest.js";
export type { IamH5AccountBindingMessages } from "./en-US/iam/h5/account-binding.js";

/** Namespace this capability registers its messages under. */
export const IAM_H5_ACCOUNT_BINDING_I18N_NAMESPACE = "iam.h5.account-binding";

/** The account-binding catalog. */
export const IAM_H5_ACCOUNT_BINDING_I18N_CATALOG = createSdkworkIamH5MessageCatalog({
  bundles: (Object.keys(IAMH5ACCOUNTBINDING_I18N_FRAGMENTS) as iamH5AccountBindingLocale[]).map((locale) => ({
    locale,
    messages: IAMH5ACCOUNTBINDING_I18N_FRAGMENTS[locale],
  })),
  defaultLocale: IAMH5ACCOUNTBINDING_DEFAULT_LOCALE,
  namespace: IAM_H5_ACCOUNT_BINDING_I18N_NAMESPACE,
});

/** Resolved messages of the account-binding surface for the active locale. */
export function useIamH5AccountBindingMessages() {
  return useSdkworkIamH5Messages(IAM_H5_ACCOUNT_BINDING_I18N_CATALOG);
}
