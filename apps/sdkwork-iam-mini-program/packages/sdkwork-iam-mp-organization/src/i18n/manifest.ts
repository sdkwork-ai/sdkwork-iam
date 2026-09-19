// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamMpOrganizationMessages as enUS } from './en-US/iam/mp/organization.js';
import { iamMpOrganizationMessages as zhCN } from './zh-CN/iam/mp/organization.js';

/** Locale fragment manifest for `@sdkwork/iam-mp-organization` (I18N_SPEC.md section 6). */
export const IAMMPORGANIZATION_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamMpOrganizationLocale = keyof typeof IAMMPORGANIZATION_I18N_FRAGMENTS;

export const IAMMPORGANIZATION_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamMpOrganizationLocaleMessages =
  (typeof IAMMPORGANIZATION_I18N_FRAGMENTS)[typeof IAMMPORGANIZATION_DEFAULT_LOCALE];
