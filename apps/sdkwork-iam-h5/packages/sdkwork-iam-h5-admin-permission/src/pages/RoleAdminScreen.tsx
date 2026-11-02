/**
 * Admin role catalog (`admin.iam.permission.roles`, path `/admin/iam/roles`).
 *
 * Which roles this tenant defines. An operator opens it to answer "is there already a
 * role that covers this?" before creating a new one.
 */

import { useCallback, type ReactElement } from "react";

import {
  SdkworkIamH5PagedListSection,
  SdkworkIamH5Screen,
  useSdkworkIamH5PagedList,
} from "@sdkwork/iam-h5-commons";

import { useIamH5AdminPermissionMessages } from "../i18n/index.js";
import type { SdkworkIamH5AdminRole, SdkworkIamH5AdminRoleController } from "../types/admin-permission-types.js";

/** Props of {@link SdkworkIamH5AdminRoleScreen}. */
export interface SdkworkIamH5AdminRoleScreenProps {
  controller: SdkworkIamH5AdminRoleController;
  /** Back handler; omitted when the host renders this as a root tab. */
  onBack?: () => void;
}

/** The admin role catalog screen. */
export function SdkworkIamH5AdminRoleScreen({
  controller,
  onBack,
}: SdkworkIamH5AdminRoleScreenProps): ReactElement {
  const messages = useIamH5AdminPermissionMessages();
  const roles = useSdkworkIamH5PagedList<SdkworkIamH5AdminRole>(
    useCallback((query) => controller.fetchRolesPage(query), [controller]),
  );

  const listMessages = {
    emptyDetail: messages.states.emptyRolesDetail,
    emptySearch: messages.states.emptySearch,
    emptyTitle: messages.states.emptyRoles,
    errorMessage: messages.errors.roles,
    errorTitle: messages.states.errorTitle,
    loading: messages.states.loading,
    loadMore: messages.states.loadMore,
    loadMoreErrorMessage: messages.errors.more,
    retry: messages.states.retry,
  };

  return (
    <SdkworkIamH5Screen {...(onBack ? { onBack } : {})} title={messages.roles.title}>
      <SdkworkIamH5PagedListSection<SdkworkIamH5AdminRole>
        buildRow={(role) => ({
          id: role.id,
          primary: role.name ?? role.code,
          secondary: role.name === undefined ? role.id : role.code,
        })}
        list={roles}
        messages={listMessages}
        searchLabel={messages.roles.searchRoles}
        title={messages.roles.rolesSection}
      />
    </SdkworkIamH5Screen>
  );
}
