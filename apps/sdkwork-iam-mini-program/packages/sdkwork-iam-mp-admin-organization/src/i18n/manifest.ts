// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamMpAdminOrganizationMessages as enUS } from './en-US/iam/mp/organization.js';
import { iamMpAdminOrganizationMessages as zhCN } from './zh-CN/iam/mp/organization.js';

/** Locale fragment manifest for `@sdkwork/iam-mp-admin-organization` (I18N_SPEC.md section 6). */
export const IAMMPADMINORGANIZATION_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamMpAdminOrganizationLocale = keyof typeof IAMMPADMINORGANIZATION_I18N_FRAGMENTS;

export const IAMMPADMINORGANIZATION_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamMpAdminOrganizationLocaleMessages =
  (typeof IAMMPADMINORGANIZATION_I18N_FRAGMENTS)[typeof IAMMPADMINORGANIZATION_DEFAULT_LOCALE];
