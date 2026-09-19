// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamH5AdminTenantMessages as enUS } from './en-US/iam/h5/tenant.js';
import { iamH5AdminTenantMessages as zhCN } from './zh-CN/iam/h5/tenant.js';

/** Locale fragment manifest for `@sdkwork/iam-h5-admin-tenant` (I18N_SPEC.md section 6). */
export const IAMH5ADMINTENANT_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamH5AdminTenantLocale = keyof typeof IAMH5ADMINTENANT_I18N_FRAGMENTS;

export const IAMH5ADMINTENANT_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamH5AdminTenantLocaleMessages =
  (typeof IAMH5ADMINTENANT_I18N_FRAGMENTS)[typeof IAMH5ADMINTENANT_DEFAULT_LOCALE];
