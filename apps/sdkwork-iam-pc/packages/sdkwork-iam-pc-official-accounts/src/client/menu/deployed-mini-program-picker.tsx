/**
 * Deployed-application picker for the custom-menu "open mini program" action.
 *
 * The WeChat menu action requires a mini program AppID. Hosts that can reach the
 * deploy-application inventory (Cloud Router's application center links each
 * Deploy application to an IAM mini program account in
 * `deploy_app.metadata.integrations`) inject a loader; this component renders
 * the link affordance and the selection dialog. The component is transport
 * agnostic: it performs no HTTP and assembles no credentials, and a host that
 * injects no loader renders no affordance at all.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  StatusNotice,
} from "@sdkwork/ui-pc-react";

import type { OfficialAccountsMenuMessages } from "./messages";

/** One deployed mini program application a host offers to the menu editor. */
export interface OfficialAccountsDeployedMiniProgramApp {
  /** Deploy application identity. */
  id: string;
  /** Deploy application display name. */
  name: string;
  /** Secondary identifier, usually the deploy application slug. */
  reference?: string;
  /** Deploy application lifecycle status (`ACTIVE`, `PAUSED`, ...). */
  status?: string;
  /** Deploy environment whose linked account is shown. */
  environment?: string;
  /**
   * AppID of the mini program account linked to the deploy application.
   * Absent when the application links no account; the row is then shown
   * unselectable so the operator learns why it cannot be chosen.
   */
  appId?: string;
  /** Display name of the linked mini program account. */
  accountName?: string;
}

/** Loads the deployed mini program applications a host can offer. */
export type OfficialAccountsDeployedMiniProgramAppLoader = () => Promise<
  readonly OfficialAccountsDeployedMiniProgramApp[]
>;

/** Props of {@link SdkworkOfficialAccountsDeployedMiniProgramPicker}. */
export interface SdkworkOfficialAccountsDeployedMiniProgramPickerProps {
  /** Whether the link affordance is disabled (read-only surfaces). */
  disabled?: boolean;
  /** Host-provided inventory loader. */
  loader: OfficialAccountsDeployedMiniProgramAppLoader;
  /** Copy for the link affordance and the dialog. */
  messages: OfficialAccountsMenuMessages;
  /** Receives the AppID of the chosen application's linked account. */
  onSelect: (appId: string) => void;
}

type PickerStatus = "idle" | "loading" | "ready" | "error";

/**
 * Renders the "select from deployed apps" link and its selection dialog.
 * @param props - inventory loader, copy and the AppID sink.
 * @returns the link affordance with its portal dialog.
 */
export function SdkworkOfficialAccountsDeployedMiniProgramPicker({
  disabled = false,
  loader,
  messages,
  onSelect,
}: SdkworkOfficialAccountsDeployedMiniProgramPickerProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<PickerStatus>("idle");
  const [items, setItems] = useState<readonly OfficialAccountsDeployedMiniProgramApp[]>([]);
  const requestId = useRef(0);
  // A host may pass an inline closure; keeping the loader in a ref means its
  // identity never restarts the in-flight load of an open dialog.
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const load = useCallback(async (): Promise<void> => {
    const current = requestId.current + 1;
    requestId.current = current;
    setStatus("loading");
    try {
      const next = await loaderRef.current();
      if (requestId.current !== current) {
        return;
      }
      setItems(next);
      setStatus("ready");
    } catch {
      if (requestId.current !== current) {
        return;
      }
      setItems([]);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    void load();
    return () => {
      // Abandon an in-flight load so a closed dialog never repaints.
      requestId.current += 1;
    };
  }, [load, open]);

  const select = (appId: string): void => {
    onSelect(appId);
    setOpen(false);
  };

  return (
    <>
      <button
        className="inline-flex h-6 shrink-0 items-center text-xs font-normal text-[#576b95] hover:underline disabled:cursor-not-allowed disabled:text-[#c9c9c9] dark:text-[#7aa7ff] dark:disabled:text-[#52525b]"
        disabled={disabled}
        onClick={() => setOpen(true)}
        type="button"
      >
        {messages.pickFromDeployedApps}
      </button>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent
          className="z-[260] !bg-white text-[#353535] dark:!border-[#52525b] dark:!bg-[#27272a] dark:text-[#f4f4f5]"
          data-testid="custom-menu-mini-program-picker"
          showCloseButton={false}
          size="md"
        >
          <ModalHeader className="border-[#e1e1e1] dark:border-[#3f3f46]">
            <ModalTitle>{messages.pickerTitle}</ModalTitle>
            <ModalDescription className="text-xs leading-5 text-[#8d8d8d] dark:text-[#a1a1aa]">
              {messages.pickerDescription}
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="max-h-[min(52vh,26rem)] overflow-y-auto">
            {status === "loading" ? (
              <p className="py-6 text-center text-sm text-[#8d8d8d] dark:text-[#a1a1aa]">{messages.pickerLoading}</p>
            ) : null}
            {status === "error" ? (
              <StatusNotice tone="danger">{messages.pickerLoadFailed}</StatusNotice>
            ) : null}
            {status === "ready" && items.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#8d8d8d] dark:text-[#a1a1aa]">{messages.pickerEmpty}</p>
            ) : null}
            {status === "ready" && items.length > 0 ? (
              <ul className="space-y-2">
                {items.map((item) => {
                  const appId = item.appId?.trim() ?? "";
                  return (
                    <li key={`${item.id}\u0000${appId}`}>
                      <button
                        className="flex w-full min-w-0 items-start gap-3 border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70 border-[#dcdcdc] bg-white hover:border-[#07c160] hover:bg-[#f4fff8] disabled:hover:border-[#dcdcdc] disabled:hover:bg-white dark:border-[#52525b] dark:bg-[#202023] dark:hover:border-[#2bd576] dark:hover:bg-[#173b28]"
                        disabled={appId === ""}
                        onClick={() => select(appId)}
                        type="button"
                      >
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="truncate text-sm font-medium text-[#353535] dark:text-[#f4f4f5]">
                            {item.name}
                          </span>
                          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#8d8d8d] dark:text-[#a1a1aa]">
                            {appId === "" ? (
                              <span className="text-[#d48806] dark:text-[#f0b429]">{messages.pickerNoAccount}</span>
                            ) : (
                              <span className="font-mono text-[#505050] dark:text-[#d4d4d8]">{appId}</span>
                            )}
                            {item.environment ? (
                              <span>
                                {messages.pickerEnvironmentTemplate.replace("{environment}", item.environment)}
                              </span>
                            ) : null}
                            {item.accountName ? <span className="truncate">{item.accountName}</span> : null}
                            {item.reference ? <span className="truncate">{item.reference}</span> : null}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </ModalBody>
          <ModalFooter className="border-[#e1e1e1] dark:border-[#3f3f46]">
            {status === "error" ? (
              <Button onClick={() => { void load(); }} type="button" variant="outline">
                {messages.pickerRetry}
              </Button>
            ) : null}
            <Button onClick={() => setOpen(false)} type="button" variant="secondary">
              {messages.cancel}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
