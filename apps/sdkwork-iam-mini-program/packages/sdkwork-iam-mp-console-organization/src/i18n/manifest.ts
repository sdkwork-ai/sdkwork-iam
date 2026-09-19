// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamMpConsoleOrganizationMessages as enUS } from './en-US/iam/mp/organization.js';
import { iamMpConsoleOrganizationMessages as zhCN } from './zh-CN/iam/mp/organization.js';

/** Locale fragment manifest for `@sdkwork/iam-mp-console-organization` (I18N_SPEC.md section 6). */
export const IAMMPCONSOLEORGANIZATION_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamMpConsoleOrganizationLocale = keyof typeof IAMMPCONSOLEORGANIZATION_I18N_FRAGMENTS;

export const IAMMPCONSOLEORGANIZATION_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamMpConsoleOrganizationLocaleMessages =
  (typeof IAMMPCONSOLEORGANIZATION_I18N_FRAGMENTS)[typeof IAMMPCONSOLEORGANIZATION_DEFAULT_LOCALE];
