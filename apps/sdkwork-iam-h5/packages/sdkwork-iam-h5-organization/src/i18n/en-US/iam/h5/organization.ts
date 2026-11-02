// SDKWORK-IAM-H5-ORGANIZATION-I18N: authored fragment (en-US).
/**
 * Locale fragment: domain `iam`, capability `organization`, package
 * `@sdkwork/iam-h5-organization`.
 */
export const iamH5OrganizationMessages = {
  directory: {
    title: "Organizations",
    searchLabel: "Search organizations",
    listSection: "Directory",
    hint: "Organizations you can see in this tenant.",
  },
  states: {
    emptyTitle: "No organizations",
    emptyDetail: "This tenant does not expose an organization yet.",
    emptySearch: "Nothing matched that search.",
    errorTitle: "Something went wrong",
    retry: "Retry",
    loading: "Loading",
    loadMore: "Load more",
  },
  errors: {
    organizations: "Unable to load organizations.",
    more: "Unable to load more.",
  },
};

export type IamH5OrganizationMessages = typeof iamH5OrganizationMessages;
