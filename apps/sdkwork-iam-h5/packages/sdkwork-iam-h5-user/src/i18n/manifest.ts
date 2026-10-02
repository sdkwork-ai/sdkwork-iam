// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
// Authored extension (pre-existing package): the Me-page fragment below follows
// I18N_SPEC.md section 6 fragmenting; values widen to `string` so every locale
// satisfies the key shape of the default locale.
import { iamH5UserMessages as enUS } from './en-US/iam/h5/user.js';
import { iamH5UserMessages as zhCN } from './zh-CN/iam/h5/user.js';
import { iamH5UserCenterMessages as userCenterEnUS } from './en-US/iam/h5/user-center.js';
import { iamH5UserCenterMessages as userCenterZhCN } from './zh-CN/iam/h5/user-center.js';

/** Locale fragment manifest for `@sdkwork/iam-h5-user` (I18N_SPEC.md section 6). */
export const IAMH5USER_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type iamH5UserLocale = keyof typeof IAMH5USER_I18N_FRAGMENTS;

export const IAMH5USER_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type iamH5UserLocaleMessages =
  (typeof IAMH5USER_I18N_FRAGMENTS)[typeof IAMH5USER_DEFAULT_LOCALE];

/** Locale fragment manifest for the user-center "Me" page fragment. */
export const IAMH5USER_USERCENTER_I18N_FRAGMENTS = {
  'en-US': userCenterEnUS,
  'zh-CN': userCenterZhCN,
} as const;

export type iamH5UserUserCenterLocale = keyof typeof IAMH5USER_USERCENTER_I18N_FRAGMENTS;

/** Message keys of the default locale; every locale must satisfy the shape. */
export type iamH5UserUserCenterLocaleMessages = Record<
  keyof (typeof IAMH5USER_USERCENTER_I18N_FRAGMENTS)[typeof IAMH5USER_DEFAULT_LOCALE],
  string
>;
