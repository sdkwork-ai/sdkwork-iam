// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamMpAdminTenantMessages as enUS } from './en-US/iam/mp/tenant.js';
import { iamMpAdminTenantMessages as zhCN } from './zh-CN/iam/mp/tenant.js';

/** Locale fragment manifest for `@sdkwork/iam-mp-admin-tenant` (I18N_SPEC.md section 6). */
export const IAMMPADMINTENANT_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamMpAdminTenantLocale = keyof typeof IAMMPADMINTENANT_I18N_FRAGMENTS;

export const IAMMPADMINTENANT_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamMpAdminTenantLocaleMessages =
  (typeof IAMMPADMINTENANT_I18N_FRAGMENTS)[typeof IAMMPADMINTENANT_DEFAULT_LOCALE];
