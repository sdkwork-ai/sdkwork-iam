import { useState } from "react";

import type {
  IamLoginContextOrganizationChoice,
  IamLoginContextSelectionChallenge,
} from "@sdkwork/iam-contracts";

import { useSdkworkIamH5AuthMessages } from "../i18n";
import type { SdkworkIamH5AuthController, SdkworkIamH5AuthSession } from "../types/auth-h5-types";

export interface SdkworkIamH5AuthLoginContextSelectionScreenProps {
  challenge: IamLoginContextSelectionChallenge;
  controller: SdkworkIamH5AuthController;
  errorMessage?: string;
  onAuthenticated?: (session: SdkworkIamH5AuthSession) => void;
  onCancel?: () => void;
}

function resolveOrganizationLabel(organization: IamLoginContextOrganizationChoice): string {
  return organization.displayName || organization.name || organization.organizationId;
}

function resolveSelectionErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }
  const message = error.message.trim();
  if (!message || /^HTTP\s+\d{3}\b/i.test(message) || /^(Failed to fetch|NetworkError|Load failed)/i.test(message)) {
    return fallback;
  }
  return message;
}

function resolvePersonalLabel(challenge: IamLoginContextSelectionChallenge): string {
  return challenge.options?.find((option) => option.loginScope === "TENANT")?.displayName
    || "";
}

export function SdkworkIamH5AuthLoginContextSelectionScreen({
  challenge,
  controller,
  errorMessage,
  onAuthenticated,
  onCancel,
}: SdkworkIamH5AuthLoginContextSelectionScreenProps) {
  const messages = useSdkworkIamH5AuthMessages();
  const [busyTarget, setBusyTarget] = useState<string | undefined>();
  const [localError, setLocalError] = useState<string | undefined>();

  const handlePersonalLogin = () => {
    setBusyTarget("personal");
    setLocalError(undefined);
    void controller.selectPersonalLogin({ continuationToken: challenge.continuationToken })
      .then((session) => onAuthenticated?.(session))
      .catch((error) => {
        setLocalError(resolveSelectionErrorMessage(error, messages.contextSelection.personalLoginFailed));
      })
      .finally(() => setBusyTarget(undefined));
  };

  const handleOrganizationLogin = (organizationId: string) => {
    setBusyTarget(organizationId);
    setLocalError(undefined);
    void controller.selectOrganization({
      continuationToken: challenge.continuationToken,
      organizationId,
    })
      .then((session) => onAuthenticated?.(session))
      .catch((error) => {
        setLocalError(resolveSelectionErrorMessage(error, messages.contextSelection.organizationLoginFailed));
      })
      .finally(() => setBusyTarget(undefined));
  };

  const resolvedError = localError || errorMessage;
  const optionClass =
    "min-h-12 rounded-lg border border-[var(--iam-h5-auth-border)] bg-[var(--iam-h5-auth-btn-disabled-bg)] px-4 py-3 text-left text-[15px] text-[var(--iam-h5-auth-text-main)] transition-colors active:opacity-70 disabled:opacity-50";

  return (
    <div className="sdkwork-iam-h5-auth-surface relative flex min-h-[100dvh] flex-col overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex min-h-[500px] flex-1 flex-col justify-center px-8 pb-8 pt-[calc(2rem+env(safe-area-inset-top,0px))]">
        <div className="mb-10 flex flex-col items-center">
          <h1 className="text-center text-2xl font-semibold">{messages.contextSelection.title}</h1>
          <p className="mt-2 text-center text-[14px] text-[var(--iam-h5-auth-text-sub)]">
            {messages.contextSelection.description}
          </p>
        </div>

        {resolvedError ? (
          <p className="mb-5 text-center text-[14px] text-[#EF4444]" role="alert">
            {resolvedError}
          </p>
        ) : null}

        <div aria-live="polite" className="sr-only" role="status">
          {busyTarget ? messages.contextSelection.signingIn : ""}
        </div>

        <div className="flex w-full flex-col gap-4">
          {challenge.challengeType === "LOGIN_CONTEXT_SELECTION" ? (
            <button
              className={optionClass}
              disabled={Boolean(busyTarget)}
              onClick={handlePersonalLogin}
              type="button"
            >
              {busyTarget === "personal"
                ? messages.contextSelection.signingIn
                : resolvePersonalLabel(challenge) || messages.contextSelection.personalLabel}
            </button>
          ) : null}
          {challenge.organizations.map((organization) => (
            <button
              className={optionClass}
              disabled={Boolean(busyTarget)}
              key={organization.organizationId}
              onClick={() => handleOrganizationLogin(organization.organizationId)}
              type="button"
            >
              {busyTarget === organization.organizationId
                ? messages.contextSelection.signingIn
                : resolveOrganizationLabel(organization)}
            </button>
          ))}
        </div>

        {onCancel ? (
          <button
            className="mt-8 flex min-h-11 cursor-pointer items-center justify-center text-center text-[14px] font-medium text-[var(--iam-h5-auth-link)] active:opacity-70 disabled:opacity-50"
            disabled={Boolean(busyTarget)}
            onClick={onCancel}
            type="button"
          >
            {messages.contextSelection.cancel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
