// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamMpConsoleCloudAccountMessages as enUS } from './en-US/iam/mp/cloud-account.js';
import { iamMpConsoleCloudAccountMessages as zhCN } from './zh-CN/iam/mp/cloud-account.js';

/** Locale fragment manifest for `@sdkwork/iam-mp-console-cloud-account` (I18N_SPEC.md section 6). */
export const IAMMPCONSOLECLOUDACCOUNT_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamMpConsoleCloudAccountLocale = keyof typeof IAMMPCONSOLECLOUDACCOUNT_I18N_FRAGMENTS;

export const IAMMPCONSOLECLOUDACCOUNT_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamMpConsoleCloudAccountLocaleMessages =
  (typeof IAMMPCONSOLECLOUDACCOUNT_I18N_FRAGMENTS)[typeof IAMMPCONSOLECLOUDACCOUNT_DEFAULT_LOCALE];
