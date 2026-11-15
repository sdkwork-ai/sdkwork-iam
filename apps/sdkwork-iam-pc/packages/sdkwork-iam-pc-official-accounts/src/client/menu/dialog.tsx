/**
 * Full-screen custom-menu editor shared by every official-account surface.
 *
 * The editor owns the WeChat menu rules, the phone preview and the draft
 * history; this dialog adds the persistence boundary and the modal chrome:
 * load the stored context (or accept the row the host already holds), save the
 * draft, optionally publish it, and guard closing while changes are unsaved.
 * The IAM admin page, the IAM self-service app and product hosts such as
 * birdcoder2 mount this same component, so the menu configuration is one
 * implementation instead of one per surface.
 */
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import {
  Button,
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  StatusNotice,
} from "@sdkwork/ui-pc-react";

import type {
  OfficialAccountsCustomMenuContext,
  OfficialAccountsMenu,
} from "../../types";
import type { OfficialAccountsMenuMessages } from "./messages";
import type { OfficialAccountsDeployedMiniProgramAppLoader } from "./deployed-mini-program-picker";
import { SdkworkOfficialAccountsMenuWorkspace } from "./workspace";

/** Publication outcome the dialog maps onto the workspace notice. */
export interface SdkworkOfficialAccountsMenuPublishOutcome {
  /** Whether the channel accepted the draft. */
  published: boolean;
  /** Whether the draft was persisted before publishing. */
  saved?: boolean;
  /** Why publication did not happen, when it did not. */
  reason?: "backend_unavailable" | "publish_failed";
  /** Provider error text for a failed publication. */
  errorMessage?: string;
}

/**
 * Props of {@link SdkworkOfficialAccountsMenuDialog}.
 *
 * The caller supplies the context either directly (`context`, when the row is
 * already loaded) or through `load`; `save` must persist the draft, and the
 * optional `publish` adds the operator-only publish action.
 */
export interface SdkworkOfficialAccountsMenuDialogProps {
  /** Initial context (account name, logo and draft) when the host has the row. */
  context?: OfficialAccountsCustomMenuContext;
  /** Loads the stored context; used when `context` is absent. */
  load?: () => Promise<OfficialAccountsCustomMenuContext>;
  /**
   * Host-injected deployed mini program inventory for the "open mini program"
   * action; omitted hosts keep the plain AppID field.
   */
  loadDeployedMiniProgramApps?: OfficialAccountsDeployedMiniProgramAppLoader;
  /** Copy for the workspace and its notices. */
  messages: OfficialAccountsMenuMessages;
  /** Whether the surface may edit; defaults to true. */
  canUpdate?: boolean;
  /** Whether the surface may publish; defaults to whether `publish` is present. */
  canPublish?: boolean;
  /** Called when the user closes or discards the dialog. */
  onClose: () => void;
  /** Pull the live WeChat menu into the draft as a new version. */
  onRefresh?: (baseVersion?: number) => Promise<OfficialAccountsCustomMenuContext>;
  /** Restore an earlier revision; the callback persists and publishes it. */
  onRollback?: (version: number, baseVersion?: number) => Promise<OfficialAccountsCustomMenuContext>;
  /** Persists the draft and returns the stored draft, when the backend echoes it. */
  onSave: (menu: OfficialAccountsMenu) => Promise<OfficialAccountsMenu | undefined>;
  /** Publishes the draft (operator surfaces only). */
  onPublish?: (menu: OfficialAccountsMenu) => Promise<SdkworkOfficialAccountsMenuPublishOutcome | undefined>;
  /** Whether the dialog is open. */
  open: boolean;
  /** Reports the pending save/publish action to a host that blocks closing. */
  onBusyChange?: (busy: boolean) => void;
  /** Reports unsaved changes to a host that blocks closing. */
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * Render the shared custom-menu dialog.
 * @param props - context source, persistence callbacks and copy.
 * @returns the modal element tree.
 */
export function SdkworkOfficialAccountsMenuDialog(
  props: SdkworkOfficialAccountsMenuDialogProps,
): ReactNode {
  const {
    canPublish = props.onPublish !== undefined,
    canUpdate = true,
    context: initialContext,
    load,
    loadDeployedMiniProgramApps,
    messages,
    onBusyChange,
    onClose,
    onDirtyChange,
    onPublish,
    onRefresh,
    onRollback,
    onSave,
    open,
  } = props;
  const [context, setContext] = useState<OfficialAccountsCustomMenuContext | undefined>(initialContext);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [notice, setNotice] = useState<{ tone: "success" | "warning" | "danger" | "default"; text: string } | undefined>();
  const [busy, setBusy] = useState<"saving" | "publishing" | "refreshing" | "rollingBack" | undefined>();
  const [dirty, setDirty] = useState(false);
  const [closeConfirmationOpen, setCloseConfirmationOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialContext !== undefined) {
      setContext(initialContext);
      return;
    }
    if (load === undefined) return;
    let cancelled = false;
    setLoadError(undefined);
    setContext(undefined);
    load()
      .then((loaded) => { if (!cancelled) setContext(loaded); })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : messages.loadFailed);
      });
    return () => { cancelled = true; };
  }, [initialContext, load, messages.loadFailed, open]);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const requestClose = (): void => {
    if (busy !== undefined) return;
    if (dirty) {
      setCloseConfirmationOpen(true);
    } else {
      onClose();
    }
  };

  const runBusy = async <T,>(
    action: "saving" | "publishing" | "refreshing" | "rollingBack",
    work: () => Promise<T>,
  ): Promise<T | undefined> => {
    setBusy(action);
    onBusyChange?.(true);
    setNotice(undefined);
    try {
      return await work();
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof Error ? error.message : messages.loadFailed,
      });
      return undefined;
    } finally {
      setBusy(undefined);
      onBusyChange?.(false);
    }
  };

  const saveDraft = async (menu: OfficialAccountsMenu): Promise<OfficialAccountsMenu | undefined> => {
    const stored = await runBusy("saving", () => onSave(menu));
    if (stored !== undefined) {
      setContext((current) => current === undefined ? current : { ...current, menu: stored });
      setDirty(false);
      setNotice({ tone: "success", text: messages.saved });
    }
    return stored;
  };

  const publishDraft = async (menu: OfficialAccountsMenu): Promise<OfficialAccountsMenu | undefined> => {
    if (onPublish === undefined) return undefined;
    const outcome = await runBusy("publishing", async () => {
      // Some transports publish the stored draft, so persist it first.
      await onSave(menu);
      return await onPublish(menu);
    });
    if (outcome === undefined) return undefined;
    if (outcome.published) {
      setDirty(false);
      setNotice({ tone: "success", text: messages.publishSuccess });
      return menu;
    }
    if (outcome.reason === "backend_unavailable") {
      setNotice({ tone: "default", text: messages.publishUnavailable });
    } else if (outcome.reason === "publish_failed") {
      setNotice({
        tone: "danger",
        text: messages.publishFailedTemplate.replace("{message}", outcome.errorMessage ?? ""),
      });
    }
    return menu;
  };

  const refreshDraft = async (baseVersion?: number): Promise<void> => {
    if (onRefresh === undefined) return;
    const next = await runBusy("refreshing", () => onRefresh(baseVersion));
    if (next === undefined) return;
    setContext(next);
    setDirty(false);
    setNotice({ tone: "success", text: messages.refreshed });
  };

  const rollbackDraft = async (version: number, baseVersion?: number): Promise<void> => {
    if (onRollback === undefined) return;
    const next = await runBusy("rollingBack", () => onRollback(version, baseVersion));
    if (next === undefined) return;
    setContext(next);
    setDirty(false);
    setNotice({ tone: "success", text: messages.refreshed });
  };

  return (
    <>
      <Modal
        open={open}
        onOpenChange={(next) => {
          if (!next && !closeConfirmationOpen) requestClose();
        }}
      >
        <ModalContent
          aria-describedby={undefined}
          aria-labelledby="sdkwork-official-accounts-menu-dialog-title"
          className="left-1/2 top-1/2 flex h-dvh max-h-none w-screen max-w-none -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-none border-0 !bg-white p-0 opacity-100 shadow-2xl dark:!bg-[#18181b] sm:h-[min(94dvh,68rem)] sm:w-[min(96vw,100rem)] sm:rounded-[8px] sm:border sm:border-[#d9d9d9] dark:sm:border-[#3f3f46]"
          data-testid="custom-menu-modal"
          onEscapeKeyDown={(event) => { if (closeConfirmationOpen || busy !== undefined) event.preventDefault(); }}
          onInteractOutside={(event) => { if (closeConfirmationOpen || busy !== undefined) event.preventDefault(); }}
          showCloseButton={false}
          style={{ opacity: 1 }}
        >
          <div className="h-full min-h-0 overflow-hidden bg-white dark:bg-[#18181b]">
            <div className="relative flex h-full min-h-0 flex-col">
              {loadError !== undefined || notice !== undefined
                ? (
                  <div className="pointer-events-none absolute left-1/2 top-[5.5rem] z-40 w-[min(90%,38rem)] -translate-x-1/2 shadow-lg">
                    {loadError === undefined ? null : <StatusNotice tone="danger">{loadError}</StatusNotice>}
                    {notice === undefined ? null : <StatusNotice tone={notice.tone}>{notice.text}</StatusNotice>}
                  </div>
                )
                : null}
              <SdkworkOfficialAccountsMenuWorkspace
                key={context?.accountId ?? "menu"}
                busy={busy}
                canPublish={canPublish}
                canUpdate={canUpdate}
                context={context}
                history={context?.menu.history}
                loadDeployedMiniProgramApps={loadDeployedMiniProgramApps}
                messages={messages}
                onClose={requestClose}
                onDirtyChange={setDirty}
                onPublish={publishDraft}
                onRefresh={onRefresh === undefined ? undefined : refreshDraft}
                onRollback={onRollback === undefined ? undefined : rollbackDraft}
                onSaveDraft={saveDraft}
                version={context?.menu.version ?? context?.version}
              />
            </div>
          </div>
        </ModalContent>
      </Modal>

      <Modal
        open={closeConfirmationOpen}
        onOpenChange={(next) => { setCloseConfirmationOpen(next); }}
      >
        <ModalContent
          className="z-[251] !bg-white text-[#353535] opacity-100 dark:!border-[#52525b] dark:!bg-[#27272a] dark:text-[#f4f4f5]"
          data-testid="custom-menu-unsaved-confirmation"
          showCloseButton={false}
          size="sm"
          style={{ opacity: 1 }}
        >
          <ModalHeader className="border-[#e1e1e1] dark:border-[#3f3f46]">
            <ModalTitle>{messages.unsavedTitle}</ModalTitle>
            <ModalDescription className="text-[#8d8d8d] dark:text-[#a1a1aa]">
              {messages.unsavedDescription}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="border-[#e1e1e1] dark:border-[#3f3f46]">
            <Button onClick={() => setCloseConfirmationOpen(false)} type="button" variant="secondary">
              {messages.cancel}
            </Button>
            <Button
              onClick={() => {
                setCloseConfirmationOpen(false);
                setDirty(false);
                onClose();
              }}
              type="button"
              variant="danger"
            >
              {messages.discardChanges}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
