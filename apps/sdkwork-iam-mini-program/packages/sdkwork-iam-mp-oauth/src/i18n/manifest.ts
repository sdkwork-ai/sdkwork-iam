// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamMpOauthMessages as enUS } from './en-US/iam/mp/oauth.js';
import { iamMpOauthMessages as zhCN } from './zh-CN/iam/mp/oauth.js';

/** Locale fragment manifest for `@sdkwork/iam-mp-oauth` (I18N_SPEC.md section 6). */
export const IAMMPOAUTH_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamMpOauthLocale = keyof typeof IAMMPOAUTH_I18N_FRAGMENTS;

export const IAMMPOAUTH_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamMpOauthLocaleMessages =
  (typeof IAMMPOAUTH_I18N_FRAGMENTS)[typeof IAMMPOAUTH_DEFAULT_LOCALE];
