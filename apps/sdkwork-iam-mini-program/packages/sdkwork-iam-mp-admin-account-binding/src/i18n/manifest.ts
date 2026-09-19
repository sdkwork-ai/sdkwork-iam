// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamMpAdminAccountBindingMessages as enUS } from './en-US/iam/mp/account-binding.js';
import { iamMpAdminAccountBindingMessages as zhCN } from './zh-CN/iam/mp/account-binding.js';

/** Locale fragment manifest for `@sdkwork/iam-mp-admin-account-binding` (I18N_SPEC.md section 6). */
export const IAMMPADMINACCOUNTBINDING_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamMpAdminAccountBindingLocale = keyof typeof IAMMPADMINACCOUNTBINDING_I18N_FRAGMENTS;

export const IAMMPADMINACCOUNTBINDING_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamMpAdminAccountBindingLocaleMessages =
  (typeof IAMMPADMINACCOUNTBINDING_I18N_FRAGMENTS)[typeof IAMMPADMINACCOUNTBINDING_DEFAULT_LOCALE];
