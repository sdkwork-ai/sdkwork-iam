// SDKWORK-IAM-H5-OAUTH-I18N: authored barrel.
/**
 * Catalog of the IAM H5 third-party sign-in surface.
 */
import { createSdkworkIamH5MessageCatalog, useSdkworkIamH5Messages } from "@sdkwork/iam-h5-commons";

import { IAMH5OAUTH_DEFAULT_LOCALE, IAMH5OAUTH_I18N_FRAGMENTS, type iamH5OauthLocale } from "./manifest.js";

export * from "./manifest.js";
export type { IamH5OauthMessages } from "./en-US/iam/h5/oauth.js";

/** Namespace this capability registers its messages under. */
export const IAM_H5_OAUTH_I18N_NAMESPACE = "iam.h5.oauth";

/** The third-party sign-in catalog. */
export const IAM_H5_OAUTH_I18N_CATALOG = createSdkworkIamH5MessageCatalog({
  bundles: (Object.keys(IAMH5OAUTH_I18N_FRAGMENTS) as iamH5OauthLocale[]).map((locale) => ({
    locale,
    messages: IAMH5OAUTH_I18N_FRAGMENTS[locale],
  })),
  defaultLocale: IAMH5OAUTH_DEFAULT_LOCALE,
  namespace: IAM_H5_OAUTH_I18N_NAMESPACE,
});

/** Resolved messages of the third-party sign-in surface for the active locale. */
export function useIamH5OauthMessages() {
  return useSdkworkIamH5Messages(IAM_H5_OAUTH_I18N_CATALOG);
}
