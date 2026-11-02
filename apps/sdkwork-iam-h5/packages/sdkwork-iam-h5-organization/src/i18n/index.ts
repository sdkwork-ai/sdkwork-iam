// SDKWORK-IAM-H5-ORGANIZATION-I18N: authored barrel.
/**
 * Catalog of the IAM H5 organization directory.
 */
import { createSdkworkIamH5MessageCatalog, useSdkworkIamH5Messages } from "@sdkwork/iam-h5-commons";

import {
  IAMH5ORGANIZATION_DEFAULT_LOCALE,
  IAMH5ORGANIZATION_I18N_FRAGMENTS,
  type iamH5OrganizationLocale,
} from "./manifest.js";

export * from "./manifest.js";
export type { IamH5OrganizationMessages } from "./en-US/iam/h5/organization.js";

/** Namespace this capability registers its messages under. */
export const IAM_H5_ORGANIZATION_I18N_NAMESPACE = "iam.h5.organization";

/** The organization catalog. */
export const IAM_H5_ORGANIZATION_I18N_CATALOG = createSdkworkIamH5MessageCatalog({
  bundles: (Object.keys(IAMH5ORGANIZATION_I18N_FRAGMENTS) as iamH5OrganizationLocale[]).map((locale) => ({
    locale,
    messages: IAMH5ORGANIZATION_I18N_FRAGMENTS[locale],
  })),
  defaultLocale: IAMH5ORGANIZATION_DEFAULT_LOCALE,
  namespace: IAM_H5_ORGANIZATION_I18N_NAMESPACE,
});

/** Resolved messages of the organization directory for the active locale. */
export function useIamH5OrganizationMessages() {
  return useSdkworkIamH5Messages(IAM_H5_ORGANIZATION_I18N_CATALOG);
}
