// SDKWORK-IAM-H5-ADMIN-ORGANIZATION-I18N: authored fragment (en-US).
/**
 * Locale fragment: domain `iam`, capability `organization`, package
 * `@sdkwork/iam-h5-admin-organization`.
 *
 * Grouped by screen region so a key added here cannot be forgotten in `zh-CN`: that
 * fragment is typed against this object.
 */
export const iamH5AdminOrganizationMessages = {
  tree: {
    title: "Organization operations",
    subtitle: "The whole tenant organization tree, over the backend-api.",
    treeSection: "Organization tree",
    emptyTree: "This tenant has no organization yet.",
    loading: "Loading…",
    retry: "Retry",
  },
  errors: {
    tree: "Could not load the organization tree.",
  },
};

export type iamH5AdminOrganizationLocaleMessages = typeof iamH5AdminOrganizationMessages;
