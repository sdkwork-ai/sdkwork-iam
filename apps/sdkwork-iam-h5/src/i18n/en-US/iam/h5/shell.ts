// SDKWORK-IAM-H5-SHELL-I18N: authored fragment (en-US).
/**
 * Application-chrome copy for the IAM H5 root.
 *
 * The root owns the words its *own* chrome shows — the sign-in route title, the
 * guard prompt, the not-found page — because no capability package owns those.
 * Capability copy stays in its own package (`I18N_SPEC.md` section 6.1).
 */
export const iamH5ShellMessages = {
  loginTitle: "Sign in",
  notFound: {
    title: "Page not found",
    detail: "This link is not available on this client.",
    action: "Go to sign in",
  },
  guard: {
    title: "Sign-in required",
    detail: "Sign in to continue.",
  },
};

export type IamH5ShellMessages = typeof iamH5ShellMessages;
