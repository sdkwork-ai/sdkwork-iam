// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamMpAdminAuditMessages as enUS } from './en-US/iam/mp/audit.js';
import { iamMpAdminAuditMessages as zhCN } from './zh-CN/iam/mp/audit.js';

/** Locale fragment manifest for `@sdkwork/iam-mp-admin-audit` (I18N_SPEC.md section 6). */
export const IAMMPADMINAUDIT_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamMpAdminAuditLocale = keyof typeof IAMMPADMINAUDIT_I18N_FRAGMENTS;

export const IAMMPADMINAUDIT_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamMpAdminAuditLocaleMessages =
  (typeof IAMMPADMINAUDIT_I18N_FRAGMENTS)[typeof IAMMPADMINAUDIT_DEFAULT_LOCALE];
