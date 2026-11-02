// SDKWORK-IAM-H5-TENANT-I18N: authored fragment (zh-CN).
/**
 * Locale fragment: domain `iam`, capability `tenant`, package
 * `@sdkwork/iam-h5-tenant`.
 *
 * Annotated with the default locale's type, so a key that exists only here — or
 * only there — fails compilation instead of shipping as a raw message key.
 */
import type { IamH5TenantMessages } from "../../../en-US/iam/h5/tenant.js";

export const iamH5TenantMessages: IamH5TenantMessages = {
  overview: {
    title: "租户",
    runtimeSection: "当前会话",
    organizationsSection: "组织",
    membershipsSection: "我的成员关系",
    runtime: {
      tenant: "租户",
      user: "用户",
      environment: "环境",
      deployment: "部署形态",
    },
    notReported: "未提供",
    searchOrganizations: "搜索组织",
    searchMemberships: "搜索成员关系",
  },
  states: {
    errorTitle: "出错了",
    retry: "重试",
    loadMore: "加载更多",
    loading: "加载中",
    emptyOrganizations: "暂无组织",
    emptyOrganizationsDetail: "该租户尚未提供组织。",
    emptyMemberships: "暂无成员关系",
    emptyMembershipsDetail: "你在该租户下不属于任何组织。",
    emptySearch: "没有匹配的结果。",
  },
  errors: {
    runtime: "无法加载会话上下文。",
    organizations: "无法加载组织。",
    memberships: "无法加载成员关系。",
    more: "无法加载更多。",
  },
};
