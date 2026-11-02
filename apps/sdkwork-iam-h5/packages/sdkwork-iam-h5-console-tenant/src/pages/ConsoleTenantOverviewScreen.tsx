/**
 * Console tenant workspace (`console.iam.tenant.overview`, path `/console/iam/tenant`).
 *
 * What an operator needs when a tenant user opens a ticket: the tenant they are acting
 * in, the self-service policies that decide what that user can do themselves, and the
 * tenant's organizations. The app surface answers "what is mine"; this one answers
 * "what is this tenant's", which is why it reads the binding policy the app screen
 * never shows.
 */

import { useCallback, type ReactElement } from "react";

import {
  SdkworkIamH5Badge,
  SdkworkIamH5Card,
  SdkworkIamH5KeyValueList,
  SdkworkIamH5LoadingState,
  SdkworkIamH5Notice,
  SdkworkIamH5Screen,
  SdkworkIamH5Button,
  useSdkworkIamH5PagedList,
  useSdkworkIamH5Resource,
} from "@sdkwork/iam-h5-commons";

import { useIamH5ConsoleTenantMessages } from "../i18n/index.js";
import type {
  SdkworkIamH5ConsoleTenantController,
  SdkworkIamH5ConsoleTenantOrganization,
} from "../types/console-tenant-types.js";

/** Props of {@link SdkworkIamH5ConsoleTenantOverviewScreen}. */
export interface SdkworkIamH5ConsoleTenantOverviewScreenProps {
  controller: SdkworkIamH5ConsoleTenantController;
  /** Back handler; omitted when the host renders this as a root tab. */
  onBack?: () => void;
}

/** The console tenant workspace. */
export function SdkworkIamH5ConsoleTenantOverviewScreen({
  controller,
  onBack,
}: SdkworkIamH5ConsoleTenantOverviewScreenProps): ReactElement {
  const messages = useIamH5ConsoleTenantMessages();

  const runtime = useSdkworkIamH5Resource(useCallback(() => controller.loadRuntime(), [controller]));
  const policy = useSdkworkIamH5Resource(useCallback(() => controller.loadPolicy(), [controller]));
  const organizations = useSdkworkIamH5PagedList<SdkworkIamH5ConsoleTenantOrganization>(
    useCallback(
      (query) => controller.fetchOrganizationsPage(query),
      [controller],
    ),
  );

  const allowed = (value: boolean): string =>
    value ? messages.overview.allowed : messages.overview.denied;
  const notReported = messages.overview.notReported;

  return (
    <SdkworkIamH5Screen {...(onBack ? { onBack } : {})} title={messages.overview.title}>
      <SdkworkIamH5Card title={messages.overview.sessionSection}>
        {runtime.status === "loading" && !runtime.data ? (
          <SdkworkIamH5LoadingState label={messages.states.loading} />
        ) : null}
        {runtime.status === "error" ? (
          <SdkworkIamH5Notice tone="danger">{messages.errors.runtime}</SdkworkIamH5Notice>
        ) : null}
        {runtime.data ? (
          <SdkworkIamH5KeyValueList
            items={[
              {
                label: messages.overview.runtime.environment,
                value: runtime.data.environment ?? notReported,
              },
              {
                label: messages.overview.runtime.tenant,
                value: runtime.data.tenantId ?? notReported,
              },
              {
                label: messages.overview.runtime.user,
                value: runtime.data.userId ?? notReported,
              },
            ]}
          />
        ) : null}
      </SdkworkIamH5Card>

      <SdkworkIamH5Card title={messages.overview.policySection}>
        {policy.status === "loading" && !policy.data ? (
          <SdkworkIamH5LoadingState label={messages.states.loading} />
        ) : null}
        {policy.status === "error" ? (
          <SdkworkIamH5Notice tone="danger">{messages.errors.policy}</SdkworkIamH5Notice>
        ) : null}
        {policy.data ? (
          <SdkworkIamH5KeyValueList
            items={[
              { label: messages.overview.policy.contact, value: allowed(policy.data.contactEnabled) },
              { label: messages.overview.policy.email, value: allowed(policy.data.emailEnabled) },
              { label: messages.overview.policy.oauth, value: allowed(policy.data.oauthEnabled) },
              {
                label: messages.overview.policy.unlink,
                value: allowed(policy.data.selfServiceUnlinkEnabled),
              },
            ]}
          />
        ) : null}
      </SdkworkIamH5Card>

      <SdkworkIamH5Card title={messages.overview.organizationsSection}>
        {organizations.status === "loading" && organizations.items.length === 0 ? (
          <SdkworkIamH5LoadingState label={messages.states.loading} />
        ) : null}
        {organizations.status === "error" ? (
          <SdkworkIamH5Notice tone="danger">{messages.errors.organizations}</SdkworkIamH5Notice>
        ) : null}
        {organizations.status !== "error" && organizations.items.length === 0 ? (
          <SdkworkIamH5Notice>{messages.states.emptyOrganizations}</SdkworkIamH5Notice>
        ) : null}
        {organizations.items.map((organization) => (
          <div key={organization.id}>
            <SdkworkIamH5KeyValueList
              items={[{ label: organization.title, value: organization.detail ?? organization.id }]}
            />
          </div>
        ))}
        {organizations.hasMore ? (
          <SdkworkIamH5Button
            disabled={organizations.loadingMore}
            onClick={() => {
              void organizations.loadMore();
            }}
          >
            {messages.states.loadMore}
          </SdkworkIamH5Button>
        ) : null}
      </SdkworkIamH5Card>
    </SdkworkIamH5Screen>
  );
}
