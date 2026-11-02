/**
 * Admin tenant list (`admin.iam.tenant.list`, path `/admin/iam/tenants`).
 *
 * Every tenant on the deployment, with its status. The status is on the row because
 * "exists but suspended" is the case a support ticket is usually about, and an operator
 * who cannot see it has to open each tenant to find out.
 */

import { useCallback, type ReactElement } from "react";

import {
  SdkworkIamH5Badge,
  SdkworkIamH5PagedListSection,
  SdkworkIamH5Screen,
  useSdkworkIamH5PagedList,
} from "@sdkwork/iam-h5-commons";

import { useIamH5AdminTenantMessages } from "../i18n/index.js";
import type {
  SdkworkIamH5AdminTenantController,
  SdkworkIamH5AdminTenantRow,
} from "../types/admin-tenant-types.js";

/** Props of {@link SdkworkIamH5AdminTenantScreen}. */
export interface SdkworkIamH5AdminTenantScreenProps {
  controller: SdkworkIamH5AdminTenantController;
  /** Back handler; omitted when the host renders this as a root tab. */
  onBack?: () => void;
}

/** The admin tenant list screen. */
export function SdkworkIamH5AdminTenantScreen({
  controller,
  onBack,
}: SdkworkIamH5AdminTenantScreenProps): ReactElement {
  const messages = useIamH5AdminTenantMessages();
  const tenants = useSdkworkIamH5PagedList<SdkworkIamH5AdminTenantRow>(
    useCallback((query) => controller.fetchTenantsPage(query), [controller]),
  );

  const listMessages = {
    emptyDetail: messages.states.emptyTenantsDetail,
    emptySearch: messages.states.emptySearch,
    emptyTitle: messages.states.emptyTenants,
    errorMessage: messages.errors.tenants,
    errorTitle: messages.states.errorTitle,
    loading: messages.states.loading,
    loadMore: messages.states.loadMore,
    loadMoreErrorMessage: messages.errors.more,
    retry: messages.states.retry,
  };

  return (
    <SdkworkIamH5Screen {...(onBack ? { onBack } : {})} title={messages.list.title}>
      <SdkworkIamH5PagedListSection<SdkworkIamH5AdminTenantRow>
        buildRow={(tenant) => ({
          accessory:
            tenant.status === undefined ? undefined : (
              <SdkworkIamH5Badge tone={tenant.status === "active" ? "success" : "warning"}>
                {tenant.status}
              </SdkworkIamH5Badge>
            ),
          id: tenant.id,
          primary: tenant.name,
          secondary: tenant.id,
        })}
        list={tenants}
        messages={listMessages}
        searchLabel={messages.list.searchTenants}
        title={messages.list.tenantsSection}
      />
    </SdkworkIamH5Screen>
  );
}
