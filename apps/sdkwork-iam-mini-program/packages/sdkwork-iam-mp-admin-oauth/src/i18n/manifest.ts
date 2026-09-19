// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamMpAdminOauthMessages as enUS } from './en-US/iam/mp/oauth.js';
import { iamMpAdminOauthMessages as zhCN } from './zh-CN/iam/mp/oauth.js';

/** Locale fragment manifest for `@sdkwork/iam-mp-admin-oauth` (I18N_SPEC.md section 6). */
export const IAMMPADMINOAUTH_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamMpAdminOauthLocale = keyof typeof IAMMPADMINOAUTH_I18N_FRAGMENTS;

export const IAMMPADMINOAUTH_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamMpAdminOauthLocaleMessages =
  (typeof IAMMPADMINOAUTH_I18N_FRAGMENTS)[typeof IAMMPADMINOAUTH_DEFAULT_LOCALE];
