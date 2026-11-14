import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { DriveUploadImage, type DriveUploadImageHandle } from "sdkwork-drive-pc-upload-image";
import type {
  DriveUploadImageService,
  DriveUploadImageValue,
} from "@sdkwork/drive-upload-image-core";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  StatusNotice,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@sdkwork/ui-pc-react";

import type {
  SdkworkIamOfficialAccount,
  SdkworkIamOfficialAccountDraft,
  SdkworkIamOfficialAccountEncryptMode,
  SdkworkIamOfficialAccountMenu,
  SdkworkIamOfficialAccountMenuButton,
} from "../types";
import { useSdkworkIamOfficialAccountsMessages } from "./messages";
import type { SdkworkIamOfficialAccountsMessages } from "./messages";
import type { SdkworkIamOfficialAccountsController } from "./controller";

/** Maximum top-level menu buttons (WeChat limit). */
const MAX_TOP_LEVEL_BUTTONS = 3;

/** Maximum sub-buttons per top-level button (WeChat limit). */
const MAX_SUB_BUTTONS = 5;

/** Raw image ceiling accepted from the logo picker; Drive still enforces its quota. */
const LOGO_MAX_BYTES = 5 * 1024 * 1024;

/** Image formats the official-account logo field accepts. */
const LOGO_ACCEPT = ["image/png", "image/jpeg", "image/webp"] as const;

/** WeChat console limits for the three protected-domain sets. */
const JS_SECURE_DOMAIN_LIMIT = 5;
const WEB_AUTH_DOMAIN_LIMIT = 2;
const BUSINESS_DOMAIN_LIMIT = 3;

/** Drawer tabs: account credentials and the WeChat domain/server configuration. */
type DrawerTab = "basic" | "domains";

/** Field keys that can carry an inline validation message. */
type FieldKey =
  | "displayName"
  | "appId"
  | "notifyUrl"
  | "notifyToken"
  | "notifyEncodingAesKey";

/** One field-level validation failure. */
interface FormIssue {
  tab: DrawerTab;
  field: FieldKey;
  message: string;
}

const FIELD_CLASS_NAME =
  "w-full rounded-[0.75rem] border border-[var(--sdk-color-border-default)] bg-transparent px-3 py-2 text-sm";

/** A WeChat protected domain: dotted lowercase host, at least one dot, no IP. */
const WECHAT_DOMAIN_PATTERN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/u;

/** Message-push Token from the WeChat console (letters and digits, 3-32). */
const NOTIFY_TOKEN_PATTERN = /^[A-Za-z0-9]{3,32}$/u;

/** EncodingAESKey from the WeChat console (letters and digits, exactly 43). */
const NOTIFY_AES_KEY_PATTERN = /^[A-Za-z0-9]{43}$/u;

/**
 * Normalizes one domain typed into the protected-domain editors.
 * @param input - the raw editor value.
 * @returns the lowercase domain, or undefined when the console would reject it.
 */
function normalizeDomainInput(input: string): string | undefined {
  const domain = input.trim().toLowerCase();
  if (domain === "" || !WECHAT_DOMAIN_PATTERN.test(domain)) return undefined;
  return domain;
}

/**
 * Validates the message-push callback URL the WeChat console accepts.
 * @param value - the raw URL (empty means "not configured").
 * @returns whether the URL is acceptable.
 */
function isValidNotifyUrl(value: string): boolean {
  const raw = value.trim();
  if (raw === "") return true;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username !== "" || url.password !== "") return false;
  const expectedPort = url.protocol === "http:" ? "80" : "443";
  const port = url.port === "" ? expectedPort : url.port;
  if (port !== expectedPort) return false;
  return WECHAT_DOMAIN_PATTERN.test(url.hostname.toLowerCase());
}

/** Maps the persisted logo value (a `drive://` uri, a legacy delivery url, or
 * empty) onto the shared upload field's value shape. */
function toLogoUploadValue(logoUrl: string): DriveUploadImageValue | null {
  const uri = logoUrl.trim();
  if (uri === "") return null;
  return { uri, source: uri.startsWith("drive://") ? "drive" : "external" };
}

/** One editable menu-button draft. */
interface MenuButtonDraft {
  name: string;
  type: "view" | "click" | "parent";
  url: string;
  key: string;
  subButtons: MenuButtonDraft[];
}

function toMenuDrafts(menu: SdkworkIamOfficialAccountMenu): MenuButtonDraft[] {
  return menu.buttons.map((button) => ({
    name: button.name,
    type: button.subButtons !== undefined && button.subButtons.length > 0
      ? "parent"
      : button.type === "click" ? "click" : "view",
    url: button.url ?? "",
    key: button.key ?? "",
    subButtons: (button.subButtons ?? []).map((sub) => ({
      name: sub.name,
      type: sub.type === "click" ? "click" : "view",
      url: sub.url ?? "",
      key: sub.key ?? "",
      subButtons: [],
    })),
  }));
}

function toMenu(buttons: readonly MenuButtonDraft[]): SdkworkIamOfficialAccountMenu {
  return {
    buttons: buttons.map((button) => {
      const subButtons = button.subButtons
        .filter((sub) => sub.name.trim() !== "")
        .map((sub) => sub.type === "click"
          ? { name: sub.name.trim(), type: "click" as const, key: sub.key.trim() }
          : { name: sub.name.trim(), type: "view" as const, url: sub.url.trim() });
      if (subButtons.length > 0) {
        return { name: button.name.trim(), subButtons };
      }
      return button.type === "click"
        ? { name: button.name.trim(), type: "click" as const, key: button.key.trim() }
        : { name: button.name.trim(), type: "view" as const, url: button.url.trim() };
    }),
  };
}

/** One account row. */
function AccountRow({
  account,
  messages,
  onDelete,
  onEdit,
  onMenu,
  onToggle,
}: {
  account: SdkworkIamOfficialAccount;
  messages: SdkworkIamOfficialAccountsMessages;
  onDelete: () => void;
  onEdit: () => void;
  onMenu: () => void;
  onToggle: (enabled: boolean) => void;
}): ReactNode {
  const typeLabel = account.accountType === "service"
    ? messages.accountType.service
    : account.accountType === "subscription"
      ? messages.accountType.subscription
      : messages.accountType.unset;
  const menuCount = account.customMenu.buttons.length;
  return (
    <div
      className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_8rem_9rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--sdk-color-border-subtle)] px-3 py-3 text-sm last:border-b-0"
      data-official-account-row={account.id}
    >
      <div className="min-w-0">
        <button
          className="block w-full truncate text-left font-medium text-[var(--sdk-color-text-primary)] hover:underline"
          onClick={onEdit}
          type="button"
        >
          {account.displayName}
        </button>
        {account.originalId !== undefined
          ? (
            <span className="block truncate text-xs text-[var(--sdk-color-text-muted)]">
              {account.originalId}
            </span>
          )
          : null}
      </div>
      <span className="truncate font-mono text-xs text-[var(--sdk-color-text-secondary)]">
        {account.appId}
      </span>
      <span className="truncate text-xs text-[var(--sdk-color-text-secondary)]">{typeLabel}</span>
      <div className="flex items-center gap-2">
        <Switch
          aria-label={`${messages.actions.edit} ${account.displayName}`}
          checked={account.enabled}
          onCheckedChange={onToggle}
        />
        <StatusBadge
          label={account.enabled ? messages.status.enabled : messages.status.disabled}
          status={account.enabled ? "enabled" : "disabled"}
        />
      </div>
      <button
        aria-label={messages.columns.menu}
        className="truncate text-left text-xs text-[var(--sdk-color-text-secondary)] hover:underline"
        onClick={onMenu}
        type="button"
      >
        {menuCount === 0 ? messages.menu.empty : `${messages.columns.menu} · ${menuCount}`}
      </button>
      <div className="flex items-center justify-end gap-1">
        <Button onClick={onEdit} size="sm" variant="ghost">{messages.actions.edit}</Button>
        <Button onClick={onDelete} size="sm" variant="ghost">{messages.actions.delete}</Button>
      </div>
    </div>
  );
}

/**
 * The user-facing official-account surface: list, create/edit, enable/disable,
 * delete, and the custom-menu draft editor for the signed-in account's own
 * WeChat 公众号 channels.
 *
 * The panel is a workspace, not a page: it renders no heading of its own, so a
 * host dialog that already states the surface's title and description shows
 * that copy exactly once. {@link SdkworkIamOfficialAccountsPage} renders the
 * heading for a standalone route. Its header is a single toolbar row — search
 * with its action on the left, the list actions on the right.
 */
export function SdkworkIamOfficialAccountsPanel({
  controller,
  driveUploadImageService,
  messages: messagesOverride,
}: {
  controller: SdkworkIamOfficialAccountsController;
  /**
   * Host-injected Drive image-upload capability (`createDriveUploadImageService`).
   *
   * Present: the logo field renders the shared `DriveUploadImage` component —
   * edit mode uploads immediately against the account id, create mode parks the
   * pick and the panel flushes it through the field handle after the account
   * exists (`DRIVE_SPEC.md` section 18.3: persist first, upload second).
   * Absent: the field keeps a stored logo visible and states that uploads are
   * unavailable. There is deliberately no URL input and no data-URL fallback:
   * a pasted link bypasses upload governance and a base64 payload would be a
   * fake upload.
   */
  driveUploadImageService?: DriveUploadImageService;
  /** Override copy (hosts and tests); defaults to the module catalog. */
  messages?: SdkworkIamOfficialAccountsMessages;
}): ReactNode {
  const messages = messagesOverride ?? useSdkworkIamOfficialAccountsMessages();
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  const [search, setSearch] = useState(state.query);
  const [form, setForm] = useState<FormState>();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [logoUploading, setLogoUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<DrawerTab>("basic");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [pendingDelete, setPendingDelete] = useState<SdkworkIamOfficialAccount>();
  // Create mode has no account id at pick time: the field parks the pick and
  // the submit flushes it once `controller.create` returns an id.
  const logoFieldRef = useRef<DriveUploadImageHandle | null>(null);

  useEffect(() => {
    if (state.status === "idle") void controller.load({ page: 1 });
  }, [controller, state.status]);

  const resetDrawerState = (): void => {
    setFormError(undefined);
    setLogoUploading(false);
    setFieldErrors({});
    setActiveTab("basic");
  };
  const openCreate = (): void => {
    resetDrawerState();
    setForm({ mode: "create", draft: emptyDraft(), menu: { buttons: [] } });
  };
  const openEdit = (account: SdkworkIamOfficialAccount): void => {
    resetDrawerState();
    setForm({ mode: "edit", account, draft: draftOf(account), menu: account.customMenu });
  };
  const openMenu = (account: SdkworkIamOfficialAccount): void => {
    resetDrawerState();
    setForm({ mode: "menu", account, draft: draftOf(account), menu: account.customMenu });
  };
  const closeForm = (): void => {
    if (saving) return;
    setForm(undefined);
    resetDrawerState();
  };
  /**
   * Applies a draft patch and clears the inline error of each changed field, so
   * a correction immediately clears its own message.
   * @param patch - changed draft fields.
   */
  const updateDraft = (patch: Partial<FormDraft>): void => {
    setForm((current) => (current === undefined
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
   * Flushes a create-mode parked logo pick against the freshly created account.
   * @param created - the account the create call stored.
   * @returns a user-facing failure message, or undefined when the logo attached.
   */
  const attachPendingLogo = async (
    created: SdkworkIamOfficialAccount,
  ): Promise<string | undefined> => {
    if (driveUploadImageService === undefined) return undefined;
    try {
      const values = logoFieldRef.current === null
        ? []
        : await logoFieldRef.current.uploadPending({ appResourceId: created.id });
      const logo = values[values.length - 1];
      if (logo === undefined) return undefined;
      await controller.update(created.id, {
        appId: created.appId,
        displayName: created.displayName,
        logoUrl: logo.uri,
      });
      return undefined;
    } catch (error) {
      // The account exists, so a retry must target it instead of creating a
      // duplicate: switch the drawer to its edit view and keep the failure
      // visible; the field's own retry affordance stays reachable.
      setForm({
        mode: "edit",
        account: created,
        draft: draftOf(created),
        menu: created.customMenu,
      });
      return error instanceof Error
        ? `${messages.form.logoUploadFailed} (${error.message})`
        : messages.form.logoUploadFailed;
    }
  };
  const submit = async (): Promise<void> => {
    if (form === undefined) return;
    if (form.mode === "menu") {
      const menuIssue = validateMenu(form.menu, messages);
      if (menuIssue !== undefined) {
        setFormError(menuIssue);
        return;
      }
    } else {
      const issues = validateForm(form, messages);
      if (issues.length > 0) {
        const nextErrors: Partial<Record<FieldKey, string>> = {};
        for (const issue of issues) nextErrors[issue.field] = issue.message;
        setFieldErrors(nextErrors);
        setActiveTab(issues[0].tab);
        setFormError(undefined);
        return;
      }
    }
    setSaving(true);
    setFormError(undefined);
    try {
      const draft = { ...toDraft(form.draft), customMenu: form.menu };
      if (form.mode === "create") {
        const created = await controller.create(draft);
        const attachError = await attachPendingLogo(created);
        if (attachError !== undefined) {
          setFormError(attachError);
          return;
        }
      } else if (form.mode === "edit" && form.account !== undefined) {
        await controller.update(form.account.id, { ...draft, appId: form.account.appId });
      } else if (form.mode === "menu" && form.account !== undefined) {
        await controller.saveMenu(form.account, form.menu);
      }
      setForm(undefined);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(state.totalItems / Math.max(1, state.pageSize)));
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 p-1" data-sdkwork-iam-official-accounts="">
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
          <Button onClick={openCreate} size="sm">{messages.panel.add}</Button>
        </div>
      </header>

      {state.error !== undefined ? <StatusNotice tone="danger">{state.error}</StatusNotice> : null}

      <div className="min-h-0 flex-1 overflow-y-auto rounded-[1rem] border border-[var(--sdk-color-border-default)]">
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_8rem_9rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--sdk-color-border-default)] px-3 py-2 text-xs font-medium text-[var(--sdk-color-text-muted)]">
          <span>{messages.columns.name}</span>
          <span>{messages.columns.appId}</span>
          <span>{messages.columns.type}</span>
          <span>{messages.columns.status}</span>
          <span>{messages.columns.menu}</span>
          <span className="text-right">{messages.columns.actions}</span>
        </div>
        {state.accounts.length === 0
          ? (
            <p className="px-3 py-12 text-center text-sm text-[var(--sdk-color-text-muted)]">
              {state.status === "loading" ? messages.panel.loading : messages.panel.empty}
            </p>
          )
          : state.accounts.map((account) => (
            <AccountRow
              account={account}
              key={account.id}
              messages={messages}
              onDelete={() => setPendingDelete(account)}
              onEdit={() => openEdit(account)}
              onMenu={() => openMenu(account)}
              onToggle={(enabled) => { void controller.setEnabled(account, enabled); }}
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

      <Drawer onOpenChange={(open) => { if (!open) closeForm(); }} open={form !== undefined}>
        <DrawerContent side="right" size="xl">
          <DrawerHeader>
            <DrawerTitle>
              {form?.mode === "create"
                ? messages.form.titleCreate
                : form?.mode === "menu"
                  ? messages.menu.title
                  : messages.form.titleEdit}
            </DrawerTitle>
            <DrawerDescription>
              {form?.mode === "menu" ? messages.menu.description : messages.panel.description}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="space-y-3">
            {formError !== undefined ? <StatusNotice tone="danger">{formError}</StatusNotice> : null}
            {form?.mode === "menu"
              ? (
                <MenuEditor
                  draft={form.menu}
                  messages={messages}
                  onChange={(menu) => setForm({ ...form, menu })}
                />
              )
              : form !== undefined
                ? (
                  <AccountForm
                    accountId={form.account?.id}
                    activeTab={activeTab}
                    draft={form.draft}
                    driveUploadImageService={driveUploadImageService}
                    editing={form.mode === "edit"}
                    fieldErrors={fieldErrors}
                    logoFieldRef={logoFieldRef}
                    messages={messages}
                    onDraftChange={updateDraft}
                    onLogoUploadingChange={setLogoUploading}
                    onTabChange={setActiveTab}
                  />
                )
                : null}
          </DrawerBody>
          <DrawerFooter>
            <Button onClick={closeForm} variant="outline">{messages.form.cancel}</Button>
            <Button
              disabled={saving || logoUploading}
              loading={saving}
              onClick={() => { void submit(); }}
            >
              {saving
                ? messages.actions.saving
                : form?.mode === "menu" ? messages.menu.save : messages.form.save}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        cancelLabel={messages.form.cancel}
        confirmLabel={messages.actions.delete}
        description={messages.actions.confirmDeleteDetail}
        onConfirm={() => {
          const account = pendingDelete;
          setPendingDelete(undefined);
          if (account !== undefined) void controller.remove(account.id);
        }}
        onOpenChange={(open) => { if (!open) setPendingDelete(undefined); }}
        open={pendingDelete !== undefined}
        title={messages.actions.confirmDelete}
        tone="danger"
      />
    </div>
  );
}

interface FormState {
  mode: "create" | "edit" | "menu";
  account?: SdkworkIamOfficialAccount;
  draft: FormDraft;
  menu: SdkworkIamOfficialAccountMenu;
}

interface FormDraft {
  displayName: string;
  appId: string;
  appSecret: string;
  accountType: string;
  originalId: string;
  logoUrl: string;
  notifyUrl: string;
  notifyToken: string;
  notifyEncodingAesKey: string;
  notifyEncryptMode: SdkworkIamOfficialAccountEncryptMode;
  jsSecureDomains: string[];
  webAuthDomains: string[];
  businessDomains: string[];
  enabled: boolean;
}

function emptyDraft(): FormDraft {
  return {
    displayName: "",
    appId: "",
    appSecret: "",
    accountType: "service",
    originalId: "",
    logoUrl: "",
    notifyUrl: "",
    notifyToken: "",
    notifyEncodingAesKey: "",
    notifyEncryptMode: "plaintext",
    jsSecureDomains: [],
    webAuthDomains: [],
    businessDomains: [],
    enabled: true,
  };
}

function draftOf(account: SdkworkIamOfficialAccount): FormDraft {
  return {
    displayName: account.displayName,
    appId: account.appId,
    appSecret: "",
    accountType: account.accountType ?? "service",
    originalId: account.originalId ?? "",
    logoUrl: account.logoUrl ?? "",
    notifyUrl: account.notifyUrl ?? "",
    notifyToken: "",
    notifyEncodingAesKey: "",
    notifyEncryptMode: account.notifyEncryptMode,
    jsSecureDomains: [...account.jsSecureDomains],
    webAuthDomains: [...account.webAuthDomains],
    businessDomains: [...account.businessDomains],
    enabled: account.enabled,
  };
}

function toDraft(form: FormDraft): SdkworkIamOfficialAccountDraft {
  return {
    appId: form.appId.trim(),
    displayName: form.displayName.trim(),
    accountType: form.accountType,
    originalId: form.originalId.trim(),
    logoUrl: form.logoUrl.trim(),
    appSecret: form.appSecret,
    notifyUrl: form.notifyUrl.trim(),
    notifyToken: form.notifyToken,
    notifyEncodingAesKey: form.notifyEncodingAesKey,
    notifyEncryptMode: form.notifyEncryptMode,
    jsSecureDomains: [...form.jsSecureDomains],
    webAuthDomains: [...form.webAuthDomains],
    businessDomains: [...form.businessDomains],
    enabled: form.enabled,
  };
}

/**
 * Validates the custom-menu draft shown in its own drawer.
 * @param menu - the complete menu draft.
 * @param messages - resolved copy.
 * @returns the first failure message, or undefined when the draft is complete.
 */
function validateMenu(
  menu: SdkworkIamOfficialAccountMenu,
  messages: SdkworkIamOfficialAccountsMessages,
): string | undefined {
  for (const button of menu.buttons) {
    if (button.name.trim() === "") return messages.validation.menuNameRequired;
    const subButtons = button.subButtons ?? [];
    if (subButtons.length === 0) {
      if (button.type === "view" && (button.url ?? "").trim() === "") {
        return messages.validation.menuUrlRequired;
      }
      if (button.type === "click" && (button.key ?? "").trim() === "") {
        return messages.validation.menuNameRequired;
      }
    }
    for (const sub of subButtons) {
      if (sub.name.trim() === "") return messages.validation.menuNameRequired;
      if (sub.type === "view" && (sub.url ?? "").trim() === "") {
        return messages.validation.menuUrlRequired;
      }
    }
  }
  return undefined;
}

/**
 * Validates the account form before submit, per drawer tab.
 *
 * Rules mirror the WeChat console: AppID/name on the basic tab; callback URL,
 * Token, and EncodingAESKey on the domain tab. Domain lists are validated as
 * entries are added, so a stored list is already console-shaped.
 * @param form - the drawer form state.
 * @param messages - resolved copy.
 * @returns every field failure, in the order the tabs present them.
 */
function validateForm(
  form: FormState,
  messages: SdkworkIamOfficialAccountsMessages,
): FormIssue[] {
  const issues: FormIssue[] = [];
  if (form.draft.displayName.trim() === "") {
    issues.push({
      tab: "basic",
      field: "displayName",
      message: messages.validation.displayNameRequired,
    });
  }
  if (form.mode === "create") {
    if (form.draft.appId.trim() === "") {
      issues.push({ tab: "basic", field: "appId", message: messages.validation.appIdRequired });
    } else if (!/^[A-Za-z0-9_-]{4,64}$/.test(form.draft.appId.trim())) {
      issues.push({ tab: "basic", field: "appId", message: messages.validation.appIdInvalid });
    }
  }
  if (!isValidNotifyUrl(form.draft.notifyUrl)) {
    issues.push({
      tab: "domains",
      field: "notifyUrl",
      message: messages.validation.notifyUrlInvalid,
    });
  }
  const token = form.draft.notifyToken.trim();
  if (token !== "" && !NOTIFY_TOKEN_PATTERN.test(token)) {
    issues.push({
      tab: "domains",
      field: "notifyToken",
      message: messages.validation.notifyTokenInvalid,
    });
  }
  const aesKey = form.draft.notifyEncodingAesKey.trim();
  if (aesKey !== "" && !NOTIFY_AES_KEY_PATTERN.test(aesKey)) {
    issues.push({
      tab: "domains",
      field: "notifyEncodingAesKey",
      message: messages.validation.notifyEncodingAesKeyInvalid,
    });
  }
  return issues;
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

/**
 * One protected-domain set: chips for the current entries plus an inline
 * editor, its WeChat limit, and the console rule the values must satisfy.
 */
function DomainListField({
  addLabel,
  hint,
  label,
  max,
  messages,
  onChange,
  placeholder,
  value,
}: {
  addLabel: string;
  hint: string;
  label: string;
  max: number;
  messages: SdkworkIamOfficialAccountsMessages;
  onChange: (value: string[]) => void;
  placeholder: string;
  value: readonly string[];
}): ReactNode {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string>();
  const full = value.length >= max;
  const add = (): void => {
    const domain = normalizeDomainInput(input);
    if (domain === undefined) {
      setError(messages.form.domainInvalid);
      return;
    }
    if (value.includes(domain)) {
      setError(messages.form.domainDuplicate);
      return;
    }
    if (full) return;
    onChange([...value, domain]);
    setInput("");
    setError(undefined);
  };
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label>{label}</Label>
        <span className="font-mono text-xs text-[var(--sdk-color-text-muted)]">
          {value.length}/{max}
        </span>
      </div>
      {value.length > 0
        ? (
          <div className="flex flex-wrap gap-2">
            {value.map((domain) => (
              <span
                key={domain}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] px-2.5 py-1 font-mono text-xs text-[var(--sdk-color-text-primary)]"
              >
                {domain}
                <button
                  aria-label={`${messages.form.domainRemove}: ${domain}`}
                  className="text-[var(--sdk-color-text-muted)] transition-colors hover:text-[var(--sdk-color-state-danger)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--sdk-color-border-focus)]"
                  onClick={() => onChange(value.filter((entry) => entry !== domain))}
                  type="button"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )
        : null}
      {full
        ? null
        : (
          <div className="flex items-start gap-2">
            <Input
              aria-invalid={error !== undefined}
              aria-label={label}
              className={FIELD_CLASS_NAME}
              onChange={(event) => {
                setInput(event.target.value);
                if (error !== undefined) setError(undefined);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  add();
                } else if (event.key === "Backspace" && input === "" && value.length > 0) {
                  onChange(value.slice(0, -1));
                }
              }}
              placeholder={placeholder}
              value={input}
            />
            <Button onClick={add} size="sm" variant="outline">{addLabel}</Button>
          </div>
        )}
      <FieldError message={error} />
      <p className="text-xs text-[var(--sdk-color-text-muted)]">{hint}</p>
    </div>
  );
}

/**
 * The create/edit form body: a 基础信息 / 域名配置 tab pair that mirrors the
 * WeChat console. Credentials and the logo live on the first tab; the three
 * protected-domain sets and the server-configuration block live on the second.
 */
function AccountForm({
  accountId,
  activeTab,
  draft,
  driveUploadImageService,
  editing,
  fieldErrors,
  logoFieldRef,
  messages,
  onDraftChange,
  onLogoUploadingChange,
  onTabChange,
}: {
  /** Edit-mode upload attribution anchor: the account id. */
  accountId?: string;
  activeTab: DrawerTab;
  draft: FormDraft;
  driveUploadImageService?: DriveUploadImageService;
  editing: boolean;
  fieldErrors: Partial<Record<FieldKey, string>>;
  logoFieldRef: RefObject<DriveUploadImageHandle | null>;
  messages: SdkworkIamOfficialAccountsMessages;
  onDraftChange: (patch: Partial<FormDraft>) => void;
  onLogoUploadingChange: (uploading: boolean) => void;
  onTabChange: (tab: DrawerTab) => void;
}): ReactNode {
  const encryptModeHint = draft.notifyEncryptMode === "safe"
    ? messages.form.encryptSafeHint
    : draft.notifyEncryptMode === "compatible"
      ? messages.form.encryptCompatibleHint
      : messages.form.encryptPlaintextHint;
  const basicError = Object.keys(fieldErrors).some(
    (key) => key === "displayName" || key === "appId",
  );
  const domainError = Object.keys(fieldErrors).some(
    (key) => key === "notifyUrl" || key === "notifyToken" || key === "notifyEncodingAesKey",
  );
  return (
    <Tabs
      onValueChange={(value) => onTabChange(value === "domains" ? "domains" : "basic")}
      value={activeTab}
    >
      <TabsList className="sticky top-0 z-10 w-full justify-start">
        <TabsTrigger className="flex-1" value="basic">
          {messages.form.tabBasic}
          {basicError
            ? (
              <span
                aria-hidden="true"
                className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--sdk-color-state-danger)]"
              />
            )
            : null}
        </TabsTrigger>
        <TabsTrigger className="flex-1" value="domains">
          {messages.form.tabDomains}
          {domainError
            ? (
              <span
                aria-hidden="true"
                className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--sdk-color-state-danger)]"
              />
            )
            : null}
        </TabsTrigger>
      </TabsList>

      <TabsContent
        className="mt-3 space-y-5 border-0 bg-transparent p-0 shadow-none"
        forceMount
        value="basic"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="official-account-name">{messages.form.displayName}</Label>
            <Input
              aria-invalid={fieldErrors.displayName !== undefined}
              id="official-account-name"
              className={FIELD_CLASS_NAME}
              onChange={(event) => onDraftChange({ displayName: event.target.value })}
              placeholder={messages.form.displayNamePlaceholder}
              value={draft.displayName}
            />
            <FieldError message={fieldErrors.displayName} />
            <p className="text-xs text-[var(--sdk-color-text-muted)]">{messages.form.displayNameHint}</p>
          </div>
          <OfficialAccountLogoField
            accountId={editing ? accountId : undefined}
            copy={messages.form}
            driveUploadImageService={driveUploadImageService}
            fieldRef={logoFieldRef}
            onChange={(logoUrl) => onDraftChange({ logoUrl })}
            onUploadingChange={onLogoUploadingChange}
            value={draft.logoUrl}
          />
          <div className="space-y-1.5">
            <Label htmlFor="official-account-app-id">{messages.form.appId}</Label>
            <Input
              aria-invalid={fieldErrors.appId !== undefined}
              disabled={editing}
              id="official-account-app-id"
              className={`${FIELD_CLASS_NAME} font-mono disabled:opacity-60`}
              onChange={(event) => onDraftChange({ appId: event.target.value })}
              placeholder={messages.form.appIdPlaceholder}
              value={draft.appId}
            />
            <FieldError message={fieldErrors.appId} />
            <p className="text-xs text-[var(--sdk-color-text-muted)]">{messages.form.appIdHint}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="official-account-secret">{messages.form.appSecret}</Label>
            <Input
              autoComplete="off"
              id="official-account-secret"
              className={`${FIELD_CLASS_NAME} font-mono`}
              onChange={(event) => onDraftChange({ appSecret: event.target.value })}
              placeholder={editing ? messages.form.appSecretKeep : messages.form.appSecretPlaceholder}
              type="password"
              value={draft.appSecret}
            />
            <p className="text-xs text-[var(--sdk-color-text-muted)]">{messages.form.appSecretHint}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="official-account-original-id">{messages.form.originalId}</Label>
            <Input
              id="official-account-original-id"
              className={`${FIELD_CLASS_NAME} font-mono`}
              onChange={(event) => onDraftChange({ originalId: event.target.value })}
              placeholder={messages.form.originalIdPlaceholder}
              value={draft.originalId}
            />
            <p className="text-xs text-[var(--sdk-color-text-muted)]">{messages.form.originalIdHint}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="official-account-type">{messages.form.accountType}</Label>
            <Select
              onValueChange={(value) => onDraftChange({ accountType: value })}
              value={draft.accountType}
            >
              <SelectTrigger aria-label={messages.form.accountType} id="official-account-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="service">{messages.accountType.service}</SelectItem>
                <SelectItem value="subscription">{messages.accountType.subscription}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {editing
            ? (
              <div className="space-y-1.5 sm:col-span-2">
                <label className="flex items-center justify-between gap-3 rounded-[0.75rem] border border-[var(--sdk-color-border-default)] px-3 py-2.5 text-sm text-[var(--sdk-color-text-primary)]">
                  <span className="flex flex-col">
                    <span>{messages.form.enabled}</span>
                    <span className="text-xs text-[var(--sdk-color-text-muted)]">
                      {messages.form.enabledHint}
                    </span>
                  </span>
                  <Switch
                    checked={draft.enabled}
                    onCheckedChange={(enabled) => onDraftChange({ enabled })}
                  />
                </label>
              </div>
            )
            : null}
        </div>
        <StatusNotice tone="default">{messages.form.ipWhitelistHint}</StatusNotice>
      </TabsContent>

      <TabsContent
        className="mt-3 space-y-5 border-0 bg-transparent p-0 shadow-none"
        forceMount
        value="domains"
      >
        <p className="text-xs text-[var(--sdk-color-text-muted)]">{messages.form.domainsHint}</p>
        <DomainListField
          addLabel={messages.form.domainAdd}
          hint={messages.form.jsSecureDomainsHint}
          label={messages.form.jsSecureDomains}
          max={JS_SECURE_DOMAIN_LIMIT}
          messages={messages}
          onChange={(value) => onDraftChange({ jsSecureDomains: value })}
          placeholder={messages.form.domainPlaceholder}
          value={draft.jsSecureDomains}
        />
        <DomainListField
          addLabel={messages.form.domainAdd}
          hint={messages.form.webAuthDomainsHint}
          label={messages.form.webAuthDomains}
          max={WEB_AUTH_DOMAIN_LIMIT}
          messages={messages}
          onChange={(value) => onDraftChange({ webAuthDomains: value })}
          placeholder={messages.form.domainPlaceholder}
          value={draft.webAuthDomains}
        />
        <DomainListField
          addLabel={messages.form.domainAdd}
          hint={messages.form.businessDomainsHint}
          label={messages.form.businessDomains}
          max={BUSINESS_DOMAIN_LIMIT}
          messages={messages}
          onChange={(value) => onDraftChange({ businessDomains: value })}
          placeholder={messages.form.domainPlaceholder}
          value={draft.businessDomains}
        />

        <fieldset className="space-y-4 rounded-[1rem] border border-[var(--sdk-color-border-default)] p-4">
          <legend className="px-1 text-sm font-medium text-[var(--sdk-color-text-primary)]">
            {messages.form.notifySection}
          </legend>
          <p className="text-xs text-[var(--sdk-color-text-muted)]">
            {messages.form.serverConfigHint}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="official-account-notify-url">{messages.form.notifyUrl}</Label>
            <Input
              aria-invalid={fieldErrors.notifyUrl !== undefined}
              id="official-account-notify-url"
              className={FIELD_CLASS_NAME}
              onChange={(event) => onDraftChange({ notifyUrl: event.target.value })}
              placeholder={messages.form.notifyUrlPlaceholder}
              value={draft.notifyUrl}
            />
            <FieldError message={fieldErrors.notifyUrl} />
            <p className="text-xs text-[var(--sdk-color-text-muted)]">{messages.form.notifyUrlHint}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="official-account-notify-token">{messages.form.notifyToken}</Label>
              <Input
                aria-invalid={fieldErrors.notifyToken !== undefined}
                autoComplete="off"
                id="official-account-notify-token"
                className={`${FIELD_CLASS_NAME} font-mono`}
                onChange={(event) => onDraftChange({ notifyToken: event.target.value })}
                placeholder={messages.form.notifyTokenPlaceholder}
                value={draft.notifyToken}
              />
              <FieldError message={fieldErrors.notifyToken} />
              <p className="text-xs text-[var(--sdk-color-text-muted)]">{messages.form.notifyTokenHint}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="official-account-aes-key">{messages.form.notifyEncodingAesKey}</Label>
              <Input
                aria-invalid={fieldErrors.notifyEncodingAesKey !== undefined}
                autoComplete="off"
                id="official-account-aes-key"
                className={`${FIELD_CLASS_NAME} font-mono`}
                onChange={(event) => onDraftChange({ notifyEncodingAesKey: event.target.value })}
                placeholder={messages.form.notifyEncodingAesKeyPlaceholder}
                value={draft.notifyEncodingAesKey}
              />
              <FieldError message={fieldErrors.notifyEncodingAesKey} />
              <p className="text-xs text-[var(--sdk-color-text-muted)]">
                {messages.form.notifyEncodingAesKeyHint}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="official-account-encrypt-mode">{messages.form.notifyEncryptMode}</Label>
            <Select
              onValueChange={(value) => onDraftChange({
                notifyEncryptMode: value === "safe"
                  ? "safe"
                  : value === "compatible" ? "compatible" : "plaintext",
              })}
              value={draft.notifyEncryptMode}
            >
              <SelectTrigger
                aria-label={messages.form.notifyEncryptMode}
                id="official-account-encrypt-mode"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plaintext">{messages.form.encryptPlaintext}</SelectItem>
                <SelectItem value="compatible">{messages.form.encryptCompatible}</SelectItem>
                <SelectItem value="safe">{messages.form.encryptSafe}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-[var(--sdk-color-text-muted)]">{encryptModeHint}</p>
          </div>
        </fieldset>

        <StatusNotice tone="default">{messages.form.domainsMonthlyHint}</StatusNotice>
      </TabsContent>
    </Tabs>
  );
}

/**
 * The account logo field, one branch per capability level.
 *
 * - With the injected Drive capability: the shared `DriveUploadImage`
 *   component. Edit mode uploads against the account id through the host's
 *   declared intent and stores the `drive://` reference in the draft; create
 *   mode passes no anchor, so the pick parks in the field's controller and the
 *   panel flushes it once the account exists (`DRIVE_SPEC.md` section 18.3).
 * - Without it: the stored logo stays visible (when it is a delivery URL) and
 *   the field states that uploads are unavailable. There is deliberately no URL
 *   input: a pasted link bypasses upload governance, and a base64 payload would
 *   be a fake upload.
 */
function OfficialAccountLogoField({
  accountId,
  copy,
  driveUploadImageService,
  fieldRef,
  onChange,
  onUploadingChange,
  value,
}: {
  /** Edit-mode upload attribution anchor: the account id. */
  accountId?: string;
  copy: SdkworkIamOfficialAccountsMessages["form"];
  driveUploadImageService?: DriveUploadImageService;
  fieldRef: RefObject<DriveUploadImageHandle | null>;
  onChange: (logoUrl: string) => void;
  onUploadingChange: (uploading: boolean) => void;
  value: string;
}): ReactNode {
  const previewSrc = value !== "" && !value.startsWith("drive://") ? value : undefined;
  return (
    <div className="space-y-1.5" data-official-account-logo="">
      <span className="block text-sm font-medium text-[var(--sdk-color-text-primary)]">
        {copy.logo}
      </span>
      {driveUploadImageService === undefined
        ? (
          <div className="flex items-center gap-3">
            {previewSrc === undefined ? null : (
              <img
                alt={copy.logo}
                className="h-14 w-14 rounded-xl border border-[var(--sdk-color-border-default)] object-cover"
                src={previewSrc}
              />
            )}
            <p className="text-xs text-[var(--sdk-color-text-muted)]">{copy.logoUnavailable}</p>
          </div>
        )
        : (
          <DriveUploadImage
            accept={LOGO_ACCEPT}
            alt={copy.logo}
            appResourceId={accountId ?? (() => null)}
            copy={{
              pickImage: copy.logoChoose,
              replaceImage: copy.logoReplace,
              removeImage: copy.logoRemove,
              retryUpload: copy.logoRetry,
              uploading: copy.logoUploading,
              uploadFailed: copy.logoUploadFailed,
              invalidFileType: copy.logoInvalidType,
              fileTooLarge: copy.logoTooLarge,
              fileTooLargeDetail: copy.logoTooLargeDetail,
              emptyFile: copy.logoEmptyFile,
            }}
            description={copy.logoHint}
            maxSizeBytes={LOGO_MAX_BYTES}
            onChange={(uploaded) => onChange(uploaded?.uri ?? "")}
            onUploadingChange={onUploadingChange}
            ref={fieldRef}
            service={driveUploadImageService}
            shape="rounded"
            sizePx={72}
            value={toLogoUploadValue(value)}
          />
        )}
    </div>
  );
}

function MenuEditor({
  draft,
  messages,
  onChange,
}: {
  draft: SdkworkIamOfficialAccountMenu;
  messages: SdkworkIamOfficialAccountsMessages;
  onChange: (menu: SdkworkIamOfficialAccountMenu) => void;
}): ReactNode {
  const buttons = toMenuDrafts(draft);
  const apply = (next: MenuButtonDraft[]): void => onChange(toMenu(next));
  const updateButton = (index: number, next: MenuButtonDraft): void => {
    apply(buttons.map((button, current) => (current === index ? next : button)));
  };
  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--sdk-color-text-muted)]">{messages.menu.topLimit}</p>
      {buttons.length === 0
        ? <p className="text-sm text-[var(--sdk-color-text-muted)]">{messages.menu.empty}</p>
        : null}
      {buttons.map((button, index) => (
        <fieldset
          className="space-y-3 rounded-[1rem] border border-[var(--sdk-color-border-default)] p-4"
          key={index}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-[var(--sdk-color-text-primary)]">
              {messages.menu.buttonName} · {index + 1}
            </span>
            <Button onClick={() => apply(buttons.filter((_, current) => current !== index))} size="sm" variant="ghost">
              {messages.menu.remove}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{messages.menu.buttonName}</Label>
              <Input
                className={FIELD_CLASS_NAME}
                onChange={(event) => updateButton(index, { ...button, name: event.target.value })}
                placeholder={messages.menu.buttonNamePlaceholder}
                value={button.name}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{messages.menu.buttonType}</Label>
              <Select
                onValueChange={(value) => updateButton(index, {
                  ...button,
                  type: value === "click" ? "click" : value === "parent" ? "parent" : "view",
                })}
                value={button.type}
              >
                <SelectTrigger aria-label={messages.menu.buttonType}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">{messages.menu.typeView}</SelectItem>
                  <SelectItem value="click">{messages.menu.typeClick}</SelectItem>
                  <SelectItem value="parent">{messages.menu.addSubButton}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {button.type === "view"
              ? (
                <div className="space-y-1.5">
                  <Label>{messages.menu.url}</Label>
                  <Input
                    className={FIELD_CLASS_NAME}
                    onChange={(event) => updateButton(index, { ...button, url: event.target.value })}
                    placeholder={messages.menu.urlPlaceholder}
                    value={button.url}
                  />
                </div>
              )
              : button.type === "click"
                ? (
                  <div className="space-y-1.5">
                    <Label>{messages.menu.key}</Label>
                    <Input
                      className={FIELD_CLASS_NAME}
                      onChange={(event) => updateButton(index, { ...button, key: event.target.value })}
                      placeholder={messages.menu.keyPlaceholder}
                      value={button.key}
                    />
                  </div>
                )
                : null}
          </div>
          {button.type === "parent"
            ? (
              <div className="space-y-3 border-l border-[var(--sdk-color-border-default)] pl-4">
                <p className="text-xs text-[var(--sdk-color-text-muted)]">{messages.menu.subLimit}</p>
                {button.subButtons.map((sub, subIndex) => (
                  <div className="grid items-end gap-3 sm:grid-cols-4" key={subIndex}>
                    <div className="space-y-1.5">
                      <Label>{messages.menu.buttonName}</Label>
                      <Input
                        className={FIELD_CLASS_NAME}
                        onChange={(event) => updateButton(index, {
                          ...button,
                          subButtons: button.subButtons.map((current, currentIndex) =>
                            currentIndex === subIndex ? { ...current, name: event.target.value } : current),
                        })}
                        value={sub.name}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{messages.menu.buttonType}</Label>
                      <Select
                        onValueChange={(value) => updateButton(index, {
                          ...button,
                          subButtons: button.subButtons.map((current, currentIndex) =>
                            currentIndex === subIndex
                              ? { ...current, type: value === "click" ? "click" : "view" }
                              : current),
                        })}
                        value={sub.type}
                      >
                        <SelectTrigger aria-label={messages.menu.buttonType}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">{messages.menu.typeView}</SelectItem>
                          <SelectItem value="click">{messages.menu.typeClick}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{sub.type === "click" ? messages.menu.key : messages.menu.url}</Label>
                      <Input
                        className={FIELD_CLASS_NAME}
                        onChange={(event) => updateButton(index, {
                          ...button,
                          subButtons: button.subButtons.map((current, currentIndex) =>
                            currentIndex === subIndex
                              ? sub.type === "click"
                                ? { ...current, key: event.target.value }
                                : { ...current, url: event.target.value }
                              : current),
                        })}
                        placeholder={sub.type === "click"
                          ? messages.menu.keyPlaceholder
                          : messages.menu.urlPlaceholder}
                        value={sub.type === "click" ? sub.key : sub.url}
                      />
                    </div>
                    <Button
                      onClick={() => updateButton(index, {
                        ...button,
                        subButtons: button.subButtons.filter((_, currentIndex) => currentIndex !== subIndex),
                      })}
                      size="sm"
                      variant="ghost"
                    >
                      {messages.menu.remove}
                    </Button>
                  </div>
                ))}
                {button.subButtons.length < MAX_SUB_BUTTONS
                  ? (
                    <Button
                      onClick={() => updateButton(index, {
                        ...button,
                        subButtons: [...button.subButtons, { name: "", type: "view", url: "", key: "", subButtons: [] }],
                      })}
                      size="sm"
                      variant="outline"
                    >
                      {messages.menu.addSubButton}
                    </Button>
                  )
                  : null}
              </div>
            )
            : null}
        </fieldset>
      ))}
      {buttons.length < MAX_TOP_LEVEL_BUTTONS
        ? (
          <Button
            onClick={() => apply([
              ...buttons,
              { name: "", type: "view", url: "", key: "", subButtons: [] },
            ])}
            size="sm"
            variant="outline"
          >
            {messages.menu.addButton}
          </Button>
        )
        : null}
    </div>
  );
}
