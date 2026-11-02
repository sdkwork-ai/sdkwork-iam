/**
 * Console organization workspace
 * (`console.iam.organization.directory`, path `/console/iam/organization`).
 *
 * One server-paged list of every organization in the tenant an operator is acting in.
 * The row keeps the parent id so an operator can reconstruct the tree without opening
 * each organization.
 */

import { useCallback, type ReactElement } from "react";

import {
  SdkworkIamH5PagedListSection,
  SdkworkIamH5Screen,
  useSdkworkIamH5PagedList,
} from "@sdkwork/iam-h5-commons";

import { useIamH5ConsoleOrganizationMessages } from "../i18n/index.js";
import type {
  SdkworkIamH5ConsoleOrganization,
  SdkworkIamH5ConsoleOrganizationController,
} from "../types/console-organization-types.js";

/** Props of {@link SdkworkIamH5ConsoleOrganizationDirectoryScreen}. */
export interface SdkworkIamH5ConsoleOrganizationDirectoryScreenProps {
  controller: SdkworkIamH5ConsoleOrganizationController;
  /** Back handler; omitted when the host renders this as a root tab. */
  onBack?: () => void;
}

/** The console organization workspace. */
export function SdkworkIamH5ConsoleOrganizationDirectoryScreen({
  controller,
  onBack,
}: SdkworkIamH5ConsoleOrganizationDirectoryScreenProps): ReactElement {
  const messages = useIamH5ConsoleOrganizationMessages();
  const organizations = useSdkworkIamH5PagedList<SdkworkIamH5ConsoleOrganization>(
    useCallback((query) => controller.fetchOrganizationsPage(query), [controller]),
  );

  const listMessages = {
    emptyDetail: messages.states.emptyOrganizationsDetail,
    emptySearch: messages.states.emptySearch,
    emptyTitle: messages.states.emptyOrganizations,
    errorMessage: messages.errors.organizations,
    errorTitle: messages.states.errorTitle,
    loading: messages.states.loading,
    loadMore: messages.states.loadMore,
    loadMoreErrorMessage: messages.errors.more,
    retry: messages.states.retry,
  };

  return (
    <SdkworkIamH5Screen {...(onBack ? { onBack } : {})} title={messages.directory.title}>
      <SdkworkIamH5PagedListSection<SdkworkIamH5ConsoleOrganization>
        buildRow={(organization) => ({
          id: organization.id,
          primary: organization.name,
          secondary: organization.parentId
            ? `${organization.id} · ${organization.parentId}`
            : organization.id,
        })}
        list={organizations}
        messages={listMessages}
        searchLabel={messages.directory.searchOrganizations}
        title={messages.directory.organizationsSection}
      />
    </SdkworkIamH5Screen>
  );
}
