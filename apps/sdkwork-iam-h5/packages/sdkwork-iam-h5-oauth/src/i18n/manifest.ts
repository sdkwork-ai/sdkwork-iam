// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamH5OauthMessages as enUS } from './en-US/iam/h5/oauth.js';
import { iamH5OauthMessages as zhCN } from './zh-CN/iam/h5/oauth.js';

/** Locale fragment manifest for `@sdkwork/iam-h5-oauth` (I18N_SPEC.md section 6). */
export const IAMH5OAUTH_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamH5OauthLocale = keyof typeof IAMH5OAUTH_I18N_FRAGMENTS;

export const IAMH5OAUTH_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamH5OauthLocaleMessages =
  (typeof IAMH5OAUTH_I18N_FRAGMENTS)[typeof IAMH5OAUTH_DEFAULT_LOCALE];
