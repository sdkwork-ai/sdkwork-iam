// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamMpTenantMessages as enUS } from './en-US/iam/mp/tenant.js';
import { iamMpTenantMessages as zhCN } from './zh-CN/iam/mp/tenant.js';

/** Locale fragment manifest for `@sdkwork/iam-mp-tenant` (I18N_SPEC.md section 6). */
export const IAMMPTENANT_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamMpTenantLocale = keyof typeof IAMMPTENANT_I18N_FRAGMENTS;

export const IAMMPTENANT_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamMpTenantLocaleMessages =
  (typeof IAMMPTENANT_I18N_FRAGMENTS)[typeof IAMMPTENANT_DEFAULT_LOCALE];
