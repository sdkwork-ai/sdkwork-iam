/**
 * Tenant overview screen (`app.iam.tenant.overview`, path `/tenant`).
 *
 * Layout follows the mobile reading order: the session the caller is acting in
 * first, then the tenant's organizations, then the caller's own memberships. Each
 * list searches and pages on the server; a failed *first* page is an error with a
 * retry, a failed *next* page is a notice above the rows already loaded, and an
 * empty result from a search is not the same screen as an empty dataset.
 */

import { useCallback, type ReactNode } from "react";

import {
  SdkworkIamH5Badge,
  SdkworkIamH5Card,
  SdkworkIamH5EmptyState,
  SdkworkIamH5ErrorState,
  SdkworkIamH5KeyValueList,
  SdkworkIamH5List,
  SdkworkIamH5ListFooter,
  SdkworkIamH5LoadingState,
  SdkworkIamH5Notice,
  SdkworkIamH5Screen,
  SdkworkIamH5SearchField,
  useSdkworkIamH5PagedList,
  useSdkworkIamH5Resource,
  type SdkworkIamH5ListRowDescriptor,
  type SdkworkIamH5PagedList,
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
}: SdkworkIamH5TenantOverviewScreenProps) {
  const messages = useIamH5TenantMessages();

  const runtime = useSdkworkIamH5Resource(useCallback(() => controller.loadRuntime(), [controller]));
  const organizations = useSdkworkIamH5PagedList(
    useCallback(
      (query: Parameters<SdkworkIamH5TenantController["fetchOrganizationsPage"]>[0]) =>
        controller.fetchOrganizationsPage(query),
      [controller],
    ),
  );
  const memberships = useSdkworkIamH5PagedList(
    useCallback(
      (query: Parameters<SdkworkIamH5TenantController["fetchMembershipsPage"]>[0]) =>
        controller.fetchMembershipsPage(query),
      [controller],
    ),
  );

  const renderOrganization = (organization: SdkworkIamH5TenantOrganization) => ({
    accessory: organization.status ? (
      <SdkworkIamH5Badge tone={organization.status === "active" ? "success" : "neutral"}>
        {organization.status}
      </SdkworkIamH5Badge>
    ) : undefined,
    id: organization.id,
    primary: organization.name,
    secondary: organization.parentId ? `${organization.id} · ${organization.parentId}` : organization.id,
  });

  const renderMembership = (membership: SdkworkIamH5TenantMembership) => ({
    accessory: membership.roleCode ? (
      <SdkworkIamH5Badge tone="neutral">{membership.roleCode}</SdkworkIamH5Badge>
    ) : undefined,
    id: membership.id,
    primary: membership.displayName ?? membership.userId,
    secondary: [membership.organizationId, membership.userId].filter(Boolean).join(" · "),
  });

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

      <PagedCard
        emptyDetail={messages.states.emptyOrganizationsDetail}
        emptyTitle={messages.states.emptyOrganizations}
        errorMessage={messages.errors.organizations}
        list={organizations}
        loadMoreErrorMessage={messages.errors.more}
        messages={messages.states}
        rows={organizations.items.map(renderOrganization)}
        searchLabel={messages.overview.searchOrganizations}
        title={messages.overview.organizationsSection}
      />

      <PagedCard
        emptyDetail={messages.states.emptyMembershipsDetail}
        emptyTitle={messages.states.emptyMemberships}
        errorMessage={messages.errors.memberships}
        list={memberships}
        loadMoreErrorMessage={messages.errors.more}
        messages={messages.states}
        rows={memberships.items.map(renderMembership)}
        searchLabel={messages.overview.searchMemberships}
        title={messages.overview.membershipsSection}
      />
    </SdkworkIamH5Screen>
  );
}

interface PagedCardMessages {
  readonly emptySearch: string;
  readonly errorTitle: string;
  readonly loading: string;
  readonly loadMore: string;
  readonly retry: string;
}

interface PagedCardProps {
  emptyDetail: string;
  emptyTitle: string;
  errorMessage: string;
  list: SdkworkIamH5PagedList<unknown>;
  /**
   * Copy for a failed *next* page.
   *
   * Kept separate from `errorMessage` because the two failures read differently:
   * "cannot load organizations" describes an empty screen, while "cannot load
   * more" describes a list that is still usable.
   */
  loadMoreErrorMessage: string;
  messages: PagedCardMessages;
  rows: readonly SdkworkIamH5ListRowDescriptor[];
  searchLabel: string;
  title: string;
}

/**
 * One searchable, paged list inside a card.
 *
 * Presentational only: it receives the already-built list state, so no hook is
 * called conditionally and the two lists on this screen cannot drift apart.
 */
function PagedCard({
  emptyDetail,
  emptyTitle,
  errorMessage,
  list,
  loadMoreErrorMessage,
  messages,
  rows,
  searchLabel,
  title,
}: PagedCardProps): ReactNode {
  const firstLoadFailed = list.status === "error" && list.items.length === 0;
  const filtered = list.search.trim() !== "";

  return (
    <SdkworkIamH5Card title={title}>
      <SdkworkIamH5SearchField
        label={searchLabel}
        onChange={list.setSearch}
        placeholder={searchLabel}
        value={list.search}
      />
      {firstLoadFailed && list.error ? (
        <SdkworkIamH5ErrorState
          error={{ message: `${errorMessage} ${list.error.message}`.trim() }}
          onRetry={() => void list.refresh()}
          retryLabel={messages.retry}
          title={messages.errorTitle}
        />
      ) : list.status === "loading" ? (
        <SdkworkIamH5LoadingState label={messages.loading} />
      ) : rows.length === 0 ? (
        <SdkworkIamH5EmptyState
          description={filtered ? messages.emptySearch : emptyDetail}
          title={filtered ? messages.emptySearch : emptyTitle}
        />
      ) : (
        <>
          {list.error ? (
            <SdkworkIamH5Notice tone="danger">
              {loadMoreErrorMessage} {list.error.message}
            </SdkworkIamH5Notice>
          ) : null}
          <SdkworkIamH5List rows={rows} />
          <SdkworkIamH5ListFooter
            hasMore={list.hasMore}
            loadingMore={list.loadingMore}
            moreLabel={messages.loadMore}
            onLoadMore={() => void list.loadMore()}
          />
        </>
      )}
    </SdkworkIamH5Card>
  );
}
