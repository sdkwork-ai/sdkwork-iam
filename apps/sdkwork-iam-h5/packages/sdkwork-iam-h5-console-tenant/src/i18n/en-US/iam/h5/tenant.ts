// SDKWORK-IAM-H5-CONSOLE-TENANT-I18N: authored fragment (en-US).
/**
 * Locale fragment: domain `iam`, capability `tenant`, package
 * `@sdkwork/iam-h5-console-tenant`.
 *
 * Keys are grouped by screen region rather than flattened, so a new key cannot be
 * added to one locale and forgotten in the other: the `zh-CN` fragment is typed
 * against this object.
 *
 * The object is deliberately **not** `as const`: a literal-typed default locale would
 * make every other locale's translated string a type error.
 */
export const iamH5ConsoleTenantMessages = {
  overview: {
    title: "Tenant management",
    subtitle: "The tenant you are acting in, its organizations and the self-service policies.",
    sessionSection: "Session",
    policySection: "Self-service policy",
    organizationsSection: "Organizations",
    runtime: {
      environment: "Environment",
      tenant: "Tenant",
      user: "Operator",
    },
    policy: {
      contact: "Contact binding",
      email: "Email binding",
      oauth: "Third-party sign-in",
      unlink: "Self-service unlink",
    },
    allowed: "Allowed",
    denied: "Not allowed",
    notReported: "Not reported",
    searchOrganizations: "Search organizations",
  },
  states: {
    loading: "Loading…",
    retry: "Retry",
    loadMore: "Load more",
    emptyOrganizations: "This tenant has no organizations yet.",
    emptySearch: "Nothing matched that search.",
    errorTitle: "Something went wrong",
  },
  errors: {
    runtime: "Could not read the session context.",
    policy: "Could not read the self-service policy.",
    organizations: "Could not load organizations.",
    more: "Unable to load more.",
  },
};

export type iamH5ConsoleTenantLocaleMessages = typeof iamH5ConsoleTenantMessages;
