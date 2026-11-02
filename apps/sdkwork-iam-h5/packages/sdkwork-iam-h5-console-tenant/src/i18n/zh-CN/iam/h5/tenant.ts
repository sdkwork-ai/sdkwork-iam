// SDKWORK-IAM-H5-CONSOLE-TENANT-I18N: authored fragment (zh-CN).
/**
 * Locale fragment: domain `iam`, capability `tenant`, package
 * `@sdkwork/iam-h5-console-tenant`.
 *
 * Typed against the `en-US` object so a key added there cannot be forgotten here.
 */
import type { iamH5ConsoleTenantLocaleMessages } from "../../../en-US/iam/h5/tenant.js";

export const iamH5ConsoleTenantMessages: iamH5ConsoleTenantLocaleMessages = {
  overview: {
    title: "租户管理",
    subtitle: "当前操作的租户、其组织，以及自助服务策略。",
    sessionSection: "当前会话",
    policySection: "自助服务策略",
    organizationsSection: "组织",
    runtime: {
      environment: "环境",
      tenant: "租户",
      user: "操作人",
    },
    policy: {
      contact: "联系方式绑定",
      email: "邮箱绑定",
      oauth: "第三方登录",
      unlink: "自助解除绑定",
    },
    allowed: "允许",
    denied: "不允许",
    notReported: "未提供",
    searchOrganizations: "搜索组织",
  },
  states: {
    loading: "加载中…",
    retry: "重试",
    loadMore: "加载更多",
    emptyOrganizations: "该租户还没有组织。",
    emptySearch: "没有匹配的结果。",
    errorTitle: "出错了",
  },
  errors: {
    runtime: "无法读取会话上下文。",
    policy: "无法读取自助服务策略。",
    organizations: "组织加载失败。",
    more: "加载更多失败。",
  },
};
