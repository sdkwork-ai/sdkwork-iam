// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamH5AccountBindingMessages as enUS } from './en-US/iam/h5/account-binding.js';
import { iamH5AccountBindingMessages as zhCN } from './zh-CN/iam/h5/account-binding.js';

/** Locale fragment manifest for `@sdkwork/iam-h5-account-binding` (I18N_SPEC.md section 6). */
export const IAMH5ACCOUNTBINDING_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamH5AccountBindingLocale = keyof typeof IAMH5ACCOUNTBINDING_I18N_FRAGMENTS;

export const IAMH5ACCOUNTBINDING_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamH5AccountBindingLocaleMessages =
  (typeof IAMH5ACCOUNTBINDING_I18N_FRAGMENTS)[typeof IAMH5ACCOUNTBINDING_DEFAULT_LOCALE];
