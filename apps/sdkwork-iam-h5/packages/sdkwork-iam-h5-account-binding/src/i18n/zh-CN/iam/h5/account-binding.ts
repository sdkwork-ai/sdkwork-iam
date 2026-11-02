// SDKWORK-IAM-H5-ACCOUNT-BINDING-I18N: authored fragment (zh-CN).
/**
 * Chinese copy of the account-binding surface, annotated with the default locale's
 * type so a missing or extra key fails compilation.
 */
import type { IamH5AccountBindingMessages } from "../../../en-US/iam/h5/account-binding.js";

export const iamH5AccountBindingMessages: IamH5AccountBindingMessages = {
  binding: {
    title: "账号绑定",
    policySection: "本租户允许的操作",
    emailSection: "邮箱绑定",
    linksSection: "已关联的登录账号",
    policy: {
      contact: "联系方式绑定",
      email: "邮箱绑定",
      phone: "手机号绑定",
      selfServiceLink: "允许自行关联账号",
      selfServiceUnlink: "允许自行解除关联",
    },
    state: {
      enabled: "允许",
      disabled: "不允许",
    },
    email: {
      address: "邮箱地址",
      code: "验证码",
      bind: "绑定邮箱",
      binding: "绑定中…",
      bound: "邮箱已绑定",
      unbindPassword: "密码（用于解绑）",
      unbind: "解绑邮箱",
      unbinding: "解绑中…",
      unbound: "邮箱已解绑",
      hint: "验证码校验通过后该地址才会生效。",
    },
    links: {
      emptyTitle: "暂无关联账号",
      emptyDetail: "可在登录页关联一个登录账号。",
      searchLabel: "搜索已关联账号",
      provider: "提供方",
      unlink: "解除关联",
      confirmUnlink: "确认解除",
      cancel: "取消",
      unlinked: "已解除关联",
      confirmHint: "解除后将无法再用该方式登录你的账号。",
    },
  },
  states: {
    errorTitle: "出错了",
    retry: "重试",
    loading: "加载中",
    loadMore: "加载更多",
    emptySearch: "没有匹配的结果。",
  },
  errors: {
    policy: "无法加载绑定策略。",
    links: "无法加载已关联账号。",
    more: "无法加载更多。",
    bind: "无法绑定该邮箱。",
    unbind: "无法解绑邮箱。",
    unlink: "无法解除该关联。",
  },
};
