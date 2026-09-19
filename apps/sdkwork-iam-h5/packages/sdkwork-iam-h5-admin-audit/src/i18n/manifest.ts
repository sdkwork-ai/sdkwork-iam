// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamH5AdminAuditMessages as enUS } from './en-US/iam/h5/audit.js';
import { iamH5AdminAuditMessages as zhCN } from './zh-CN/iam/h5/audit.js';

/** Locale fragment manifest for `@sdkwork/iam-h5-admin-audit` (I18N_SPEC.md section 6). */
export const IAMH5ADMINAUDIT_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamH5AdminAuditLocale = keyof typeof IAMH5ADMINAUDIT_I18N_FRAGMENTS;

export const IAMH5ADMINAUDIT_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamH5AdminAuditLocaleMessages =
  (typeof IAMH5ADMINAUDIT_I18N_FRAGMENTS)[typeof IAMH5ADMINAUDIT_DEFAULT_LOCALE];
