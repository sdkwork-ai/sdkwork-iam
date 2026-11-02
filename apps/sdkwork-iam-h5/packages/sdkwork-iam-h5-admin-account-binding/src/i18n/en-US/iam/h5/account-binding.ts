// SDKWORK-IAM-H5-ADMIN-ACCOUNT-BINDING-I18N: authored fragment (en-US).
/**
 * Locale fragment: domain `iam`, capability `account-binding`, package
 * `@sdkwork/iam-h5-admin-account-binding`.
 *
 * The shape is declared as a type here and both locales are annotated with it, so a key added
 * in one locale and forgotten in the other does not compile.
 */

/** Message shape of the admin account-binding surface. */
export interface iamH5AdminAccountBindingLocaleMessages {
  readonly screen: {
    readonly title: string;
    readonly subtitle: string;
    readonly policySection: string;
    readonly contact: string;
    readonly email: string;
    readonly oauth: string;
    readonly selfServiceUnlink: string;
    readonly save: string;
    readonly saving: string;
    readonly saved: string;
    readonly reloadPolicy: string;
  };
  readonly states: {
    readonly notLoaded: string;
    readonly loading: string;
  };
  readonly errors: {
    readonly load: string;
    readonly save: string;
    readonly allDisabled: string;
  };
}

/** The en-US fragment. */
export const iamH5AdminAccountBindingMessages: iamH5AdminAccountBindingLocaleMessages = {
  screen: {
    title: "Account binding policy",
    subtitle: "The binding capabilities this tenant offers its users.",
    policySection: "Self-service policy",
    contact: "Contact binding",
    email: "Email binding",
    oauth: "Third-party sign-in",
    selfServiceUnlink: "Self-service unlink",
    save: "Save policy",
    saving: "Saving…",
    saved: "Policy saved.",
    reloadPolicy: "Reload policy",
  },
  states: {
    notLoaded: "The tenant policy is not loaded yet.",
    loading: "Loading…",
  },
  errors: {
    load: "Could not load the binding policy.",
    save: "Could not save the binding policy.",
    allDisabled:
      "This would disable every binding capability. Clear the last switch only if that is intended.",
  },
};
