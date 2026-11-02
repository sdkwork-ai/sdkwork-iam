/**
 * Organization directory screen (`app.iam.organization.directory`,
 * `/organizations`).
 *
 * One server-paginated list. Rows whose record carries a parent are shown with
 * their parent id so the hierarchy is legible without pretending the paged list is
 * a tree: a page cannot know about parents it did not receive.
 */

import { useCallback, type ReactElement } from "react";

import {
  SdkworkIamH5Badge,
  SdkworkIamH5PagedListSection,
  SdkworkIamH5Screen,
  useSdkworkIamH5PagedList,
  type SdkworkIamH5ListQuery,
} from "@sdkwork/iam-h5-commons";

import { useIamH5OrganizationMessages } from "../i18n/index.js";
import type { SdkworkIamH5Organization, SdkworkIamH5OrganizationController } from "../types/organization-h5-types.js";

/** Props of {@link SdkworkIamH5OrganizationDirectoryScreen}. */
export interface SdkworkIamH5OrganizationDirectoryScreenProps {
  controller: SdkworkIamH5OrganizationController;
  onBack?: () => void;
  title?: string;
}

/** The organization directory screen. */
export function SdkworkIamH5OrganizationDirectoryScreen({
  controller,
  onBack,
  title,
}: SdkworkIamH5OrganizationDirectoryScreenProps): ReactElement {
  const messages = useIamH5OrganizationMessages();
  const organizations = useSdkworkIamH5PagedList<SdkworkIamH5Organization>(
    useCallback(
      (query: SdkworkIamH5ListQuery) => controller.fetchOrganizationsPage(query),
      [controller],
    ),
  );

  return (
    <SdkworkIamH5Screen onBack={onBack} title={title ?? messages.directory.title}>
      <SdkworkIamH5PagedListSection
        buildRow={(organization) => ({
          accessory: organization.status ? (
            <SdkworkIamH5Badge tone={organization.status === "active" ? "success" : "neutral"}>
              {organization.status}
            </SdkworkIamH5Badge>
          ) : undefined,
          id: organization.id,
          primary: organization.name,
          secondary: organization.parentId
            ? `${organization.id} · ${organization.parentId}`
            : organization.id,
        })}
        list={organizations}
        messages={{
          emptyDetail: messages.states.emptyDetail,
          emptySearch: messages.states.emptySearch,
          emptyTitle: messages.states.emptyTitle,
          errorMessage: messages.errors.organizations,
          errorTitle: messages.states.errorTitle,
          loading: messages.states.loading,
          loadMore: messages.states.loadMore,
          loadMoreErrorMessage: messages.errors.more,
          retry: messages.states.retry,
        }}
        searchLabel={messages.directory.searchLabel}
        title={messages.directory.listSection}
      />
    </SdkworkIamH5Screen>
  );
}
