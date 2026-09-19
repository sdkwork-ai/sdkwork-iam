// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamH5UserCenterMessages as enUS } from './en-US/iam/h5/user-center.js';
import { iamH5UserCenterMessages as zhCN } from './zh-CN/iam/h5/user-center.js';

/** Locale fragment manifest for `@sdkwork/iam-h5-user-center` (I18N_SPEC.md section 6). */
export const IAMH5USERCENTER_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamH5UserCenterLocale = keyof typeof IAMH5USERCENTER_I18N_FRAGMENTS;

export const IAMH5USERCENTER_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamH5UserCenterLocaleMessages =
  (typeof IAMH5USERCENTER_I18N_FRAGMENTS)[typeof IAMH5USERCENTER_DEFAULT_LOCALE];
