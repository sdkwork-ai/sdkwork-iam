// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamMpConsoleAccountBindingMessages as enUS } from './en-US/iam/mp/account-binding.js';
import { iamMpConsoleAccountBindingMessages as zhCN } from './zh-CN/iam/mp/account-binding.js';

/** Locale fragment manifest for `@sdkwork/iam-mp-console-account-binding` (I18N_SPEC.md section 6). */
export const IAMMPCONSOLEACCOUNTBINDING_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamMpConsoleAccountBindingLocale = keyof typeof IAMMPCONSOLEACCOUNTBINDING_I18N_FRAGMENTS;

export const IAMMPCONSOLEACCOUNTBINDING_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamMpConsoleAccountBindingLocaleMessages =
  (typeof IAMMPCONSOLEACCOUNTBINDING_I18N_FRAGMENTS)[typeof IAMMPCONSOLEACCOUNTBINDING_DEFAULT_LOCALE];
