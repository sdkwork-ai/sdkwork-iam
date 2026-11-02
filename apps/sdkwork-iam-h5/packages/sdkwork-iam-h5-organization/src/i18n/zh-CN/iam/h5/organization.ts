// SDKWORK-IAM-H5-ORGANIZATION-I18N: authored fragment (zh-CN).
/**
 * Chinese copy of the organization directory, annotated with the default locale's
 * type so a missing or extra key fails compilation.
 */
import type { IamH5OrganizationMessages } from "../../../en-US/iam/h5/organization.js";

export const iamH5OrganizationMessages: IamH5OrganizationMessages = {
  directory: {
    title: "组织",
    searchLabel: "搜索组织",
    listSection: "组织通讯录",
    hint: "你在该租户下可见的组织。",
  },
  states: {
    emptyTitle: "暂无组织",
    emptyDetail: "该租户尚未提供组织。",
    emptySearch: "没有匹配的结果。",
    errorTitle: "出错了",
    retry: "重试",
    loading: "加载中",
    loadMore: "加载更多",
  },
  errors: {
    organizations: "无法加载组织。",
    more: "无法加载更多。",
  },
};
