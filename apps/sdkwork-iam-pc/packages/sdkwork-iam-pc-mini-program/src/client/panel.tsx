import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  Button,
  ConfirmDialog,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
  Label,
  StatusBadge,
  StatusNotice,
  Switch,
} from "@sdkwork/ui-pc-react";

import type { MiniProgramCapabilities, MiniProgramController } from "../controller";
import type {
  MiniProgramAccount,
  MiniProgramLoginCheckStatus,
  MiniProgramProviderConfig,
} from "../types";
import { useMiniProgramMessages } from "../messages";
import type { MiniProgramMessages } from "../messages";

/** Shared field control class; the panel keeps Tailwind utilities, not a CSS module. */
const FIELD_CLASS_NAME =
  "w-full rounded-[0.75rem] border border-[var(--sdk-color-border-default)] bg-transparent px-3 py-2 text-sm";

/** WeChat mini-program AppID shape accepted by the backend setup route. */
const APP_ID_PATTERN = /^[A-Za-z0-9_-]{4,64}$/u;

/** The drawer's create/edit form values. */
interface FormDraft {
  displayName: string;
  appId: string;
  appSecret: string;
  originalId: string;
  accountType: "personal" | "enterprise" | "";
  category: string;
  note: string;
}

/** The account drawer's state: create without a row, edit with one. */
interface DrawerState {
  mode: "create" | "edit";
  account?: MiniProgramAccount;
  draft: FormDraft;
}

/** Field keys that can carry an inline validation message. */
type FieldKey = keyof FormDraft;

function emptyDraft(): FormDraft {
  return {
    displayName: "",
    appId: "",
    appSecret: "",
    originalId: "",
    accountType: "personal",
    category: "",
    note: "",
  };
}

function draftOf(account: MiniProgramAccount): FormDraft {
  return {
    displayName: account.displayName,
    appId: account.appId,
    appSecret: "",
    originalId: account.originalId ?? "",
    accountType: account.accountType === "enterprise" ? "enterprise" : "personal",
    category: account.providerConfig.category ?? "",
    note: account.providerConfig.note ?? "",
  };
}

/**
 * The account's provider configuration with the edited non-identity settings
 * merged in. Every other key (domain sets, message-push settings, …) the
 * document carries is preserved: `provider_config_json` belongs to the channel,
 * and the panel edits only its own two fields.
 * @param account - the row being edited.
 * @param draft - the drawer form.
 * @returns the complete document to persist.
 */
function mergedProviderConfig(
  account: MiniProgramAccount,
  draft: FormDraft,
): MiniProgramProviderConfig {
  const config: MiniProgramProviderConfig = { ...account.providerConfig };
  const category = draft.category.trim();
  const note = draft.note.trim();
  if (category === "") delete config.category;
  else config.category = category;
  if (note === "") delete config.note;
  else config.note = note;
  return config;
}

/** Resolves the account-type label. */
function accountTypeLabel(
  account: MiniProgramAccount,
  messages: MiniProgramMessages,
): string {
  if (account.accountType === "personal") return messages.accountType.personal;
  if (account.accountType === "enterprise") return messages.accountType.enterprise;
  return messages.accountType.unset;
}

/** Resolves the login-check label. */
function loginCheckLabel(
  status: MiniProgramLoginCheckStatus,
  messages: MiniProgramMessages,
): string {
  return messages.loginCheck[status];
}

/** One account row. */
function AccountRow({
  account,
  capabilities,
  messages,
  onDelete,
  onEdit,
  onToggle,
}: {
  account: MiniProgramAccount;
  capabilities: MiniProgramCapabilities;
  messages: MiniProgramMessages;
  onDelete: () => void;
  onEdit: () => void;
  onToggle: (enabled: boolean) => void;
}): ReactNode {
  return (
    <div
      className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_8rem_9rem_auto] items-center gap-3 border-b border-[var(--sdk-color-border-subtle)] px-3 py-3 text-sm last:border-b-0"
      data-mini-program-row={account.miniProgramId}
    >
      <div className="min-w-0">
        <button
          className="block w-full truncate text-left font-medium text-[var(--sdk-color-text-primary)] hover:underline"
          onClick={onEdit}
          type="button"
        >
          {account.displayName}
        </button>
        <span className="block truncate text-xs text-[var(--sdk-color-text-muted)]">
          {accountTypeLabel(account, messages)}
          {account.environment === undefined
            ? ""
            : ` · ${messages.environment[account.environment]}`}
          {account.releaseChannel === undefined
            ? ""
            : ` · ${messages.releaseChannel[account.releaseChannel]}`}
        </span>
      </div>
      <span className="truncate font-mono text-xs text-[var(--sdk-color-text-secondary)]">
        {account.appId}
      </span>
      <div className="flex items-center gap-2">
        {capabilities.setEnabled
          ? (
            <Switch
              aria-label={`${messages.actions.enable} ${account.displayName}`}
              checked={account.enabled}
              onCheckedChange={onToggle}
            />
          )
          : null}
        <StatusBadge
          label={account.enabled ? messages.status.enabled : messages.status.disabled}
          status={account.enabled ? "enabled" : "disabled"}
        />
      </div>
      <span className="truncate text-xs text-[var(--sdk-color-text-secondary)]">
        {loginCheckLabel(account.loginCheckStatus, messages)}
      </span>
      <div className="flex items-center justify-end gap-1">
        <Button onClick={onEdit} size="sm" variant="ghost">{messages.actions.edit}</Button>
        {capabilities.deleteAccount
          ? <Button onClick={onDelete} size="sm" variant="ghost">{messages.actions.remove}</Button>
          : null}
      </div>
    </div>
  );
}

/**
 * The shared mini-program account surface: list, create/edit, enable/disable,
 * delete, and the login/credential diagnostic of one administration posture.
 *
 * The panel is a workspace, not a page: it renders no heading of its own, so a
 * host dialog that already states the surface's title and description shows
 * that copy exactly once. Its header is a single toolbar row — search on the
 * left, list actions on the right.
 *
 * {@link MiniProgramCapabilities} decides which controls exist:
 * `editCredentials` adds the create action and the AppSecret field,
 * `runLoginCheck` adds the diagnostic action, `setEnabled` adds the row switch,
 * and `deleteAccount` adds the delete action. The controller enforces the same
 * flags, so a control the panel forgot to hide fails with a typed error instead
 * of a silent no-op.
 */
export function SdkworkMiniProgramPanel({
  capabilities,
  controller,
  messages: messagesOverride,
}: {
  /** What this mount allows; see {@link MiniProgramCapabilities}. */
  capabilities: MiniProgramCapabilities;
  controller: MiniProgramController;
  /** Override copy (hosts and tests); defaults to the module catalog. */
  messages?: MiniProgramMessages;
}): ReactNode {
  const resolvedMessages = useMiniProgramMessages();
  const messages = messagesOverride ?? resolvedMessages;
  // The third argument keeps a server-rendered host (and a static render in a
  // test) from throwing: the controller snapshot is readable without a DOM.
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
  const [search, setSearch] = useState(state.query);
  const [drawer, setDrawer] = useState<DrawerState>();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [pendingDelete, setPendingDelete] = useState<MiniProgramAccount>();
  const [loginCheckNotice, setLoginCheckNotice] = useState<string>();
  const [loginCheckResult, setLoginCheckResult] = useState<MiniProgramLoginCheckStatus>();

  useEffect(() => {
    if (state.status === "idle") void controller.load({ page: 1 });
  }, [controller, state.status]);

  const openCreate = (): void => {
    setFormError(undefined);
    setFieldErrors({});
    setLoginCheckNotice(undefined);
    setLoginCheckResult(undefined);
    setDrawer({ mode: "create", draft: emptyDraft() });
  };
  const openEdit = (account: MiniProgramAccount): void => {
    setFormError(undefined);
    setFieldErrors({});
    setLoginCheckNotice(undefined);
    setLoginCheckResult(undefined);
    setDrawer({ mode: "edit", account, draft: draftOf(account) });
  };
  const closeDrawer = (): void => {
    if (saving) return;
    setDrawer(undefined);
    setFormError(undefined);
    setFieldErrors({});
  };
  /**
   * Applies a draft patch and clears the inline error of each changed field.
   * @param patch - changed draft fields.
   */
  const updateDraft = (patch: Partial<FormDraft>): void => {
    setDrawer((current) => (current === undefined
      ? current
      : { ...current, draft: { ...current.draft, ...patch } }));
    setFieldErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch)) {
        if (key in next) delete next[key as FieldKey];
      }
      return next;
    });
  };

  /**
   * Validates the open drawer before submit.
   * @param open - the drawer state.
   * @returns whether the form may be submitted.
   */
  const validate = (open: DrawerState): boolean => {
    const issues: Partial<Record<FieldKey, string>> = {};
    if (open.draft.displayName.trim() === "") {
      issues.displayName = messages.validation.displayNameRequired;
    }
    if (open.mode === "create") {
      if (open.draft.appId.trim() === "") {
        issues.appId = messages.validation.appIdRequired;
      } else if (!APP_ID_PATTERN.test(open.draft.appId.trim())) {
        issues.appId = messages.validation.appIdInvalid;
      }
      if (open.draft.appSecret.trim() === "") {
        issues.appSecret = messages.validation.appSecretRequired;
      }
    }
    setFieldErrors(issues);
    return Object.keys(issues).length === 0;
  };

  const submit = async (): Promise<void> => {
    if (drawer === undefined) return;
    if (!validate(drawer)) return;
    setSaving(true);
    setFormError(undefined);
    try {
      if (drawer.mode === "create") {
        const category = drawer.draft.category.trim();
        const note = drawer.draft.note.trim();
        const providerConfig: MiniProgramProviderConfig = {
          ...(category === "" ? {} : { category }),
          ...(note === "" ? {} : { note }),
        };
        await controller.create({
          appId: drawer.draft.appId.trim(),
          displayName: drawer.draft.displayName.trim(),
          ...(drawer.draft.appSecret.trim() === ""
            ? {}
            : { appSecret: drawer.draft.appSecret }),
          ...(drawer.draft.originalId.trim() === ""
            ? {}
            : { originalId: drawer.draft.originalId.trim() }),
          ...(drawer.draft.accountType === "" ? {} : { accountType: drawer.draft.accountType }),
          ...(Object.keys(providerConfig).length === 0 ? {} : { providerConfig }),
        });
      } else if (drawer.account !== undefined) {
        const account = drawer.account;
        const originalId = drawer.draft.originalId.trim();
        const accountType = drawer.draft.accountType;
        await controller.update(account.miniProgramId, {
          displayName: drawer.draft.displayName.trim(),
          ...(drawer.draft.appSecret.trim() === ""
            ? {}
            : { appSecret: drawer.draft.appSecret }),
          ...((account.originalId ?? "") === originalId ? {} : { originalId }),
          ...(accountType === "" || accountType === account.accountType ? {} : { accountType }),
          providerConfig: mergedProviderConfig(account, drawer.draft),
        });
      }
      setDrawer(undefined);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const runLoginCheck = async (account: MiniProgramAccount): Promise<void> => {
    setFormError(undefined);
    setLoginCheckNotice(undefined);
    try {
      const result = await controller.runLoginCheck(account.miniProgramId);
      setLoginCheckResult(result.status);
      setLoginCheckNotice(
        result.message === undefined || result.message.trim() === ""
          ? messages.loginCheck.queued
          : `${messages.loginCheck.queued} · ${result.message}`,
      );
    } catch (error) {
      setFormError(
        error instanceof Error && error.message.trim() !== ""
          ? error.message
          : messages.errors.loginCheckFailed,
      );
    }
  };

  const totalPages = Math.max(1, Math.ceil(state.totalItems / Math.max(1, state.pageSize)));
  const editing = drawer?.mode === "edit" ? drawer.account : undefined;
  const shownLoginCheckStatus = loginCheckResult ?? editing?.loginCheckStatus ?? "unknown";
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 p-1" data-sdkwork-iam-mini-program="">
      <header className="flex flex-wrap items-center gap-2">
        <div className="w-64 max-w-full shrink-0">
          <Input
            aria-label={messages.panel.searchPlaceholder}
            className={FIELD_CLASS_NAME}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void controller.load({ q: search, page: 1 });
            }}
            placeholder={messages.panel.searchPlaceholder}
            value={search}
          />
        </div>
        <Button onClick={() => { void controller.load({ q: search, page: 1 }); }} size="sm" variant="secondary">
          {messages.panel.search}
        </Button>
        <span className="text-xs text-[var(--sdk-color-text-muted)]">
          {messages.panel.total.replace("{total}", String(state.totalItems))}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={() => { void controller.load({ page: state.page }); }}
            size="sm"
            variant="outline"
          >
            {messages.panel.refresh}
          </Button>
          {capabilities.editCredentials
            ? <Button onClick={openCreate} size="sm">{messages.panel.add}</Button>
            : null}
        </div>
      </header>

      {state.error !== undefined ? <StatusNotice tone="danger">{state.error}</StatusNotice> : null}

      <div className="min-h-0 flex-1 overflow-y-auto rounded-[1rem] border border-[var(--sdk-color-border-default)]">
        <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_8rem_9rem_auto] items-center gap-3 border-b border-[var(--sdk-color-border-default)] px-3 py-2 text-xs font-medium text-[var(--sdk-color-text-muted)]">
          <span>{messages.columns.name}</span>
          <span>{messages.columns.appId}</span>
          <span>{messages.columns.status}</span>
          <span>{messages.columns.loginCheck}</span>
          <span className="text-right">{messages.columns.actions}</span>
        </div>
        {state.items.length === 0
          ? (
            <p className="px-3 py-12 text-center text-sm text-[var(--sdk-color-text-muted)]">
              {state.status === "loading" ? messages.panel.loading : messages.panel.empty}
            </p>
          )
          : state.items.map((account) => (
            <AccountRow
              account={account}
              capabilities={capabilities}
              key={account.miniProgramId}
              messages={messages}
              onDelete={() => setPendingDelete(account)}
              onEdit={() => openEdit(account)}
              onToggle={(enabled) => { void controller.setEnabled(account.miniProgramId, enabled); }}
            />
          ))}
      </div>

      <footer className="flex items-center justify-end gap-2 text-xs text-[var(--sdk-color-text-muted)]">
        <span>
          {state.page} / {totalPages}
        </span>
        <Button
          disabled={state.page <= 1}
          onClick={() => { void controller.load({ page: state.page - 1 }); }}
          size="sm"
          variant="outline"
        >
          {messages.panel.previous}
        </Button>
        <Button
          disabled={state.page >= totalPages}
          onClick={() => { void controller.load({ page: state.page + 1 }); }}
          size="sm"
          variant="outline"
        >
          {messages.panel.next}
        </Button>
      </footer>

      <Drawer onOpenChange={(open) => { if (!open) closeDrawer(); }} open={drawer !== undefined}>
        <DrawerContent className="w-[min(92vw,48rem)]" side="right" size="xl">
          <DrawerHeader>
            <DrawerTitle>
              {drawer?.mode === "create" ? messages.form.titleCreate : messages.form.titleEdit}
            </DrawerTitle>
            <DrawerDescription>{messages.description}</DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="space-y-4">
            {formError !== undefined ? <StatusNotice tone="danger">{formError}</StatusNotice> : null}
            {drawer !== undefined
              ? (
                <>
                  <section className="space-y-3" aria-label={messages.form.identity}>
                    <h3 className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">
                      {messages.form.identity}
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="mini-program-display-name">{messages.form.displayName}</Label>
                        <Input
                          className={FIELD_CLASS_NAME}
                          id="mini-program-display-name"
                          onChange={(event) => updateDraft({ displayName: event.target.value })}
                          placeholder={messages.form.displayNamePlaceholder}
                          value={drawer.draft.displayName}
                        />
                        <FieldError message={fieldErrors.displayName} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="mini-program-app-id">{messages.form.appId}</Label>
                        <Input
                          className={`${FIELD_CLASS_NAME} font-mono`}
                          disabled={drawer.mode === "edit"}
                          id="mini-program-app-id"
                          onChange={(event) => updateDraft({ appId: event.target.value })}
                          placeholder={messages.form.appIdPlaceholder}
                          value={drawer.draft.appId}
                        />
                        <FieldError message={fieldErrors.appId} />
                        <p className="text-xs text-[var(--sdk-color-text-muted)]">{messages.form.appIdHint}</p>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="mini-program-original-id">{messages.form.originalId}</Label>
                        <Input
                          className={`${FIELD_CLASS_NAME} font-mono`}
                          id="mini-program-original-id"
                          onChange={(event) => updateDraft({ originalId: event.target.value })}
                          placeholder={messages.form.originalIdPlaceholder}
                          value={drawer.draft.originalId}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="mini-program-account-type">{messages.form.accountType}</Label>
                        <select
                          aria-label={messages.form.accountType}
                          className="h-10 w-full rounded-[var(--sdk-radius-field)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] px-3 py-2 text-sm text-[var(--sdk-color-text-primary)]"
                          id="mini-program-account-type"
                          onChange={(event) => updateDraft({
                            accountType: event.target.value === "enterprise" ? "enterprise" : "personal",
                          })}
                          value={drawer.draft.accountType}
                        >
                          <option value="personal">{messages.accountType.personal}</option>
                          <option value="enterprise">{messages.accountType.enterprise}</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="mini-program-category">{messages.form.category}</Label>
                        <Input
                          className={FIELD_CLASS_NAME}
                          id="mini-program-category"
                          onChange={(event) => updateDraft({ category: event.target.value })}
                          placeholder={messages.form.categoryPlaceholder}
                          value={drawer.draft.category}
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor="mini-program-note">{messages.form.note}</Label>
                        <Input
                          className={FIELD_CLASS_NAME}
                          id="mini-program-note"
                          onChange={(event) => updateDraft({ note: event.target.value })}
                          placeholder={messages.form.notePlaceholder}
                          value={drawer.draft.note}
                        />
                        <p className="text-xs text-[var(--sdk-color-text-muted)]">{messages.form.providerConfigHint}</p>
                      </div>
                      {drawer.account === undefined || drawer.account.environment === undefined
                        ? null
                        : (
                          <p className="text-xs text-[var(--sdk-color-text-muted)] sm:col-span-2">
                            {messages.form.environment}: {messages.environment[drawer.account.environment]}
                            {drawer.account.releaseChannel === undefined
                              ? ""
                              : ` · ${messages.form.releaseChannel}: ${messages.releaseChannel[drawer.account.releaseChannel]}`}
                          </p>
                        )}
                    </div>
                  </section>

                  <section className="space-y-3" aria-label={messages.form.credentials}>
                    <h3 className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">
                      {messages.form.credentials}
                    </h3>
                    {capabilities.editCredentials
                      ? (
                        <div className="space-y-1">
                          <Label htmlFor="mini-program-app-secret">{messages.form.appSecret}</Label>
                          <Input
                            autoComplete="new-password"
                            className={FIELD_CLASS_NAME}
                            id="mini-program-app-secret"
                            onChange={(event) => updateDraft({ appSecret: event.target.value })}
                            placeholder={messages.form.appSecretPlaceholder}
                            type="password"
                            value={drawer.draft.appSecret}
                          />
                          <FieldError message={fieldErrors.appSecret} />
                          <p className="text-xs text-[var(--sdk-color-text-muted)]">
                            {editing?.hasAppSecret === true
                              ? messages.form.appSecretKeep
                              : editing === undefined
                                ? messages.form.appSecretKeep
                                : messages.form.appSecretMissing}
                          </p>
                        </div>
                      )
                      : (
                        <p className="text-xs text-[var(--sdk-color-text-muted)]">
                          {messages.errors.capabilityDisabled}
                        </p>
                      )}
                  </section>

                  {drawer.mode === "edit" && editing !== undefined
                    ? (
                      <section className="space-y-2" aria-label={messages.form.loginCheck}>
                        <h3 className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">
                          {messages.form.loginCheck}
                        </h3>
                        <p className="text-xs text-[var(--sdk-color-text-secondary)]">
                          {loginCheckLabel(shownLoginCheckStatus, messages)}
                        </p>
                        <p className="text-xs text-[var(--sdk-color-text-muted)]">
                          {editing.lastLoginCheckedAt === undefined
                            ? messages.loginCheck.neverChecked
                            : messages.loginCheck.lastChecked.replace("{time}", editing.lastLoginCheckedAt)}
                        </p>
                        {loginCheckNotice !== undefined
                          ? (
                            <StatusNotice tone={loginCheckResult === "failed" ? "danger" : "success"}>
                              {loginCheckNotice}
                            </StatusNotice>
                          )
                          : null}
                        {capabilities.runLoginCheck
                          ? (
                            <Button
                              onClick={() => { void runLoginCheck(editing); }}
                              size="sm"
                              variant="secondary"
                            >
                              {messages.actions.runLoginCheck}
                            </Button>
                          )
                          : null}
                      </section>
                    )
                    : null}
                </>
              )
              : null}
          </DrawerBody>
          <DrawerFooter>
            <Button onClick={closeDrawer} variant="outline">{messages.form.cancel}</Button>
            <Button disabled={saving} loading={saving} onClick={() => { void submit(); }}>
              {saving
                ? messages.form.saving
                : drawer?.mode === "create" ? messages.form.create : messages.form.save}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        cancelLabel={messages.form.cancel}
        confirmLabel={messages.actions.remove}
        description={messages.actions.removeConfirm}
        onConfirm={() => {
          const account = pendingDelete;
          setPendingDelete(undefined);
          if (account !== undefined) void controller.remove(account.miniProgramId);
        }}
        onOpenChange={(open) => { if (!open) setPendingDelete(undefined); }}
        open={pendingDelete !== undefined}
        title={messages.actions.remove}
        tone="danger"
      />
    </div>
  );
}

/** Inline field error under one control. */
function FieldError({ message }: { message?: string }): ReactNode {
  if (message === undefined) return null;
  return (
    <p className="text-xs text-[var(--sdk-color-state-danger)]" role="alert">
      {message}
    </p>
  );
}
