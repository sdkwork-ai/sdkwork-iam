// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamMpAdminCloudAccountMessages as enUS } from './en-US/iam/mp/cloud-account.js';
import { iamMpAdminCloudAccountMessages as zhCN } from './zh-CN/iam/mp/cloud-account.js';

/** Locale fragment manifest for `@sdkwork/iam-mp-admin-cloud-account` (I18N_SPEC.md section 6). */
export const IAMMPADMINCLOUDACCOUNT_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamMpAdminCloudAccountLocale = keyof typeof IAMMPADMINCLOUDACCOUNT_I18N_FRAGMENTS;

export const IAMMPADMINCLOUDACCOUNT_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamMpAdminCloudAccountLocaleMessages =
  (typeof IAMMPADMINCLOUDACCOUNT_I18N_FRAGMENTS)[typeof IAMMPADMINCLOUDACCOUNT_DEFAULT_LOCALE];
