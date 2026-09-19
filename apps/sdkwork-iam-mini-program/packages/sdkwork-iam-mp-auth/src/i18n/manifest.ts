// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamMpAuthMessages as enUS } from './en-US/iam/mp/auth.js';
import { iamMpAuthMessages as zhCN } from './zh-CN/iam/mp/auth.js';

/** Locale fragment manifest for `@sdkwork/iam-mp-auth` (I18N_SPEC.md section 6). */
export const IAMMPAUTH_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamMpAuthLocale = keyof typeof IAMMPAUTH_I18N_FRAGMENTS;

export const IAMMPAUTH_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamMpAuthLocaleMessages =
  (typeof IAMMPAUTH_I18N_FRAGMENTS)[typeof IAMMPAUTH_DEFAULT_LOCALE];
