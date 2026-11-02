/**
 * Self-service profile screen (`app.iam.user-center.profile`, `/user/profile`).
 *
 * Two regions: the account identifiers the server owns (read-only here, because
 * changing an email or phone is a verification flow, not a text edit) and the
 * display fields the user owns. The form seeds from the loaded record once — a
 * re-render must not overwrite what the user is typing.
 */

import { useCallback, useMemo, useState, type ReactElement } from "react";

import {
  SdkworkIamH5Button,
  SdkworkIamH5Card,
  SdkworkIamH5ErrorState,
  SdkworkIamH5Field,
  SdkworkIamH5KeyValueList,
  SdkworkIamH5LoadingState,
  SdkworkIamH5Notice,
  SdkworkIamH5Screen,
  describeSdkworkIamH5Error,
  useSdkworkIamH5Resource,
} from "@sdkwork/iam-h5-commons";

import { useIamH5UserCenterMessages } from "../i18n/index.js";
import type { SdkworkIamH5UserCenterController } from "../types/user-center-h5-types.js";

/** Props of {@link SdkworkIamH5UserCenterProfileScreen}. */
export interface SdkworkIamH5UserCenterProfileScreenProps {
  controller: SdkworkIamH5UserCenterController;
  onBack?: () => void;
  /** Opens the third-party sign-in screen; rendered only when provided. */
  onOpenOAuthProviders?: () => void;
  /** Opens the password screen; the link is only rendered when provided. */
  onOpenPassword?: () => void;
  title?: string;
}

/** The profile screen. */
export function SdkworkIamH5UserCenterProfileScreen({
  controller,
  onBack,
  onOpenOAuthProviders,
  onOpenPassword,
  title,
}: SdkworkIamH5UserCenterProfileScreenProps): ReactElement {
  const messages = useIamH5UserCenterMessages();
  const profile = useSdkworkIamH5Resource(useCallback(() => controller.loadProfile(), [controller]));
  const policy = useSdkworkIamH5Resource(
    useCallback(() => controller.loadVerificationPolicy(), [controller]),
  );

  const [draft, setDraft] = useState<{ displayName: string; nickname: string } | undefined>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

  // The editable values are derived on every render: the user's draft when one
  // exists, otherwise the loaded record. Seeding a state variable from an effect
  // instead would paint one frame with empty fields after the record arrives.
  const displayName = draft?.displayName ?? profile.data?.displayName ?? "";
  const nickname = draft?.nickname ?? profile.data?.nickname ?? "";

  const verificationNote = useMemo(() => {
    const current = policy.data;
    if (!current) return undefined;
    return current.emailVerificationRequired || current.phoneVerificationRequired
      ? messages.profile.verificationRequired
      : undefined;
  }, [messages.profile.verificationRequired, policy.data]);

  const handleSave = () => {
    setSaving(true);
    setSaveError(undefined);
    setSaved(false);
    controller
      .updateProfile({ displayName, nickname })
      .then((next) => {
        setDraft({ displayName: next.displayName ?? "", nickname: next.nickname ?? "" });
        setSaved(true);
      })
      .catch((error: unknown) => {
        setSaveError(describeSdkworkIamH5Error(error, messages.errors.save).message);
      })
      .finally(() => setSaving(false));
  };

  return (
    <SdkworkIamH5Screen onBack={onBack} title={title ?? messages.profile.title}>
      {profile.status === "loading" && !profile.data ? (
        <SdkworkIamH5LoadingState label={messages.states.loading} />
      ) : profile.status === "error" && profile.error ? (
        <SdkworkIamH5ErrorState
          error={{ message: `${messages.errors.profile} ${profile.error.message}`.trim() }}
          onRetry={() => void profile.reload()}
          retryLabel={messages.states.retry}
          title={messages.states.errorTitle}
        />
      ) : (
        <>
          {saveError ? <SdkworkIamH5Notice tone="danger">{saveError}</SdkworkIamH5Notice> : null}
          {saved ? <SdkworkIamH5Notice tone="success">{messages.profile.saved}</SdkworkIamH5Notice> : null}

          <SdkworkIamH5Card title={messages.profile.identitySection}>
            <SdkworkIamH5KeyValueList
              items={[
                { label: messages.profile.accountId, value: profile.data?.userId ?? messages.profile.notSet },
                { label: messages.profile.username, value: profile.data?.username ?? messages.profile.notSet },
                { label: messages.profile.email, value: profile.data?.email ?? messages.profile.notSet },
                { label: messages.profile.phone, value: profile.data?.phone ?? messages.profile.notSet },
              ]}
            />
            {verificationNote ? (
              <p className="sdkwork-iam-h5-card__caption" style={{ marginBlockStart: "var(--sdkwork-iam-h5-space-sm)" }}>
                {verificationNote}
              </p>
            ) : null}
          </SdkworkIamH5Card>

          <SdkworkIamH5Card caption={messages.profile.editHint} title={messages.profile.editableSection}>
            <SdkworkIamH5Field
              label={messages.profile.displayName}
              onChange={(value) => setDraft({ displayName: value, nickname })}
              value={displayName}
            />
            <SdkworkIamH5Field
              label={messages.profile.nickname}
              onChange={(value) => setDraft({ displayName, nickname: value })}
              value={nickname}
            />
            <div style={{ marginBlockStart: "var(--sdkwork-iam-h5-space-md)" }}>
              <SdkworkIamH5Button block disabled={saving} onClick={handleSave}>
                {saving ? messages.profile.saving : messages.profile.save}
              </SdkworkIamH5Button>
            </div>
          </SdkworkIamH5Card>

          {onOpenPassword ? (
            <div style={{ marginBlockStart: "var(--sdkwork-iam-h5-space-md)" }}>
              <SdkworkIamH5Button block onClick={onOpenPassword} variant="secondary">
                {messages.profile.openPassword}
              </SdkworkIamH5Button>
            </div>
          ) : null}
          {onOpenOAuthProviders ? (
            <div style={{ marginBlockStart: "var(--sdkwork-iam-h5-space-sm)" }}>
              <SdkworkIamH5Button block onClick={onOpenOAuthProviders} variant="secondary">
                {messages.profile.openOAuthProviders}
              </SdkworkIamH5Button>
            </div>
          ) : null}
        </>
      )}
    </SdkworkIamH5Screen>
  );
}
