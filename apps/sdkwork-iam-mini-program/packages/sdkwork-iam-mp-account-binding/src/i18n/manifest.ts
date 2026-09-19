// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamMpAccountBindingMessages as enUS } from './en-US/iam/mp/account-binding.js';
import { iamMpAccountBindingMessages as zhCN } from './zh-CN/iam/mp/account-binding.js';

/** Locale fragment manifest for `@sdkwork/iam-mp-account-binding` (I18N_SPEC.md section 6). */
export const IAMMPACCOUNTBINDING_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamMpAccountBindingLocale = keyof typeof IAMMPACCOUNTBINDING_I18N_FRAGMENTS;

export const IAMMPACCOUNTBINDING_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamMpAccountBindingLocaleMessages =
  (typeof IAMMPACCOUNTBINDING_I18N_FRAGMENTS)[typeof IAMMPACCOUNTBINDING_DEFAULT_LOCALE];
