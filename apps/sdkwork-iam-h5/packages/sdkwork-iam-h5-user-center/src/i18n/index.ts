// SDKWORK-IAM-H5-USER-CENTER-I18N: authored barrel.
/**
 * Catalog of the IAM H5 user center (profile + password).
 */
import { createSdkworkIamH5MessageCatalog, useSdkworkIamH5Messages } from "@sdkwork/iam-h5-commons";

import { IAMH5USERCENTER_DEFAULT_LOCALE, IAMH5USERCENTER_I18N_FRAGMENTS, type iamH5UserCenterLocale } from "./manifest.js";

export * from "./manifest.js";
export type { IamH5UserCenterMessages } from "./en-US/iam/h5/user-center.js";

/** Namespace this capability registers its messages under. */
export const IAM_H5_USER_CENTER_I18N_NAMESPACE = "iam.h5.user-center";

/** The user-center catalog. */
export const IAM_H5_USER_CENTER_I18N_CATALOG = createSdkworkIamH5MessageCatalog({
  bundles: (Object.keys(IAMH5USERCENTER_I18N_FRAGMENTS) as iamH5UserCenterLocale[]).map((locale) => ({
    locale,
    messages: IAMH5USERCENTER_I18N_FRAGMENTS[locale],
  })),
  defaultLocale: IAMH5USERCENTER_DEFAULT_LOCALE,
  namespace: IAM_H5_USER_CENTER_I18N_NAMESPACE,
});

/** Resolved messages of the user center for the active locale. */
export function useIamH5UserCenterMessages() {
  return useSdkworkIamH5Messages(IAM_H5_USER_CENTER_I18N_CATALOG);
}
