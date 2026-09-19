// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamH5AdminAccountBindingMessages as enUS } from './en-US/iam/h5/account-binding.js';
import { iamH5AdminAccountBindingMessages as zhCN } from './zh-CN/iam/h5/account-binding.js';

/** Locale fragment manifest for `@sdkwork/iam-h5-admin-account-binding` (I18N_SPEC.md section 6). */
export const IAMH5ADMINACCOUNTBINDING_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamH5AdminAccountBindingLocale = keyof typeof IAMH5ADMINACCOUNTBINDING_I18N_FRAGMENTS;

export const IAMH5ADMINACCOUNTBINDING_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamH5AdminAccountBindingLocaleMessages =
  (typeof IAMH5ADMINACCOUNTBINDING_I18N_FRAGMENTS)[typeof IAMH5ADMINACCOUNTBINDING_DEFAULT_LOCALE];
