// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamH5ConsoleCloudAccountMessages as enUS } from './en-US/iam/h5/cloud-account.js';
import { iamH5ConsoleCloudAccountMessages as zhCN } from './zh-CN/iam/h5/cloud-account.js';

/** Locale fragment manifest for `@sdkwork/iam-h5-console-cloud-account` (I18N_SPEC.md section 6). */
export const IAMH5CONSOLECLOUDACCOUNT_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamH5ConsoleCloudAccountLocale = keyof typeof IAMH5CONSOLECLOUDACCOUNT_I18N_FRAGMENTS;

export const IAMH5CONSOLECLOUDACCOUNT_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamH5ConsoleCloudAccountLocaleMessages =
  (typeof IAMH5CONSOLECLOUDACCOUNT_I18N_FRAGMENTS)[typeof IAMH5CONSOLECLOUDACCOUNT_DEFAULT_LOCALE];
