// SDKWORK-IAM-H5-TENANT-I18N: authored fragment (en-US).
/**
 * Locale fragment: domain `iam`, capability `tenant`, package
 * `@sdkwork/iam-h5-tenant`.
 *
 * Keys are grouped by screen region rather than flattened, so a new key cannot
 * be added to one locale and forgotten in the other: the `zh-CN` fragment is
 * annotated with this object's type.
 *
 * The object is deliberately **not** `as const`: a literal-typed default locale
 * would make every other locale's translated string a type error, and the
 * guarantee this file needs is "same shape", not "same text".
 */
export const iamH5TenantMessages = {
  overview: {
    title: "Tenant",
    runtimeSection: "Session",
    organizationsSection: "Organizations",
    membershipsSection: "My memberships",
    runtime: {
      tenant: "Tenant",
      user: "User",
      environment: "Environment",
      deployment: "Deployment",
    },
    notReported: "Not reported",
    searchOrganizations: "Search organizations",
    searchMemberships: "Search memberships",
  },
  states: {
    errorTitle: "Something went wrong",
    retry: "Retry",
    loadMore: "Load more",
    loading: "Loading",
    emptyOrganizations: "No organizations",
    emptyOrganizationsDetail: "This tenant does not expose an organization yet.",
    emptyMemberships: "No memberships",
    emptyMembershipsDetail: "You are not a member of any organization in this tenant.",
    emptySearch: "Nothing matched that search.",
  },
  errors: {
    runtime: "Unable to load the session context.",
    organizations: "Unable to load organizations.",
    memberships: "Unable to load memberships.",
    more: "Unable to load more.",
  },
};

export type IamH5TenantMessages = typeof iamH5TenantMessages;
