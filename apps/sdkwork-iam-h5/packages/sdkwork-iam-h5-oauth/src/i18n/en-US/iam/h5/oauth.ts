// SDKWORK-IAM-H5-OAUTH-I18N: authored fragment (en-US).
/**
 * Locale fragment: domain `iam`, capability `oauth`, package
 * `@sdkwork/iam-h5-oauth`.
 */
export const iamH5OauthMessages = {
  providers: {
    title: "Third-party sign-in",
    listSection: "Available providers",
    hint: "You will be sent to the provider to approve the sign-in.",
    searchLabel: "Search providers",
    emptyTitle: "No providers",
    emptyDetail: "This deployment offers no third-party sign-in provider.",
    continue: "Continue",
    starting: "Opening…",
    unavailable: "Unavailable",
    openFailed: "Unable to start the sign-in flow.",
  },
  states: {
    errorTitle: "Something went wrong",
    retry: "Retry",
    loading: "Loading",
    loadMore: "Load more",
    emptySearch: "Nothing matched that search.",
  },
  errors: {
    providers: "Unable to load the provider list.",
    more: "Unable to load more.",
  },
};

export type IamH5OauthMessages = typeof iamH5OauthMessages;
