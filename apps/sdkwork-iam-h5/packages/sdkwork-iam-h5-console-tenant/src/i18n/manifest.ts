// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamH5ConsoleTenantMessages as enUS } from './en-US/iam/h5/tenant.js';
import { iamH5ConsoleTenantMessages as zhCN } from './zh-CN/iam/h5/tenant.js';

/** Locale fragment manifest for `@sdkwork/iam-h5-console-tenant` (I18N_SPEC.md section 6). */
export const IAMH5CONSOLETENANT_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamH5ConsoleTenantLocale = keyof typeof IAMH5CONSOLETENANT_I18N_FRAGMENTS;

export const IAMH5CONSOLETENANT_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamH5ConsoleTenantLocaleMessages =
  (typeof IAMH5CONSOLETENANT_I18N_FRAGMENTS)[typeof IAMH5CONSOLETENANT_DEFAULT_LOCALE];
