/**
 * Console account-binding workspace
 * (`console.iam.account-binding.list`, path `/console/iam/account-binding`).
 *
 * An operator answers two questions here: which identities this user signs in with,
 * and whether the tenant's policy would let the user remove one themselves. The
 * remove action offered here is the operator's override, so it is rendered only when
 * the policy grants self-service unlink — the same gate the user's own screen uses.
 */

import { useCallback, useState, type ReactElement } from "react";

import {
  SdkworkIamH5Badge,
  SdkworkIamH5Button,
  SdkworkIamH5Card,
  SdkworkIamH5KeyValueList,
  SdkworkIamH5LoadingState,
  SdkworkIamH5Notice,
  SdkworkIamH5Screen,
  useSdkworkIamH5PagedList,
  useSdkworkIamH5Resource,
} from "@sdkwork/iam-h5-commons";

import { useIamH5ConsoleAccountBindingMessages } from "../i18n/index.js";
import type {
  SdkworkIamH5ConsoleAccountBindingController,
  SdkworkIamH5ConsoleAccountLink,
} from "../types/console-account-binding-types.js";

/** Props of {@link SdkworkIamH5ConsoleAccountBindingScreen}. */
export interface SdkworkIamH5ConsoleAccountBindingScreenProps {
  controller: SdkworkIamH5ConsoleAccountBindingController;
  /** Back handler; omitted when the host renders this as a root tab. */
  onBack?: () => void;
}

/** The console account-binding workspace. */
export function SdkworkIamH5ConsoleAccountBindingScreen({
  controller,
  onBack,
}: SdkworkIamH5ConsoleAccountBindingScreenProps): ReactElement {
  const messages = useIamH5ConsoleAccountBindingMessages();
  const policy = useSdkworkIamH5Resource(useCallback(() => controller.loadPolicy(), [controller]));
  const links = useSdkworkIamH5PagedList<SdkworkIamH5ConsoleAccountLink>(
    useCallback((query) => controller.fetchLinksPage(query), [controller]),
  );
  const [error, setError] = useState<string | undefined>(undefined);
  const [pendingId, setPendingId] = useState<string | undefined>(undefined);

  const allowed = (value: boolean): string =>
    value ? messages.list.allowed : messages.list.denied;

  const remove = async (link: SdkworkIamH5ConsoleAccountLink): Promise<void> => {
    if (pendingId !== undefined) return;
    setError(undefined);
    setPendingId(link.accountLinkId);
    try {
      await controller.unlink(link.accountLinkId);
      // Reload rather than splice: the list is server state, and the server decides
      // what remains.
      await links.refresh();
    } catch {
      setError(messages.errors.unlink);
    } finally {
      setPendingId(undefined);
    }
  };

  return (
    <SdkworkIamH5Screen {...(onBack ? { onBack } : {})} title={messages.list.title}>
      <SdkworkIamH5Card title={messages.list.policySection}>
        {policy.status === "loading" && !policy.data ? (
          <SdkworkIamH5LoadingState label={messages.states.loading} />
        ) : null}
        {policy.status === "error" ? (
          <SdkworkIamH5Notice tone="danger">{messages.errors.policy}</SdkworkIamH5Notice>
        ) : null}
        {policy.data ? (
          <SdkworkIamH5KeyValueList
            items={[
              { label: messages.list.policy.contact, value: allowed(policy.data.contactEnabled) },
              { label: messages.list.policy.email, value: allowed(policy.data.emailEnabled) },
              { label: messages.list.policy.oauth, value: allowed(policy.data.oauthEnabled) },
              {
                label: messages.list.policy.unlink,
                value: allowed(policy.data.selfServiceUnlinkEnabled),
              },
            ]}
          />
        ) : null}
      </SdkworkIamH5Card>

      <SdkworkIamH5Card title={messages.list.linksSection}>
        {links.status === "loading" && links.items.length === 0 ? (
          <SdkworkIamH5LoadingState label={messages.states.loading} />
        ) : null}
        {links.status === "error" ? (
          <SdkworkIamH5Notice tone="danger">{messages.errors.links}</SdkworkIamH5Notice>
        ) : null}
        {error !== undefined ? <SdkworkIamH5Notice tone="danger">{error}</SdkworkIamH5Notice> : null}
        {links.status !== "error" && links.items.length === 0 ? (
          <SdkworkIamH5Notice>{messages.states.emptyLinks}</SdkworkIamH5Notice>
        ) : null}
        {links.items.map((link) => (
          <div key={link.accountLinkId}>
            <SdkworkIamH5KeyValueList
              items={[
                {
                  label: link.provider,
                  value: link.providerUserId ?? link.accountLinkId,
                },
              ]}
            />
            {policy.data?.selfServiceUnlinkEnabled ? (
              <SdkworkIamH5Button
                disabled={pendingId === link.accountLinkId}
                onClick={() => {
                  void remove(link);
                }}
              >
                {messages.list.unlink}
              </SdkworkIamH5Button>
            ) : null}
            <SdkworkIamH5Badge>{link.accountLinkId}</SdkworkIamH5Badge>
          </div>
        ))}
      </SdkworkIamH5Card>
    </SdkworkIamH5Screen>
  );
}
