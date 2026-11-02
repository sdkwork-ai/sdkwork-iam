// SDKWORK-IAM-H5-ADMIN-TENANT-I18N: authored fragment (zh-CN).
/**
 * Locale fragment: domain `iam`, capability `tenant`, package
 * `@sdkwork/iam-h5-admin-tenant`.
 *
 * Typed against the `en-US` object so a key added there cannot be forgotten here.
 */
import type { iamH5AdminTenantLocaleMessages } from "../../../en-US/iam/h5/tenant.js";

export const iamH5AdminTenantMessages: iamH5AdminTenantLocaleMessages = {
  list: {
    title: "租户运维",
    subtitle: "该部署上的全部租户（经由 backend-api）。",
    searchTenants: "搜索租户",
    tenantsSection: "租户",
    status: "状态",
  },
  states: {
    loading: "加载中…",
    loadMore: "加载更多",
    retry: "重试",
    emptyTenants: "该部署还没有租户。",
    emptyTenantsDetail: "可在 PC 管理台创建。",
    emptySearch: "没有匹配的结果。",
    errorTitle: "出错了",
  },
  errors: {
    tenants: "租户列表加载失败。",
    more: "加载更多失败。",
  },
};
