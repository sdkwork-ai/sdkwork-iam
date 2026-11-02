/**
 * Admin audit trail (`admin.iam.audit.events`, path `/admin/iam/audit`).
 *
 * The operator's only way to answer "who changed this, and when". The row leads with the
 * action and the actor because that is what a ticket names; the resource and the time
 * follow, since they are how the operator narrows to the exact change.
 */

import { useCallback, type ReactElement } from "react";

import {
  SdkworkIamH5PagedListSection,
  SdkworkIamH5Screen,
  useSdkworkIamH5PagedList,
} from "@sdkwork/iam-h5-commons";

import { useIamH5AdminAuditMessages } from "../i18n/index.js";
import type {
  SdkworkIamH5AdminAuditController,
  SdkworkIamH5AdminAuditEvent,
} from "../types/admin-audit-types.js";

/** Props of {@link SdkworkIamH5AdminAuditScreen}. */
export interface SdkworkIamH5AdminAuditScreenProps {
  controller: SdkworkIamH5AdminAuditController;
  /** Back handler; omitted when the host renders this as a root tab. */
  onBack?: () => void;
}

/** The admin audit trail screen. */
export function SdkworkIamH5AdminAuditScreen({
  controller,
  onBack,
}: SdkworkIamH5AdminAuditScreenProps): ReactElement {
  const messages = useIamH5AdminAuditMessages();
  const events = useSdkworkIamH5PagedList<SdkworkIamH5AdminAuditEvent>(
    useCallback((query) => controller.fetchEventsPage(query), [controller]),
  );

  const listMessages = {
    emptyDetail: messages.states.emptyEventsDetail,
    emptySearch: messages.states.emptySearch,
    emptyTitle: messages.states.emptyEvents,
    errorMessage: messages.errors.events,
    errorTitle: messages.states.errorTitle,
    loading: messages.states.loading,
    loadMore: messages.states.loadMore,
    loadMoreErrorMessage: messages.errors.more,
    retry: messages.states.retry,
  };

  return (
    <SdkworkIamH5Screen {...(onBack ? { onBack } : {})} title={messages.events.title}>
      <SdkworkIamH5PagedListSection<SdkworkIamH5AdminAuditEvent>
        buildRow={(event) => ({
          id: event.id,
          primary: [event.action, event.actor].filter(Boolean).join(" · ") || event.id,
          // The resource and the time are what narrow a search to one change; both are
          // shown even when only one of them exists.
          secondary: [event.resource, event.occurredAt].filter(Boolean).join(" · "),
        })}
        list={events}
        messages={listMessages}
        searchLabel={messages.events.searchEvents}
        title={messages.events.eventsSection}
      />
    </SdkworkIamH5Screen>
  );
}
