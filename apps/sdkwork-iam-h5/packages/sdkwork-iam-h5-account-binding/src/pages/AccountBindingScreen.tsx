/**
 * Account-binding screen (`app.iam.account-binding.list`, `/user/account-binding`).
 *
 * Three regions, each gated by the tenant policy the screen just loaded: what the
 * tenant allows, the email binding the caller can add or remove, and the linked
 * third-party identities. Unlinking is a two-step action *in place* rather than a
 * `window.confirm`: a native dialog is untestable, unstyleable and disappears on
 * some Android webviews.
 */

import { useCallback, useState, type ReactElement } from "react";

import {
  SdkworkIamH5Badge,
  SdkworkIamH5Button,
  SdkworkIamH5Card,
  SdkworkIamH5ErrorState,
  SdkworkIamH5Field,
  SdkworkIamH5KeyValueList,
  SdkworkIamH5LoadingState,
  SdkworkIamH5Notice,
  SdkworkIamH5PagedListSection,
  SdkworkIamH5Screen,
  describeSdkworkIamH5Error,
  useSdkworkIamH5PagedList,
  useSdkworkIamH5Resource,
  type SdkworkIamH5ListQuery,
} from "@sdkwork/iam-h5-commons";

import { useIamH5AccountBindingMessages } from "../i18n/index.js";
import type {
  SdkworkIamH5AccountBindingController,
  SdkworkIamH5AccountBindingScreenProps,
  SdkworkIamH5OAuthAccountLink,
} from "../types/account-binding-h5-types.js";

/** The account-binding screen. */
export function SdkworkIamH5AccountBindingScreen({
  controller,
  onBack,
  title,
}: SdkworkIamH5AccountBindingScreenProps): ReactElement {
  const messages = useIamH5AccountBindingMessages();
  const policy = useSdkworkIamH5Resource(useCallback(() => controller.loadPolicy(), [controller]));
  const links = useSdkworkIamH5PagedList<SdkworkIamH5OAuthAccountLink>(
    useCallback((query: SdkworkIamH5ListQuery) => controller.fetchAccountLinksPage(query), [controller]),
  );

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"bind" | "unbind" | undefined>();
  const [pendingUnlink, setPendingUnlink] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [actionError, setActionError] = useState<string | undefined>();

  const contact = policy.data?.contactBinding;
  const oauth = policy.data?.oauthBinding;
  const canBindEmail = Boolean(contact?.enabled && contact.emailEnabled);
  const canUnbindEmail = Boolean(canBindEmail && contact?.emailChangeEnabled);
  const canUnlink = Boolean(oauth?.enabled && oauth.selfServiceUnlinkEnabled);

  const run = (kind: "bind" | "unbind", action: () => Promise<unknown>, success: string) => {
    setBusy(kind);
    setNotice(undefined);
    setActionError(undefined);
    action()
      .then(() => {
        setNotice(success);
        return links.refresh();
      })
      .catch((error: unknown) => {
        setActionError(describeSdkworkIamH5Error(error, messages.errors[kind]).message);
      })
      .finally(() => setBusy(undefined));
  };

  const unlink = (link: SdkworkIamH5OAuthAccountLink) => {
    setNotice(undefined);
    setActionError(undefined);
    controller
      .unlinkAccountLink(link.accountLinkId)
      .then(() => {
        setPendingUnlink(undefined);
        setNotice(messages.binding.links.unlinked);
        return links.refresh();
      })
      .catch((error: unknown) => {
        setActionError(describeSdkworkIamH5Error(error, messages.errors.unlink).message);
      });
  };

  return (
    <SdkworkIamH5Screen onBack={onBack} title={title ?? messages.binding.title}>
      {actionError ? <SdkworkIamH5Notice tone="danger">{actionError}</SdkworkIamH5Notice> : null}
      {notice ? <SdkworkIamH5Notice tone="success">{notice}</SdkworkIamH5Notice> : null}

      <SdkworkIamH5Card title={messages.binding.policySection}>
        {policy.status === "loading" && !policy.data ? (
          <SdkworkIamH5LoadingState label={messages.states.loading} />
        ) : policy.status === "error" && policy.error ? (
          <SdkworkIamH5ErrorState
            error={{ message: `${messages.errors.policy} ${policy.error.message}`.trim() }}
            onRetry={() => void policy.reload()}
            retryLabel={messages.states.retry}
            title={messages.states.errorTitle}
          />
        ) : (
          <SdkworkIamH5KeyValueList
            items={[
              {
                label: messages.binding.policy.contact,
                value: <Flag enabled={Boolean(contact?.enabled)} messages={messages} />,
              },
              {
                label: messages.binding.policy.email,
                value: <Flag enabled={Boolean(contact?.emailEnabled)} messages={messages} />,
              },
              {
                label: messages.binding.policy.phone,
                value: <Flag enabled={Boolean(contact?.phoneEnabled)} messages={messages} />,
              },
              {
                label: messages.binding.policy.selfServiceLink,
                value: <Flag enabled={Boolean(oauth?.selfServiceLinkEnabled)} messages={messages} />,
              },
              {
                label: messages.binding.policy.selfServiceUnlink,
                value: <Flag enabled={Boolean(oauth?.selfServiceUnlinkEnabled)} messages={messages} />,
              },
            ]}
          />
        )}
      </SdkworkIamH5Card>

      {canBindEmail ? (
        <div style={{ marginBlockStart: "var(--sdkwork-iam-h5-space-md)" }}>
          <SdkworkIamH5Card caption={messages.binding.email.hint} title={messages.binding.emailSection}>
            <SdkworkIamH5Field
              inputMode="email"
              label={messages.binding.email.address}
              onChange={setEmail}
              value={email}
            />
            <SdkworkIamH5Field
              inputMode="numeric"
              label={messages.binding.email.code}
              onChange={setCode}
              value={code}
            />
            <div style={{ marginBlockStart: "var(--sdkwork-iam-h5-space-md)" }}>
              <SdkworkIamH5Button
                block
                disabled={busy !== undefined || email.trim() === "" || code.trim() === ""}
                onClick={() => run("bind", () => controller.bindEmail({ email, verificationCode: code }), messages.binding.email.bound)}
              >
                {busy === "bind" ? messages.binding.email.binding : messages.binding.email.bind}
              </SdkworkIamH5Button>
            </div>
            {canUnbindEmail ? (
              <>
                <SdkworkIamH5Field
                  label={messages.binding.email.unbindPassword}
                  onChange={setPassword}
                  secret
                  value={password}
                />
                <div style={{ marginBlockStart: "var(--sdkwork-iam-h5-space-sm)" }}>
                  <SdkworkIamH5Button
                    block
                    disabled={busy !== undefined || password.trim() === ""}
                    onClick={() => run("unbind", () => controller.unbindEmail({ password }), messages.binding.email.unbound)}
                    variant="secondary"
                  >
                    {busy === "unbind" ? messages.binding.email.unbinding : messages.binding.email.unbind}
                  </SdkworkIamH5Button>
                </div>
              </>
            ) : null}
          </SdkworkIamH5Card>
        </div>
      ) : null}

      <div style={{ marginBlockStart: "var(--sdkwork-iam-h5-space-md)" }}>
        <SdkworkIamH5PagedListSection
          buildRow={(link) => ({
            accessory: canUnlink ? (
              pendingUnlink === link.accountLinkId ? (
                <span style={{ display: "flex", gap: "var(--sdkwork-iam-h5-space-xs)" }}>
                  <SdkworkIamH5Button onClick={() => unlink(link)} variant="danger">
                    {messages.binding.links.confirmUnlink}
                  </SdkworkIamH5Button>
                  <SdkworkIamH5Button onClick={() => setPendingUnlink(undefined)} variant="secondary">
                    {messages.binding.links.cancel}
                  </SdkworkIamH5Button>
                </span>
              ) : (
                <SdkworkIamH5Button onClick={() => setPendingUnlink(link.accountLinkId)} variant="secondary">
                  {messages.binding.links.unlink}
                </SdkworkIamH5Button>
              )
            ) : undefined,
            id: link.accountLinkId,
            primary: link.provider ?? messages.binding.links.provider,
            secondary: link.providerUserId ?? link.accountLinkId,
          })}
          list={links}
          messages={{
            emptyDetail: messages.binding.links.emptyDetail,
            emptySearch: messages.states.emptySearch,
            emptyTitle: messages.binding.links.emptyTitle,
            errorMessage: messages.errors.links,
            errorTitle: messages.states.errorTitle,
            loading: messages.states.loading,
            loadMore: messages.states.loadMore,
            loadMoreErrorMessage: messages.errors.more,
            retry: messages.states.retry,
          }}
          searchLabel={messages.binding.links.searchLabel}
          title={messages.binding.linksSection}
        />
      </div>
      {pendingUnlink ? (
        <p className="sdkwork-iam-h5-card__caption" style={{ marginBlockStart: "var(--sdkwork-iam-h5-space-sm)" }}>
          {messages.binding.links.confirmHint}
        </p>
      ) : null}
    </SdkworkIamH5Screen>
  );
}

interface FlagProps {
  enabled: boolean;
  messages: ReturnType<typeof useIamH5AccountBindingMessages>;
}

function Flag({ enabled, messages }: FlagProps): ReactElement {
  return (
    <SdkworkIamH5Badge tone={enabled ? "success" : "neutral"}>
      {enabled ? messages.binding.state.enabled : messages.binding.state.disabled}
    </SdkworkIamH5Badge>
  );
}
