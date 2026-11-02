// SDKWORK-IAM-H5-CONSOLE-ACCOUNT-BINDING-I18N: authored fragment (zh-CN).
/**
 * Locale fragment: domain `iam`, capability `account-binding`, package
 * `@sdkwork/iam-h5-console-account-binding`.
 *
 * Typed against the `en-US` object so a key added there cannot be forgotten here.
 */
import type { iamH5ConsoleAccountBindingLocaleMessages } from "../../../en-US/iam/h5/account-binding.js";

export const iamH5ConsoleAccountBindingMessages: iamH5ConsoleAccountBindingLocaleMessages = {
  list: {
    title: "账号绑定管理",
    policySection: "自助服务策略",
    linksSection: "已绑定身份",
    policy: {
      contact: "联系方式绑定",
      email: "邮箱绑定",
      oauth: "第三方登录",
      unlink: "自助解除绑定",
    },
    allowed: "允许",
    denied: "不允许",
    unlink: "解除",
    unlinkConfirm: "确定为该用户解除此登录方式？",
    cancel: "取消",
  },
  states: {
    loading: "加载中…",
    emptyLinks: "该用户暂无已绑定身份。",
  },
  errors: {
    policy: "无法读取绑定策略。",
    links: "绑定身份加载失败。",
    unlink: "解除绑定失败。",
  },
};
