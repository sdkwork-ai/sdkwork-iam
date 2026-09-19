// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamMpAdminUserMessages as enUS } from './en-US/iam/mp/user.js';
import { iamMpAdminUserMessages as zhCN } from './zh-CN/iam/mp/user.js';

/** Locale fragment manifest for `@sdkwork/iam-mp-admin-user` (I18N_SPEC.md section 6). */
export const IAMMPADMINUSER_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamMpAdminUserLocale = keyof typeof IAMMPADMINUSER_I18N_FRAGMENTS;

export const IAMMPADMINUSER_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamMpAdminUserLocaleMessages =
  (typeof IAMMPADMINUSER_I18N_FRAGMENTS)[typeof IAMMPADMINUSER_DEFAULT_LOCALE];
