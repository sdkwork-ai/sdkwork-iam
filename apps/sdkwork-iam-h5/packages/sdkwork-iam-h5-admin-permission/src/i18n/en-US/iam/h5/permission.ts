// SDKWORK-IAM-H5-ADMIN-PERMISSION-I18N: authored fragment (en-US).
/**
 * Locale fragment: domain `iam`, capability `permission`, package
 * `@sdkwork/iam-h5-admin-permission`.
 *
 * Grouped by screen region so a key added here cannot be forgotten in `zh-CN`: that
 * fragment is typed against this object.
 */
export const iamH5AdminPermissionMessages = {
  permissions: {
    title: "Permissions",
    subtitle: "The tenant's permission catalog, over the backend-api.",
    searchPermissions: "Search permissions",
    permissionsSection: "Permission catalog",
    code: "Code",
    resource: "Resource",
    action: "Action",
  },
  roles: {
    title: "Roles",
    searchRoles: "Search roles",
    rolesSection: "Role catalog",
  },
  policies: {
    title: "Policies",
    searchPolicies: "Search policies",
    policiesSection: "Policy catalog",
  },
  authorizations: { title: "Authorizations" },
  states: {
    loading: "Loading…",
    loadMore: "Load more",
    retry: "Retry",
    emptyPermissions: "This tenant has no permission yet.",
    emptyPermissionsDetail: "Create one from the PC admin console, or import a catalog.",
    emptyRoles: "This tenant has no role yet.",
    emptyRolesDetail: "Create one from the PC admin console.",
    emptyPolicies: "This tenant has no policy yet.",
    emptyPoliciesDetail: "Create one from the PC admin console.",
    emptySearch: "Nothing matched that search.",
    errorTitle: "Something went wrong",
  },
  errors: {
    permissions: "Could not load the permission catalog.",
    roles: "Could not load the role catalog.",
    policies: "Could not load the policy catalog.",
    more: "Unable to load more.",
  },
};

export type iamH5AdminPermissionLocaleMessages = typeof iamH5AdminPermissionMessages;
