// SDKWORK-IAM-H5-CONSOLE-ACCOUNT-BINDING-I18N: authored fragment (en-US).
/**
 * Locale fragment: domain `iam`, capability `account-binding`, package
 * `@sdkwork/iam-h5-console-account-binding`.
 *
 * Grouped by screen region so a key added here cannot be forgotten in `zh-CN`: that
 * fragment is typed against this object.
 */
export const iamH5ConsoleAccountBindingMessages = {
  list: {
    title: "Account binding management",
    policySection: "Self-service policy",
    linksSection: "Linked identities",
    policy: {
      contact: "Contact binding",
      email: "Email binding",
      oauth: "Third-party sign-in",
      unlink: "Self-service unlink",
    },
    allowed: "Allowed",
    denied: "Not allowed",
    unlink: "Remove",
    unlinkConfirm: "Remove this sign-in method for the user?",
    cancel: "Cancel",
  },
  states: {
    loading: "Loading…",
    emptyLinks: "This user has no linked identities.",
  },
  errors: {
    policy: "Could not read the binding policy.",
    links: "Could not load linked identities.",
    unlink: "Could not remove that binding.",
  },
};

export type iamH5ConsoleAccountBindingLocaleMessages = typeof iamH5ConsoleAccountBindingMessages;
