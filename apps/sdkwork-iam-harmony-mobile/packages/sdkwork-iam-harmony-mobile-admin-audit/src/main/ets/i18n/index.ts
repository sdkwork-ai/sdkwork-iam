// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Locale projection boundary of `sdkwork-iam-harmony-mobile-admin-audit`.
 *
 * Authority: `I18N_SPEC.md` line 202 — a platform resource index is generated or
 * thin, and authored copy belongs in
 * `<locale>/iam/<capability>/admin-audit.ts` beside this file. This module
 * imports, types and registers those fragments; it authors none.
 */

import { IAM_HARMONY_ADMIN_AUDITMessagesEnUs } from './en-US/iam/admin-audit/admin-audit';
import { IAM_HARMONY_ADMIN_AUDITMessagesZhCn } from './zh-CN/iam/admin-audit/admin-audit';

/** Locales this package ships fragments for. */
export const IAM_HARMONY_ADMIN_AUDIT_SUPPORTED_LOCALES: string[] = ['en-US', 'zh-CN'];

/** Locale used when a caller asks for one this package does not ship. */
export const IAM_HARMONY_ADMIN_AUDIT_DEFAULT_LOCALE: string = 'en-US';

/** Fragment shape of one locale. */
export type IamHarmonyAdminAuditLocaleModule = Record<string, string>;

/** This package's fragments, resolved through a static map. */
export const IAM_HARMONY_ADMIN_AUDIT_FRAGMENTS: Record<string, IamHarmonyAdminAuditLocaleModule> = {
  'en-US': IAM_HARMONY_ADMIN_AUDITMessagesEnUs,
  'zh-CN': IAM_HARMONY_ADMIN_AUDITMessagesZhCn,
};

/**
 * Fragments of one locale.
 *
 * Falls back to the default locale rather than returning an empty table: an empty
 * table renders every key as itself, which reads as a defect on screen and hides
 * the unsupported locale from whoever is looking.
 */
export function iamHarmonyAdminAuditLocaleMessages(locale: string): IamHarmonyAdminAuditLocaleModule {
  const found: IamHarmonyAdminAuditLocaleModule | undefined = IAM_HARMONY_ADMIN_AUDIT_FRAGMENTS[locale];
  return found === undefined
    ? IAM_HARMONY_ADMIN_AUDIT_FRAGMENTS[IAM_HARMONY_ADMIN_AUDIT_DEFAULT_LOCALE]
    : found;
}
