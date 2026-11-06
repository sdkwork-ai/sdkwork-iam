import { useEffect, useState } from "react";
import { Copy, Eye, EyeOff } from "lucide-react";
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  StatusNotice,
} from "@sdkwork/ui-pc-react";

import { useSdkworkIamTenantAdminMessages } from "../i18n";
import type { SdkworkIamTenantAdminMessages } from "../types/tenant-admin-messages";
import type {
  SdkworkIamTenantApplication,
  SdkworkIamTenantApplicationAccessToken,
} from "../types/tenant-admin-types";

export type TenantAccessTokenState =
  | { status: "loading" }
  | { error: unknown; status: "error" }
  | { status: "ready"; value: SdkworkIamTenantApplicationAccessToken };

interface TenantApplicationAccessTokenDrawerProps {
  application?: SdkworkIamTenantApplication;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  open: boolean;
  state: TenantAccessTokenState;
}

/**
 * Shows a short-lived delegated access credential for one IAM tenant
 * application. Issuance is owned by the caller so the drawer stays a pure
 * presentation surface and opening it never triggers a duplicate request.
 */
export function TenantApplicationAccessTokenDrawer({
  application,
  onOpenChange,
  onRetry,
  open,
  state,
}: TenantApplicationAccessTokenDrawerProps) {
  const messages = useSdkworkIamTenantAdminMessages();
  const copy = messages.applications.accessToken;
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setRevealed(false);
    setCopied(false);
  }, [application?.tenantApplicationId]);

  const copyToken = () => {
    if (state.status !== "ready" || typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      return;
    }
    void navigator.clipboard.writeText(state.value.accessToken)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  };

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <DrawerContent size="md">
        <DrawerHeader>
          <DrawerTitle>{copy.title}</DrawerTitle>
          <DrawerDescription>{copy.description}</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-4">
          {application ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-[var(--sdk-color-text-muted)]">{messages.applications.table.application}</dt>
              <dd className="min-w-0 truncate font-medium text-[var(--sdk-color-text-primary)]">
                {application.displayName}
              </dd>
              <dt className="text-[var(--sdk-color-text-muted)]">{messages.applications.table.appId}</dt>
              <dd className="break-all">{application.appId}</dd>
              <dt className="text-[var(--sdk-color-text-muted)]">{messages.applications.table.environment}</dt>
              <dd>{environmentLabel(application.environment, messages.applications.environments)}</dd>
              <dt className="text-[var(--sdk-color-text-muted)]">{messages.applications.table.status}</dt>
              <dd>{applicationStatusLabel(application.status, messages.applications.statuses)}</dd>
            </dl>
          ) : null}

          {state.status === "loading" ? (
            <p className="text-sm text-[var(--sdk-color-text-muted)]" role="status">{copy.loading}</p>
          ) : null}

          {state.status === "error" ? (
            <StatusNotice tone="danger">
              <div className="flex flex-wrap items-center gap-3">
                <span>{errorCopy(state.error, copy)}</span>
                <Button onClick={onRetry} size="sm" type="button" variant="outline">
                  {copy.regenerate}
                </Button>
              </div>
            </StatusNotice>
          ) : null}

          {state.status === "ready" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[var(--sdk-color-text-primary)]">{copy.tokenLabel}</span>
                  <span className="flex items-center gap-1">
                    <Button
                      aria-label={revealed ? copy.hide : copy.reveal}
                      onClick={() => setRevealed((value) => !value)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button onClick={copyToken} size="sm" type="button" variant="outline">
                      <Copy className="h-3.5 w-3.5" />
                      {copied ? copy.copied : copy.copy}
                    </Button>
                  </span>
                </div>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] p-3 text-xs text-[var(--sdk-color-text-primary)]">
                  {revealed ? state.value.accessToken : maskToken(state.value.accessToken)}
                </pre>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
                <dt className="text-[var(--sdk-color-text-muted)]">{copy.expiresAt}</dt>
                <dd>{formatDateTime(state.value.expiresAt)}</dd>
                <dt className="text-[var(--sdk-color-text-muted)]">{copy.appId}</dt>
                <dd className="break-all">{state.value.appId || "-"}</dd>
                <dt className="text-[var(--sdk-color-text-muted)]">{copy.tenantApplicationId}</dt>
                <dd className="break-all">{state.value.tenantApplicationId || "-"}</dd>
                <dt className="text-[var(--sdk-color-text-muted)]">{copy.sessionId}</dt>
                <dd className="break-all">{state.value.sessionId || "-"}</dd>
              </dl>
              <p className="text-xs leading-5 text-[var(--sdk-color-text-muted)]">{copy.securityNote}</p>
            </div>
          ) : null}
        </DrawerBody>
        <DrawerFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="secondary">{copy.close}</Button>
          <Button disabled={state.status === "loading"} onClick={onRetry} type="button" variant="outline">
            {copy.regenerate}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function environmentLabel(value: string, environments: Record<string, string>): string {
  return environments[value] ?? value;
}

function applicationStatusLabel(
  value: string,
  statuses: { disabled: string; enabled: string; pendingConfig: string; unknown: string },
): string {
  if (value === "enabled") {
    return statuses.enabled;
  }
  if (value === "disabled") {
    return statuses.disabled;
  }
  if (value === "pending_config") {
    return statuses.pendingConfig;
  }
  return statuses.unknown;
}

function maskToken(token: string): string {
  if (token.length <= 16) {
    return "*".repeat(16);
  }
  return `${token.slice(0, 8)}${"*".repeat(8)}${token.slice(-6)}`;
}

function errorCopy(
  error: unknown,
  copy: SdkworkIamTenantAdminMessages["applications"]["accessToken"],
): string {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const status = Number(record.status ?? record.statusCode);
  if (status === 403) {
    return copy.forbidden;
  }
  const message = String(record.message ?? record.error ?? "").toLowerCase();
  if (status === 400 || status === 404 || message.includes("must be enabled") || message.includes("not found")) {
    return copy.unavailable;
  }
  return copy.error;
}

function formatDateTime(value: string | undefined): string {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}
