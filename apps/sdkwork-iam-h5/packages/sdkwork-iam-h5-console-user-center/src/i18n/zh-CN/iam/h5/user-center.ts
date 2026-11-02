// SDKWORK-IAM-H5-CONSOLE-USER-CENTER-I18N: authored fragment (zh-CN).
/**
 * Locale fragment: domain `iam`, capability `user-center`, package
 * `@sdkwork/iam-h5-console-user-center`.
 *
 * Typed against the `en-US` object so a key added there cannot be forgotten here.
 */
import type { iamH5ConsoleUserCenterLocaleMessages } from "../../../en-US/iam/h5/user-center.js";

export const iamH5ConsoleUserCenterMessages: iamH5ConsoleUserCenterLocaleMessages = {
  profile: {
    title: "用户中心",
    subtitle: "当前登录用户自身的账号信息（控制台视角）。",
    accountSection: "账号",
    verificationSection: "验证策略",
    userId: "用户",
    displayName: "显示名称",
    email: "邮箱",
    phone: "手机号",
    notReported: "未提供",
    verification: {
      contact: "联系方式验证",
      email: "邮箱验证",
      oauth: "第三方登录",
    },
    required: "必需",
    optional: "可选",
  },
  states: {
    loading: "加载中…",
    retry: "重试",
  },
  errors: {
    account: "无法读取账号信息。",
    verification: "无法读取验证策略。",
  },
};
