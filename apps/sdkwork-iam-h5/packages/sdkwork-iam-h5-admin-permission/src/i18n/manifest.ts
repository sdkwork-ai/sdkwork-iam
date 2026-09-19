// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { iamH5AdminPermissionMessages as enUS } from './en-US/iam/h5/permission.js';
import { iamH5AdminPermissionMessages as zhCN } from './zh-CN/iam/h5/permission.js';

/** Locale fragment manifest for `@sdkwork/iam-h5-admin-permission` (I18N_SPEC.md section 6). */
export const IAMH5ADMINPERMISSION_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamH5AdminPermissionLocale = keyof typeof IAMH5ADMINPERMISSION_I18N_FRAGMENTS;

export const IAMH5ADMINPERMISSION_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamH5AdminPermissionLocaleMessages =
  (typeof IAMH5ADMINPERMISSION_I18N_FRAGMENTS)[typeof IAMH5ADMINPERMISSION_DEFAULT_LOCALE];
