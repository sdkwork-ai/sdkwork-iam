// SDKWORK-IAM-H5-USER-I18N: authored locale manifest.
import { iamH5UserMessages as enUS } from "./en-US/iam/h5/user.js";
import { iamH5UserMessages as zhCN } from "./zh-CN/iam/h5/user.js";
import { iamH5UserCenterMessages as enUSUserCenter } from "./en-US/iam/h5/user-center.js";
import { iamH5UserCenterMessages as zhCNUserCenter } from "./zh-CN/iam/h5/user-center.js";

export const IAMH5USER_I18N_FRAGMENTS = {
  "en-US": enUS,
  "zh-CN": zhCN,
} as const;

export type iamH5UserLocale = keyof typeof IAMH5USER_I18N_FRAGMENTS;
export const IAMH5USER_DEFAULT_LOCALE = "en-US" as const;
export type iamH5UserLocaleMessages =
  (typeof IAMH5USER_I18N_FRAGMENTS)[typeof IAMH5USER_DEFAULT_LOCALE];

export const IAMH5USER_USERCENTER_I18N_FRAGMENTS = {
  "en-US": enUSUserCenter,
  "zh-CN": zhCNUserCenter,
} as const;

export type iamH5UserUserCenterLocale = keyof typeof IAMH5USER_USERCENTER_I18N_FRAGMENTS;
export const IAMH5USER_USERCENTER_DEFAULT_LOCALE = "en-US" as const;
export type iamH5UserUserCenterLocaleMessages = {
  [Key in keyof typeof enUSUserCenter]: string;
};
