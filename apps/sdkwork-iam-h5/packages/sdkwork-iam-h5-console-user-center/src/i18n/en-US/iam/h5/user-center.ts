// SDKWORK-IAM-H5-CONSOLE-USER-CENTER-I18N: authored fragment (en-US).
/**
 * Locale fragment: domain `iam`, capability `user-center`, package
 * `@sdkwork/iam-h5-console-user-center`.
 *
 * Grouped by screen region so a key added here cannot be forgotten in `zh-CN`: that
 * fragment is typed against this object.
 */
export const iamH5ConsoleUserCenterMessages = {
  profile: {
    title: "User center",
    subtitle: "The signed-in user's own record, as the console sees it.",
    accountSection: "Account",
    verificationSection: "Verification policy",
    userId: "User",
    displayName: "Display name",
    email: "Email",
    phone: "Phone",
    notReported: "Not reported",
    verification: {
      contact: "Contact verification",
      email: "Email verification",
      oauth: "Third-party sign-in",
    },
    required: "Required",
    optional: "Optional",
  },
  states: {
    loading: "Loading…",
    retry: "Retry",
  },
  errors: {
    account: "Could not read the account.",
    verification: "Could not read the verification policy.",
  },
};

export type iamH5ConsoleUserCenterLocaleMessages = typeof iamH5ConsoleUserCenterMessages;
