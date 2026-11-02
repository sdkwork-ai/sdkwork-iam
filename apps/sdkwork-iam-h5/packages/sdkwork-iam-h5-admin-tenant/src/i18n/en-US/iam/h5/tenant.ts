// SDKWORK-IAM-H5-ADMIN-TENANT-I18N: authored fragment (en-US).
/**
 * Locale fragment: domain `iam`, capability `tenant`, package
 * `@sdkwork/iam-h5-admin-tenant`.
 *
 * Grouped by screen region so a key added here cannot be forgotten in `zh-CN`: that
 * fragment is typed against this object.
 */
export const iamH5AdminTenantMessages = {
  list: {
    title: "Tenant operations",
    subtitle: "Every tenant on this deployment, over the backend-api.",
    searchTenants: "Search tenants",
    tenantsSection: "Tenants",
    status: "Status",
  },
  states: {
    loading: "Loading…",
    loadMore: "Load more",
    retry: "Retry",
    emptyTenants: "No tenant exists on this deployment yet.",
    emptyTenantsDetail: "Create one from the PC admin console.",
    emptySearch: "Nothing matched that search.",
    errorTitle: "Something went wrong",
  },
  errors: {
    tenants: "Could not load the tenant list.",
    more: "Unable to load more.",
  },
};

export type iamH5AdminTenantLocaleMessages = typeof iamH5AdminTenantMessages;
