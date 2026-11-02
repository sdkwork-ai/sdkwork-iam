// SDKWORK-IAM-H5-USER-CENTER-I18N: authored fragment (en-US).
/**
 * Locale fragment: domain `iam`, capability `user-center`, package
 * `@sdkwork/iam-h5-user-center`.
 *
 * Not `as const`: the `zh-CN` fragment is annotated with this object's type, and a
 * literal-typed default locale would make every translated string a type error.
 */
export const iamH5UserCenterMessages = {
  profile: {
    title: "Profile",
    identitySection: "Account",
    editableSection: "Display",
    accountId: "User id",
    username: "Username",
    email: "Email",
    phone: "Phone",
    displayName: "Display name",
    nickname: "Nickname",
    notSet: "Not set",
    editHint: "Your name is shown to other members of your organizations.",
    save: "Save profile",
    saving: "Saving…",
    saved: "Profile saved",
    verificationRequired: "Binding changes require verification in this tenant.",
    openPassword: "Change password",
    openOAuthProviders: "Third-party sign-in",
  },
  password: {
    title: "Change password",
    oldPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    hint: "At least 8 characters. You stay signed in on this device.",
    submit: "Update password",
    submitting: "Updating…",
    changed: "Password updated",
    errors: {
      "old-password-required": "Enter your current password.",
      "new-password-too-short": "The new password must be at least 8 characters.",
      "confirm-mismatch": "The two new passwords do not match.",
    },
  },
  states: {
    errorTitle: "Something went wrong",
    retry: "Retry",
    loading: "Loading",
  },
  errors: {
    profile: "Unable to load your profile.",
    save: "Unable to save your profile.",
    password: "Unable to change your password.",
  },
};

export type IamH5UserCenterMessages = typeof iamH5UserCenterMessages;
