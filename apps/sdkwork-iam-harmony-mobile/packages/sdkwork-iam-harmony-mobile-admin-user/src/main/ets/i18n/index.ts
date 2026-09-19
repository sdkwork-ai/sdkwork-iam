// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Locale projection boundary of `sdkwork-iam-harmony-mobile-admin-user`.
 *
 * Authority: `I18N_SPEC.md` line 202 — a platform resource index is generated or
 * thin, and authored copy belongs in
 * `<locale>/iam/<capability>/admin-user.ts` beside this file. This module
 * imports, types and registers those fragments; it authors none.
 */

import { IAM_HARMONY_ADMIN_USERMessagesEnUs } from './en-US/iam/admin-user/admin-user';
import { IAM_HARMONY_ADMIN_USERMessagesZhCn } from './zh-CN/iam/admin-user/admin-user';

/** Locales this package ships fragments for. */
export const IAM_HARMONY_ADMIN_USER_SUPPORTED_LOCALES: string[] = ['en-US', 'zh-CN'];

/** Locale used when a caller asks for one this package does not ship. */
export const IAM_HARMONY_ADMIN_USER_DEFAULT_LOCALE: string = 'en-US';

/** Fragment shape of one locale. */
export type IamHarmonyAdminUserLocaleModule = Record<string, string>;

/** This package's fragments, resolved through a static map. */
export const IAM_HARMONY_ADMIN_USER_FRAGMENTS: Record<string, IamHarmonyAdminUserLocaleModule> = {
  'en-US': IAM_HARMONY_ADMIN_USERMessagesEnUs,
  'zh-CN': IAM_HARMONY_ADMIN_USERMessagesZhCn,
};

/**
 * Fragments of one locale.
 *
 * Falls back to the default locale rather than returning an empty table: an empty
 * table renders every key as itself, which reads as a defect on screen and hides
 * the unsupported locale from whoever is looking.
 */
export function iamHarmonyAdminUserLocaleMessages(locale: string): IamHarmonyAdminUserLocaleModule {
  const found: IamHarmonyAdminUserLocaleModule | undefined = IAM_HARMONY_ADMIN_USER_FRAGMENTS[locale];
  return found === undefined
    ? IAM_HARMONY_ADMIN_USER_FRAGMENTS[IAM_HARMONY_ADMIN_USER_DEFAULT_LOCALE]
    : found;
}
