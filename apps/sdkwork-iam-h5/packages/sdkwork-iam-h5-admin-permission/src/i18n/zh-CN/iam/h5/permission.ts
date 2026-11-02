// SDKWORK-IAM-H5-ADMIN-PERMISSION-I18N: authored fragment (zh-CN).
/**
 * Locale fragment: domain `iam`, capability `permission`, package
 * `@sdkwork/iam-h5-admin-permission`.
 *
 * Typed against the `en-US` object so a key added there cannot be forgotten here.
 */
import type { iamH5AdminPermissionLocaleMessages } from "../../../en-US/iam/h5/permission.js";

export const iamH5AdminPermissionMessages: iamH5AdminPermissionLocaleMessages = {
  permissions: {
    title: "权限",
    subtitle: "该租户的权限目录（经由 backend-api）。",
    searchPermissions: "搜索权限",
    permissionsSection: "权限目录",
    code: "编码",
    resource: "资源",
    action: "动作",
  },
  roles: { title: "角色" },
  policies: { title: "策略" },
  authorizations: { title: "授权" },
  states: {
    loading: "加载中…",
    loadMore: "加载更多",
    retry: "重试",
    emptyPermissions: "该租户还没有权限。",
    emptyPermissionsDetail: "可在 PC 管理台创建，或导入权限目录。",
    emptySearch: "没有匹配的结果。",
    errorTitle: "出错了",
  },
  errors: {
    permissions: "权限目录加载失败。",
    more: "加载更多失败。",
  },
};
