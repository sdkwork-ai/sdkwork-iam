// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamH5AdminOrganizationMessages as enUS } from './en-US/iam/h5/organization.js';
import { iamH5AdminOrganizationMessages as zhCN } from './zh-CN/iam/h5/organization.js';

/** Locale fragment manifest for `@sdkwork/iam-h5-admin-organization` (I18N_SPEC.md section 6). */
export const IAMH5ADMINORGANIZATION_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamH5AdminOrganizationLocale = keyof typeof IAMH5ADMINORGANIZATION_I18N_FRAGMENTS;

export const IAMH5ADMINORGANIZATION_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamH5AdminOrganizationLocaleMessages =
  (typeof IAMH5ADMINORGANIZATION_I18N_FRAGMENTS)[typeof IAMH5ADMINORGANIZATION_DEFAULT_LOCALE];
