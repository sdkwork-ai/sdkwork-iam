/**
 * Admin permission catalog (`admin.iam.permission.permissions`, path
 * `/admin/iam/permissions`).
 *
 * The tenant's permission catalog over the backend-api. An operator scans it to answer
 * "does this tenant even have a permission for that resource?" before granting anything.
 */

import { useCallback, type ReactElement } from "react";

import {
  SdkworkIamH5PagedListSection,
  SdkworkIamH5Screen,
  useSdkworkIamH5PagedList,
} from "@sdkwork/iam-h5-commons";

import { useIamH5AdminPermissionMessages } from "../i18n/index.js";
import type {
  SdkworkIamH5AdminPermission,
  SdkworkIamH5AdminPermissionController,
} from "../types/admin-permission-types.js";

/** Props of {@link SdkworkIamH5AdminPermissionScreen}. */
export interface SdkworkIamH5AdminPermissionScreenProps {
  controller: SdkworkIamH5AdminPermissionController;
  /** Back handler; omitted when the host renders this as a root tab. */
  onBack?: () => void;
}

/** The admin permission catalog screen. */
export function SdkworkIamH5AdminPermissionScreen({
  controller,
  onBack,
}: SdkworkIamH5AdminPermissionScreenProps): ReactElement {
  const messages = useIamH5AdminPermissionMessages();
  const permissions = useSdkworkIamH5PagedList<SdkworkIamH5AdminPermission>(
    useCallback((query) => controller.fetchPermissionsPage(query), [controller]),
  );

  const listMessages = {
    emptyDetail: messages.states.emptyPermissionsDetail,
    emptySearch: messages.states.emptySearch,
    emptyTitle: messages.states.emptyPermissions,
    errorMessage: messages.errors.permissions,
    errorTitle: messages.states.errorTitle,
    loading: messages.states.loading,
    loadMore: messages.states.loadMore,
    loadMoreErrorMessage: messages.errors.more,
    retry: messages.states.retry,
  };

  return (
    <SdkworkIamH5Screen {...(onBack ? { onBack } : {})} title={messages.permissions.title}>
      <SdkworkIamH5PagedListSection<SdkworkIamH5AdminPermission>
        buildRow={(permission) => ({
          id: permission.id,
          primary: permission.code,
          secondary: [permission.resource, permission.action].filter(Boolean).join(" · ") || permission.id,
        })}
        list={permissions}
        messages={listMessages}
        searchLabel={messages.permissions.searchPermissions}
        title={messages.permissions.permissionsSection}
      />
    </SdkworkIamH5Screen>
  );
}
