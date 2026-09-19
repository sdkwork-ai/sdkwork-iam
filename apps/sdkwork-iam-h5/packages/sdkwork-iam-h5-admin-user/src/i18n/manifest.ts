// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamH5AdminUserMessages as enUS } from './en-US/iam/h5/user.js';
import { iamH5AdminUserMessages as zhCN } from './zh-CN/iam/h5/user.js';

/** Locale fragment manifest for `@sdkwork/iam-h5-admin-user` (I18N_SPEC.md section 6). */
export const IAMH5ADMINUSER_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamH5AdminUserLocale = keyof typeof IAMH5ADMINUSER_I18N_FRAGMENTS;

export const IAMH5ADMINUSER_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamH5AdminUserLocaleMessages =
  (typeof IAMH5ADMINUSER_I18N_FRAGMENTS)[typeof IAMH5ADMINUSER_DEFAULT_LOCALE];
