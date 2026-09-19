// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamMpUserCenterMessages as enUS } from './en-US/iam/mp/user-center.js';
import { iamMpUserCenterMessages as zhCN } from './zh-CN/iam/mp/user-center.js';

/** Locale fragment manifest for `@sdkwork/iam-mp-user-center` (I18N_SPEC.md section 6). */
export const IAMMPUSERCENTER_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamMpUserCenterLocale = keyof typeof IAMMPUSERCENTER_I18N_FRAGMENTS;

export const IAMMPUSERCENTER_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamMpUserCenterLocaleMessages =
  (typeof IAMMPUSERCENTER_I18N_FRAGMENTS)[typeof IAMMPUSERCENTER_DEFAULT_LOCALE];
