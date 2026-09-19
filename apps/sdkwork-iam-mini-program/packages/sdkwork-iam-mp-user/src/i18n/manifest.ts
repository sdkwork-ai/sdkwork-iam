// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamMpUserMessages as enUS } from './en-US/iam/mp/user.js';
import { iamMpUserMessages as zhCN } from './zh-CN/iam/mp/user.js';

/** Locale fragment manifest for `@sdkwork/iam-mp-user` (I18N_SPEC.md section 6). */
export const IAMMPUSER_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamMpUserLocale = keyof typeof IAMMPUSER_I18N_FRAGMENTS;

export const IAMMPUSER_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamMpUserLocaleMessages =
  (typeof IAMMPUSER_I18N_FRAGMENTS)[typeof IAMMPUSER_DEFAULT_LOCALE];
