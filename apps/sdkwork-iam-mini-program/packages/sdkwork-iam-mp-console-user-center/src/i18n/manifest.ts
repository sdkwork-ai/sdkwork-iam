// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamMpConsoleUserCenterMessages as enUS } from './en-US/iam/mp/user-center.js';
import { iamMpConsoleUserCenterMessages as zhCN } from './zh-CN/iam/mp/user-center.js';

/** Locale fragment manifest for `@sdkwork/iam-mp-console-user-center` (I18N_SPEC.md section 6). */
export const IAMMPCONSOLEUSERCENTER_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamMpConsoleUserCenterLocale = keyof typeof IAMMPCONSOLEUSERCENTER_I18N_FRAGMENTS;

export const IAMMPCONSOLEUSERCENTER_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamMpConsoleUserCenterLocaleMessages =
  (typeof IAMMPCONSOLEUSERCENTER_I18N_FRAGMENTS)[typeof IAMMPCONSOLEUSERCENTER_DEFAULT_LOCALE];
