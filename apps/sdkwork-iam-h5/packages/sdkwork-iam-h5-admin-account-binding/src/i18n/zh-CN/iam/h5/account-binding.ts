// SDKWORK-IAM-H5-ADMIN-ACCOUNT-BINDING-I18N: authored fragment (zh-CN).
/**
 * Locale fragment: domain `iam`, capability `account-binding`, package
 * `@sdkwork/iam-h5-admin-account-binding`.
 *
 * Typed against the en-US fragment, so the two cannot drift apart key by key.
 */
import type { iamH5AdminAccountBindingLocaleMessages } from "../../../en-US/iam/h5/account-binding.js";

export const iamH5AdminAccountBindingMessages: iamH5AdminAccountBindingLocaleMessages = {
  screen: {
    title: "账号绑定策略",
    subtitle: "该租户为其用户提供的绑定能力。",
    policySection: "自助服务策略",
    contact: "联系方式绑定",
    email: "邮箱绑定",
    oauth: "第三方登录",
    selfServiceUnlink: "自助解除绑定",
    save: "保存策略",
    saving: "保存中…",
    saved: "策略已保存。",
    reloadPolicy: "重新加载策略",
  },
  states: {
    notLoaded: "租户策略尚未加载。",
    loading: "加载中…",
  },
  errors: {
    load: "绑定策略加载失败。",
    save: "绑定策略保存失败。",
    allDisabled: "这会关闭全部绑定能力。仅在确实需要时才清空最后一个开关。",
  },
};
