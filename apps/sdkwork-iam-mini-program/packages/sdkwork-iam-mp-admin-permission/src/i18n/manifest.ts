// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamMpAdminPermissionMessages as enUS } from './en-US/iam/mp/permission.js';
import { iamMpAdminPermissionMessages as zhCN } from './zh-CN/iam/mp/permission.js';

/** Locale fragment manifest for `@sdkwork/iam-mp-admin-permission` (I18N_SPEC.md section 6). */
export const IAMMPADMINPERMISSION_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamMpAdminPermissionLocale = keyof typeof IAMMPADMINPERMISSION_I18N_FRAGMENTS;

export const IAMMPADMINPERMISSION_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamMpAdminPermissionLocaleMessages =
  (typeof IAMMPADMINPERMISSION_I18N_FRAGMENTS)[typeof IAMMPADMINPERMISSION_DEFAULT_LOCALE];
