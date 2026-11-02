// SDKWORK-IAM-H5-CONSOLE-ORGANIZATION-I18N: authored fragment (en-US).
/**
 * Locale fragment: domain `iam`, capability `organization`, package
 * `@sdkwork/iam-h5-console-organization`.
 *
 * Keys are grouped by screen region rather than flattened, so a key added here
 * cannot be forgotten in `zh-CN`: that fragment is typed against this object.
 */
export const iamH5ConsoleOrganizationMessages = {
  directory: {
    title: "Organization management",
    subtitle: "Every organization of the tenant you are acting in.",
    searchOrganizations: "Search organizations",
    organizationsSection: "Organizations",
  },
  states: {
    loading: "Loading…",
    loadMore: "Load more",
    retry: "Retry",
    emptyOrganizations: "This tenant has no organizations yet.",
    emptyOrganizationsDetail: "Create one from the PC console, or invite an organization owner.",
    emptySearch: "Nothing matched that search.",
    errorTitle: "Something went wrong",
  },
  errors: {
    organizations: "Could not load organizations.",
    more: "Unable to load more.",
  },
};

export type iamH5ConsoleOrganizationLocaleMessages = typeof iamH5ConsoleOrganizationMessages;
