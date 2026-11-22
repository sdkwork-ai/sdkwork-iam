import { useCallback, useEffect, useState } from "react";
import { QrCode, RefreshCw } from "lucide-react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  StatusNotice,
  Switch,
} from "@sdkwork/ui-pc-react";

import type {
  SdkworkIamOauthAdminPageProps,
  SdkworkIamOauthLoginFollowQrSettings,
  SdkworkIamOauthScanLoginOfficialAccount,
} from "../types/oauth-admin-types";
import { useSdkworkIamOauthAdminMessages } from "../i18n";
import { OauthAdminSelectField } from "../components/oauth-admin-ui";

/**
 * Login-success follow QR configuration.
 *
 * A desktop app that signs in through the system browser lands on the hosted
 * login-success page (`/oauth/desktop/launch`). That page shows the official
 * account's follow QR so the visitor can subscribe while the app reopens. The
 * operator picks one WeChat official account here; the backend generates that
 * account's permanent follow QR once and stores it, so the success page renders
 * the image without ever holding the account AppSecret. "Generate and preview"
 * calls the existing follow-QR endpoint for the picked account, which lets the
 * operator scan the code before saving it as the login-success QR.
 */
export function SdkworkIamOauthLoginFollowQrPage({
  controller,
  permissions,
}: SdkworkIamOauthAdminPageProps & {
  /**
   * `create` covers generating a preview QR
   * (`iam.oauth.resourceAccounts.followQrCodes.create`); `update` covers saving
   * the pinned account (`iam.oauth.loginFollowQr.update`). Both default to true.
   */
  permissions?: { create?: boolean; update?: boolean };
}) {
  const messages = useSdkworkIamOauthAdminMessages();
  const copy = messages.loginFollowQr;
  const canGenerate = permissions?.create ?? true;
  const canSave = permissions?.update ?? true;
  const [settings, setSettings] = useState<SdkworkIamOauthLoginFollowQrSettings | undefined>();
  const [accounts, setAccounts] = useState<SdkworkIamOauthScanLoginOfficialAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [preview, setPreview] = useState<{ accountId: string; qrCode: string; scene: string } | undefined>();

  const load = useCallback(() => {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    void Promise.all([
      controller.loadLoginFollowQrSettings(),
      controller.loadScanLoginSettings(),
    ])
      .then(([nextSettings, scanLogin]) => {
        setSettings(nextSettings);
        setAccounts(scanLogin.officialAccounts);
        setSelectedAccountId(
          nextSettings.resourceAccountId
            || scanLogin.officialAccounts[0]?.accountId
            || "",
        );
        setEnabled(nextSettings.enabled);
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : copy.description);
      })
      .finally(() => setBusy(false));
  }, [controller, copy.description]);

  useEffect(() => {
    load();
  }, [load]);

  const generatePreview = () => {
    if (!selectedAccountId) {
      return;
    }
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    void controller.createAccountFollowQrCode(selectedAccountId)
      .then((qr) => {
        setPreview({
          accountId: selectedAccountId,
          qrCode: qr.qrCode,
          scene: qr.scene,
        });
      })
      .catch((generateError: unknown) => {
        setError(generateError instanceof Error ? generateError.message : copy.generate);
      })
      .finally(() => setBusy(false));
  };

  const save = (refreshQrCode = false) => {
    if (!selectedAccountId) {
      return;
    }
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    void controller.saveLoginFollowQrSettings({
      enabled,
      refreshQrCode,
      resourceAccountId: selectedAccountId,
    })
      .then((nextSettings) => {
        setSettings(nextSettings);
        setEnabled(nextSettings.enabled);
        setNotice(refreshQrCode ? copy.saved : copy.saved);
      })
      .catch((saveError: unknown) => {
        setError(saveError instanceof Error ? saveError.message : copy.save);
      })
      .finally(() => setBusy(false));
  };

  const currentQr = settings?.qrCode ?? "";
  const accountOptions = accounts.map((account) => ({
    label: account.displayName,
    value: account.accountId,
  }));

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--sdk-color-text-primary)]">{copy.title}</h2>
        <Button disabled={busy} onClick={load} size="sm" type="button" variant="outline">
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          {copy.refresh}
        </Button>
      </div>
      <p className="text-sm text-[var(--sdk-color-text-secondary)]">{copy.description}</p>
      {error ? <StatusNotice tone="danger">{error}</StatusNotice> : null}
      {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}
      {busy && !settings ? <StatusNotice tone="default">{copy.description}</StatusNotice> : null}

      <div className="space-y-4 rounded-lg border border-[var(--sdk-color-border-default)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-[var(--sdk-color-text-primary)]">
              {copy.enabledLabel}
            </p>
            <p className="text-xs text-[var(--sdk-color-text-muted)]">{copy.captionHint}</p>
          </div>
          <label
            className="flex shrink-0 items-center gap-2 text-sm text-[var(--sdk-color-text-secondary)]"
            htmlFor="oauth-login-follow-qr-enabled"
          >
            <Switch
              aria-label={copy.enabledLabel}
              checked={enabled}
              disabled={busy || !canSave}
              id="oauth-login-follow-qr-enabled"
              onCheckedChange={setEnabled}
            />
          </label>
        </div>

        <OauthAdminSelectField
          disabled={busy || !canSave || accounts.length === 0}
          label={copy.accountLabel}
          onChange={setSelectedAccountId}
          options={accountOptions}
          value={selectedAccountId}
        />
        {accounts.length === 0 ? (
          <p className="text-xs text-[var(--sdk-color-text-muted)]">{copy.empty}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={busy || !canGenerate || !selectedAccountId}
            onClick={generatePreview}
            size="sm"
            type="button"
            variant="outline"
          >
            <QrCode aria-hidden="true" className="h-4 w-4" />
            {copy.generate}
          </Button>
          <Button
            disabled={busy || !canSave || !selectedAccountId}
            onClick={() => save(false)}
            size="sm"
            type="button"
          >
            {copy.save}
          </Button>
          <Button
            disabled={busy || !canSave || !selectedAccountId || !settings?.qrCode}
            onClick={() => save(true)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {copy.regenerate}
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-[var(--sdk-color-border-default)] p-4">
        <p className="text-sm font-medium text-[var(--sdk-color-text-primary)]">{copy.currentTitle}</p>
        {currentQr ? (
          <div className="flex flex-wrap items-start gap-4">
            <img
              alt={copy.previewTitle}
              className="h-36 w-36 rounded-lg border border-[var(--sdk-color-border-default)] bg-white object-contain p-1"
              data-testid="oauth-login-follow-qr-current"
              src={currentQr}
            />
            <dl className="min-w-0 space-y-1 text-xs text-[var(--sdk-color-text-muted)]">
              <div className="flex gap-2">
                <dt>{copy.accountLabel}</dt>
                <dd className="text-[var(--sdk-color-text-secondary)]">{settings?.accountName}</dd>
              </div>
              <div className="flex gap-2">
                <dt>{copy.sceneLabel}</dt>
                <dd className="break-all text-[var(--sdk-color-text-secondary)]">{settings?.scene}</dd>
              </div>
              {settings?.updatedAt ? (
                <div className="flex gap-2">
                  <dt>{copy.updatedAt}</dt>
                  <dd className="text-[var(--sdk-color-text-secondary)]">{settings.updatedAt}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : (
          <StatusNotice tone="default">{copy.empty}</StatusNotice>
        )}
      </div>

      <Modal onOpenChange={(open) => { if (!open) setPreview(undefined) }} open={preview !== undefined}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{copy.previewTitle}</ModalTitle>
            <ModalDescription>{copy.captionHint}</ModalDescription>
          </ModalHeader>
          <ModalBody>
            {preview ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  alt={copy.previewTitle}
                  className="h-56 w-56 rounded-lg border border-[var(--sdk-color-border-default)] bg-white object-contain p-2"
                  data-testid="oauth-login-follow-qr-preview"
                  src={preview.qrCode}
                />
                <p className="text-xs text-[var(--sdk-color-text-muted)]">
                  {copy.sceneLabel}: {preview.scene}
                </p>
                <Button onClick={() => { setPreview(undefined) }} type="button" variant="outline">
                  {messages.common.cancel}
                </Button>
              </div>
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
