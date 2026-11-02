// SDKWORK-IAM-H5-CONSOLE-ORGANIZATION-I18N: authored fragment (zh-CN).
/**
 * Locale fragment: domain `iam`, capability `organization`, package
 * `@sdkwork/iam-h5-console-organization`.
 *
 * Typed against the `en-US` object so a key added there cannot be forgotten here.
 */
import type { iamH5ConsoleOrganizationLocaleMessages } from "../../../en-US/iam/h5/organization.js";

export const iamH5ConsoleOrganizationMessages: iamH5ConsoleOrganizationLocaleMessages = {
  directory: {
    title: "组织管理",
    subtitle: "当前操作的租户下的全部组织。",
    searchOrganizations: "搜索组织",
    organizationsSection: "组织",
  },
  states: {
    loading: "加载中…",
    loadMore: "加载更多",
    retry: "重试",
    emptyOrganizations: "该租户还没有组织。",
    emptyOrganizationsDetail: "可在 PC 控制台创建，或邀请组织负责人。",
    emptySearch: "没有匹配的结果。",
    errorTitle: "出错了",
  },
  errors: {
    organizations: "组织加载失败。",
    more: "加载更多失败。",
  },
};
