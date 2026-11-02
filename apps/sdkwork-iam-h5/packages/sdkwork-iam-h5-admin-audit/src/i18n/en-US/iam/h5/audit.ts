// SDKWORK-IAM-H5-ADMIN-AUDIT-I18N: authored fragment (en-US).
/**
 * Locale fragment: domain `iam`, capability `audit`, package
 * `@sdkwork/iam-h5-admin-audit`.
 *
 * Grouped by screen region so a key added here cannot be forgotten in `zh-CN`: that
 * fragment is typed against this object.
 */
export const iamH5AdminAuditMessages = {
  events: {
    title: "Audit events",
    subtitle: "What happened in this tenant, newest first, over the backend-api.",
    searchEvents: "Search by actor or action",
    eventsSection: "Events",
    actor: "Actor",
    action: "Action",
    resource: "Resource",
    when: "When",
  },
  states: {
    loading: "Loading…",
    loadMore: "Load more",
    retry: "Retry",
    emptyEvents: "No audit event was recorded yet.",
    emptyEventsDetail: "Events appear here once a change is made through the API.",
    emptySearch: "Nothing matched that search.",
    errorTitle: "Something went wrong",
  },
  errors: {
    events: "Could not load the audit trail.",
    more: "Unable to load more.",
  },
};

export type iamH5AdminAuditLocaleMessages = typeof iamH5AdminAuditMessages;
