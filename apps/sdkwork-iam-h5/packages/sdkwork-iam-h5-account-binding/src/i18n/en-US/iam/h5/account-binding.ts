// SDKWORK-IAM-H5-ACCOUNT-BINDING-I18N: authored fragment (en-US).
/**
 * Locale fragment: domain `iam`, capability `account-binding`, package
 * `@sdkwork/iam-h5-account-binding`.
 */
export const iamH5AccountBindingMessages = {
  binding: {
    title: "Account binding",
    policySection: "What this tenant allows",
    emailSection: "Email binding",
    linksSection: "Linked sign-in accounts",
    policy: {
      contact: "Contact binding",
      email: "Email binding",
      phone: "Phone binding",
      selfServiceLink: "Link accounts yourself",
      selfServiceUnlink: "Unlink accounts yourself",
    },
    state: {
      enabled: "Allowed",
      disabled: "Not allowed",
    },
    email: {
      address: "Email address",
      code: "Verification code",
      bind: "Bind email",
      binding: "Binding…",
      bound: "Email bound",
      unbindPassword: "Password (to unbind)",
      unbind: "Unbind email",
      unbinding: "Unbinding…",
      unbound: "Email unbound",
      hint: "The address only takes effect after the verification code is accepted.",
    },
    links: {
      emptyTitle: "No linked accounts",
      emptyDetail: "Link a sign-in account from the sign-in page.",
      searchLabel: "Search linked accounts",
      provider: "Provider",
      unlink: "Unlink",
      confirmUnlink: "Confirm",
      cancel: "Cancel",
      unlinked: "Account unlinked",
      confirmHint: "Unlinking removes this sign-in method for your account.",
    },
  },
  states: {
    errorTitle: "Something went wrong",
    retry: "Retry",
    loading: "Loading",
    loadMore: "Load more",
    emptySearch: "Nothing matched that search.",
  },
  errors: {
    policy: "Unable to load the binding policy.",
    links: "Unable to load linked accounts.",
    more: "Unable to load more.",
    bind: "Unable to bind that email.",
    unbind: "Unable to unbind the email.",
    unlink: "Unable to unlink that account.",
  },
};

export type IamH5AccountBindingMessages = typeof iamH5AccountBindingMessages;
