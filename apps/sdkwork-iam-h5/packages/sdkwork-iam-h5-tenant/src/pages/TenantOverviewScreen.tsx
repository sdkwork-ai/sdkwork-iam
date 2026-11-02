/**
 * Tenant overview screen (`app.iam.tenant.overview`, path `/tenant`).
 *
 * Layout follows the mobile reading order: the session the caller is acting in
 * first, then the tenant's organizations, then the caller's own memberships. Each
 * list searches and pages on the server through the kit's list section, so the
 * failure semantics of a first page and a next page are the shared ones.
 */

import { useCallback, type ReactElement } from "react";

import {
  SdkworkIamH5Badge,
  SdkworkIamH5Card,
  SdkworkIamH5KeyValueList,
  SdkworkIamH5LoadingState,
  SdkworkIamH5Notice,
  SdkworkIamH5PagedListSection,
  SdkworkIamH5Screen,
  useSdkworkIamH5PagedList,
  useSdkworkIamH5Resource,
  type SdkworkIamH5ListQuery,
} from "@sdkwork/iam-h5-commons";

import { useIamH5TenantMessages } from "../i18n/index.js";
import type {
  SdkworkIamH5TenantController,
  SdkworkIamH5TenantMembership,
  SdkworkIamH5TenantOrganization,
} from "../types/tenant-h5-types.js";

/** Props of {@link SdkworkIamH5TenantOverviewScreen}. */
export interface SdkworkIamH5TenantOverviewScreenProps {
  controller: SdkworkIamH5TenantController;
  /** Back handler; omitted when the host renders this as a root tab. */
  onBack?: () => void;
  /** Resolved title override, e.g. the tenant name from the host shell. */
  title?: string;
}

/** The tenant overview screen. */
export function SdkworkIamH5TenantOverviewScreen({
  controller,
  onBack,
  title,
}: SdkworkIamH5TenantOverviewScreenProps): ReactElement {
  const messages = useIamH5TenantMessages();

  const runtime = useSdkworkIamH5Resource(useCallback(() => controller.loadRuntime(), [controller]));
  const organizations = useSdkworkIamH5PagedList<SdkworkIamH5TenantOrganization>(
    useCallback((query: SdkworkIamH5ListQuery) => controller.fetchOrganizationsPage(query), [controller]),
  );
  const memberships = useSdkworkIamH5PagedList<SdkworkIamH5TenantMembership>(
    useCallback((query: SdkworkIamH5ListQuery) => controller.fetchMembershipsPage(query), [controller]),
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
    <SdkworkIamH5Screen onBack={onBack} title={title ?? messages.overview.title}>
      {runtime.status === "error" && runtime.error ? (
        <SdkworkIamH5Notice tone="danger">
          {messages.errors.runtime} {runtime.error.message}
        </SdkworkIamH5Notice>
      ) : null}
      <SdkworkIamH5Card title={messages.overview.runtimeSection}>
        {runtime.status === "loading" && !runtime.data ? (
          <SdkworkIamH5LoadingState label={messages.states.loading} />
        ) : (
          <SdkworkIamH5KeyValueList
            items={[
              { label: messages.overview.runtime.tenant, value: runtime.data?.tenantId ?? messages.overview.notReported },
              { label: messages.overview.runtime.user, value: runtime.data?.userId ?? messages.overview.notReported },
              {
                label: messages.overview.runtime.environment,
                value: runtime.data?.environment ?? messages.overview.notReported,
              },
              {
                label: messages.overview.runtime.deployment,
                value: runtime.data?.deploymentMode ?? messages.overview.notReported,
              },
            ]}
          />
        )}
      </SdkworkIamH5Card>

      <div style={{ marginBlockStart: "var(--sdkwork-iam-h5-space-md)" }}>
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
          messages={listMessages}
          searchLabel={messages.overview.searchOrganizations}
          title={messages.overview.organizationsSection}
        />
      </div>

      <div style={{ marginBlockStart: "var(--sdkwork-iam-h5-space-md)" }}>
        <SdkworkIamH5PagedListSection
          buildRow={(membership) => ({
            accessory: membership.roleCode ? (
              <SdkworkIamH5Badge tone="neutral">{membership.roleCode}</SdkworkIamH5Badge>
            ) : undefined,
            id: membership.id,
            primary: membership.displayName ?? membership.userId,
            secondary: [membership.organizationId, membership.userId].filter(Boolean).join(" · "),
          })}
          list={memberships}
          messages={{
            ...listMessages,
            emptyDetail: messages.states.emptyMembershipsDetail,
            emptyTitle: messages.states.emptyMemberships,
            errorMessage: messages.errors.memberships,
          }}
          searchLabel={messages.overview.searchMemberships}
          title={messages.overview.membershipsSection}
        />
      </div>
    </SdkworkIamH5Screen>
  );
}
