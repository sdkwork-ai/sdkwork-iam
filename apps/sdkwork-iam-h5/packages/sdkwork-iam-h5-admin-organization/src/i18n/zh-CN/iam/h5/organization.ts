// SDKWORK-IAM-H5-ADMIN-ORGANIZATION-I18N: authored fragment (zh-CN).
/**
 * Locale fragment: domain `iam`, capability `organization`, package
 * `@sdkwork/iam-h5-admin-organization`.
 *
 * Typed against the `en-US` object so a key added there cannot be forgotten here.
 */
import type { iamH5AdminOrganizationLocaleMessages } from "../../../en-US/iam/h5/organization.js";

export const iamH5AdminOrganizationMessages: iamH5AdminOrganizationLocaleMessages = {
  tree: {
    title: "组织运维",
    subtitle: "该租户的完整组织树（经由 backend-api）。",
    treeSection: "组织树",
    emptyTree: "该租户还没有组织。",
    loading: "加载中…",
    retry: "重试",
  },
  errors: {
    tree: "组织树加载失败。",
  },
};
