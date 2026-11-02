/**
 * Admin account-binding settings (`admin.iam.account-binding.list`, path
 * `/admin/iam/account-binding`).
 *
 * The tenant policy, not a user's own bindings: an operator decides here which binding
 * capabilities exist and whether users may remove a linked identity themselves. The draft is
 * local so a half-toggled policy is never mistaken for the saved one, and a save replaces the
 * displayed policy only after the server accepts it.
 */

import { useCallback, useEffect, useState, type ReactElement } from "react";

import {
  SdkworkIamH5Button,
  SdkworkIamH5Notice,
  SdkworkIamH5Screen,
} from "@sdkwork/iam-h5-commons";

import { useIamH5AdminAccountBindingMessages } from "../i18n/index.js";
import type {
  SdkworkIamH5AdminAccountBindingController,
  SdkworkIamH5AdminAccountBindingPolicy,
} from "../types/admin-account-binding-types.js";

/** Props of {@link SdkworkIamH5AdminAccountBindingScreen}. */
export interface SdkworkIamH5AdminAccountBindingScreenProps {
  controller: SdkworkIamH5AdminAccountBindingController;
  /** Back handler; omitted when the host renders this as a root tab. */
  onBack?: () => void;
}

/** The admin account-binding settings screen. */
export function SdkworkIamH5AdminAccountBindingScreen({
  controller,
  onBack,
}: SdkworkIamH5AdminAccountBindingScreenProps): ReactElement {
  const messages = useIamH5AdminAccountBindingMessages();
  const [saved, setSaved] = useState<SdkworkIamH5AdminAccountBindingPolicy | null>(null);
  const [draft, setDraft] = useState<SdkworkIamH5AdminAccountBindingPolicy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const policy = await controller.loadPolicy();
      setSaved(policy);
      setDraft(policy);
    } catch {
      setError(messages.errors.load);
    } finally {
      setLoaded(true);
    }
  }, [controller, messages.errors.load]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty =
    draft !== null &&
    saved !== null &&
    (draft.contactEnabled !== saved.contactEnabled ||
      draft.emailEnabled !== saved.emailEnabled ||
      draft.oauthEnabled !== saved.oauthEnabled ||
      draft.selfServiceUnlinkEnabled !== saved.selfServiceUnlinkEnabled);

  const save = useCallback(async () => {
    if (!draft) return;
    const allDisabled =
      !draft.contactEnabled &&
      !draft.emailEnabled &&
      !draft.oauthEnabled &&
      !draft.selfServiceUnlinkEnabled;
    // Disabling every capability at once is almost always a mistake, and the server would
    // accept it silently.
    if (allDisabled) {
      setError(messages.errors.allDisabled);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await controller.savePolicy(draft);
      setSaved(draft);
    } catch {
      setError(messages.errors.save);
    } finally {
      setBusy(false);
    }
  }, [controller, draft, messages.errors.allDisabled, messages.errors.save]);

  const toggles: { key: keyof SdkworkIamH5AdminAccountBindingPolicy; label: string }[] = [
    { key: "contactEnabled", label: messages.screen.contact },
    { key: "emailEnabled", label: messages.screen.email },
    { key: "oauthEnabled", label: messages.screen.oauth },
    { key: "selfServiceUnlinkEnabled", label: messages.screen.selfServiceUnlink },
  ];

  return (
    <SdkworkIamH5Screen {...(onBack ? { onBack } : {})} title={messages.screen.title}>
      <p>{messages.screen.subtitle}</p>
      {!loaded ? <SdkworkIamH5Notice tone="info">{messages.states.loading}</SdkworkIamH5Notice> : null}
      {loaded && draft === null ? (
        <SdkworkIamH5Notice tone="info">
          {messages.states.notLoaded}
          <SdkworkIamH5Button onClick={() => void load()}>{messages.screen.reloadPolicy}</SdkworkIamH5Button>
        </SdkworkIamH5Notice>
      ) : null}
      {error ? <SdkworkIamH5Notice tone="danger">{error}</SdkworkIamH5Notice> : null}
      {draft ? (
        <section>
          <h2>{messages.screen.policySection}</h2>
          {toggles.map(({ key, label }) => (
            <label key={key} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0" }}>
              <span>{label}</span>
              <input
                checked={draft[key]}
                disabled={busy}
                onChange={(event) => {
                  const next = event.currentTarget.checked;
                  setDraft((current) => (current ? { ...current, [key]: next } : current));
                }}
                type="checkbox"
              />
            </label>
          ))}
          <SdkworkIamH5Button disabled={!dirty || busy} onClick={() => void save()}>
            {busy ? messages.screen.saving : messages.screen.save}
          </SdkworkIamH5Button>
          {saved && !dirty ? (
            <SdkworkIamH5Notice tone="success">{messages.screen.saved}</SdkworkIamH5Notice>
          ) : null}
        </section>
      ) : null}
    </SdkworkIamH5Screen>
  );
}
