import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
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
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  StatusBadge,
  StatusNotice,
  Switch,
  Textarea,
} from "@sdkwork/ui-pc-react";

import type {
  OfficialAccountsCapabilities,
  OfficialAccountsEncryptMode,
  OfficialAccountsFollowQrCode,
  OfficialAccountsMenu,
  OfficialAccountsMenuButton,
  OfficialAccount,
  OfficialAccountDraft,
} from "../types";
import { useOfficialAccountsMessages } from "./messages";
import type { OfficialAccountsMessages } from "./messages";
import type { OfficialAccountsController } from "./controller";
import { SdkworkOfficialAccountsMenuDialog } from "./menu/dialog";

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

/**
 * Operator list grid: name, identifiers, type, organization, maintainer,
 * status, menu, and actions. The owner columns only exist on an operator
 * surface — a self-service list only ever shows the caller's own accounts.
 *
 * The header row and every account row MUST resolve to the same track list.
 * Every track is therefore fixed or `fr`: a content-sized track (`auto`,
 * `min-content`, `max-content`) is resolved from that cell's own content, which
 * differs between the header label ("操作"/"Actions", ~2em) and the row's action
 * buttons (up to three permission-gated buttons). The `fr` tracks then split a
 * different remainder per row, so the data columns drifted left of their
 * headers (the reported 公众号账号 misalignment). The action column is sized for
 * the widest supported set — edit, follow QR code, delete — in both locales, and
 * the menu column fits its longest copy ("尚未配置菜单。"/"No menu configured.").
 */
const OPERATOR_ROW_GRID =
  "grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_7rem_minmax(0,1fr)_minmax(0,1fr)_8rem_9rem_13rem]";

/** Self-service list grid: the operator-only owner columns are omitted. */
const SELF_SERVICE_ROW_GRID =
  "grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_7rem_8rem_9rem_13rem]";

/** Minimum list width, so identity and owner columns never collapse to slivers. */
const OPERATOR_LIST_MIN_WIDTH = "min-w-[72rem]";
const SELF_SERVICE_LIST_MIN_WIDTH = "min-w-[60rem]";

/** Drawer tabs: account credentials and the WeChat domain/server configuration. */
type DrawerTab = "basic" | "domains" | "server";

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

/** Token length the 生成 action writes (WeChat accepts 3 to 32 letters/digits). */
const GENERATED_TOKEN_LENGTH = 24;

/** EncodingAESKey length the 生成 action writes (WeChat requires exactly 43). */
const GENERATED_AES_KEY_LENGTH = 43;

/** The WeChat console's Token/EncodingAESKey alphabet. */
const WECHAT_SECRET_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Generates a random alphanumeric secret with the WeChat console alphabet.
 * Bytes at or above 248 are rejected so the modulo distribution stays uniform.
 * @param length - the number of characters to produce.
 * @returns a fresh secret of exactly `length` letters/digits.
 */
function randomWechatSecret(length: number): string {
  const buffer = new Uint8Array(length + 8);
  let secret = "";
  while (secret.length < length) {
    if (globalThis.crypto !== undefined
      && typeof globalThis.crypto.getRandomValues === "function") {
      globalThis.crypto.getRandomValues(buffer);
    } else {
      for (let index = 0; index < buffer.length; index += 1) {
        buffer[index] = Math.floor(Math.random() * 256);
      }
    }
    for (const byte of buffer) {
      if (byte >= 248) continue;
      secret += WECHAT_SECRET_ALPHABET[byte % WECHAT_SECRET_ALPHABET.length];
      if (secret.length === length) break;
    }
  }
  return secret;
}

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
 * The message-push callback URL is server-owned now (the standard notify path),
 * so there is no client URL validator; the drawer displays the generated URL.
 */

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

function toMenuDrafts(menu: OfficialAccountsMenu): MenuButtonDraft[] {
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

function toMenu(buttons: readonly MenuButtonDraft[]): OfficialAccountsMenu {
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
  capabilities,
  messages,
  onDelete,
  onEdit,
  onFollowQrCode,
  onMenu,
  onToggle,
}: {
  account: OfficialAccount;
  capabilities: OfficialAccountsCapabilities;
  messages: OfficialAccountsMessages;
  onDelete: () => void;
  onEdit: () => void;
  onFollowQrCode: () => void;
  onMenu: () => void;
  onToggle: (enabled: boolean) => void;
}): ReactNode {
  const typeLabel = account.accountType === "service"
    ? messages.accountType.service
    : account.accountType === "subscription"
      ? messages.accountType.subscription
      : messages.accountType.unset;
  const menuCount = account.customMenu.buttons.length;
  const operator = capabilities.mode === "operator";
  const originalId = account.originalId?.trim() ?? "";
  // An account always belongs to the platform or to one organization; the
  // sentinel `0` names the platform itself, and an unresolved directory row
  // falls back to the raw id instead of inventing a name.
  const organizationId = account.organizationId?.trim() ?? "";
  const organizationLabel = account.organizationName?.trim()
    || (organizationId === "0"
      ? messages.account.platformOrganization
      : organizationId || messages.account.noOrganization);
  const organizationTitle = organizationId === ""
    || organizationId === "0"
    || organizationLabel === organizationId
    ? undefined
    : `${messages.columns.organization}: ${organizationId}`;
  const maintainerLabel = account.maintainerDisplayName?.trim()
    || account.maintainerUsername?.trim()
    || account.maintainerUserId?.trim()
    || messages.account.noMaintainer;
  const maintainerHint = [
    account.maintainerDisplayName?.trim(),
    account.maintainerUsername?.trim(),
    account.maintainerUserId?.trim(),
  ].filter((value): value is string => value !== undefined && value !== "")
    .join(" · ") || undefined;
  const maintainerTitle = maintainerHint === maintainerLabel ? undefined : maintainerHint;
  const rowGrid = operator ? OPERATOR_ROW_GRID : SELF_SERVICE_ROW_GRID;
  return (
    <div
      className={`grid ${rowGrid} items-center gap-3 border-b border-[var(--sdk-color-border-subtle)] px-3 py-3 text-sm transition-colors last:border-b-0 hover:bg-[var(--sdk-color-surface-panel-muted)]`}
      data-official-account-row={account.id}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          className="min-w-0 flex-1 truncate text-left font-medium text-[var(--sdk-color-text-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdk-color-border-focus)]"
          onClick={onEdit}
          title={account.displayName}
          type="button"
        >
          {account.displayName}
        </button>
        {operator && account.accessMode === "self_managed_account"
          ? (
            <span
              className="shrink-0 rounded-full border border-[var(--sdk-color-border-default)] px-2 py-0.5 text-xs whitespace-nowrap text-[var(--sdk-color-text-secondary)]"
              title={messages.account.selfManagedHint}
            >
              {messages.account.selfManaged}
            </span>
          )
          : null}
      </div>
      <div className="min-w-0 space-y-0.5">
        <span
          className="block truncate font-mono text-xs text-[var(--sdk-color-text-secondary)]"
          title={account.appId}
        >
          {account.appId}
        </span>
        <span
          className="block truncate font-mono text-xs text-[var(--sdk-color-text-muted)]"
          title={originalId === "" ? undefined : originalId}
        >
          {originalId === "" ? messages.account.unset : originalId}
        </span>
      </div>
      <span
        className="min-w-0 truncate text-xs text-[var(--sdk-color-text-secondary)]"
        title={typeLabel}
      >
        {typeLabel}
      </span>
      {operator
        ? (
          <>
            <span
              className="min-w-0 truncate text-xs text-[var(--sdk-color-text-secondary)]"
              title={organizationTitle}
            >
              {organizationLabel}
            </span>
            <span
              className="min-w-0 truncate text-xs text-[var(--sdk-color-text-primary)]"
              title={maintainerTitle}
            >
              {maintainerLabel}
            </span>
          </>
        )
        : null}
      <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
        <Switch
          aria-label={`${messages.columns.status}: ${account.displayName}`}
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
        className="min-w-0 truncate text-left text-xs text-[var(--sdk-color-text-secondary)] hover:text-[var(--sdk-color-text-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdk-color-border-focus)]"
        onClick={onMenu}
        title={menuCount === 0 ? messages.menu.empty : `${messages.columns.menu} · ${menuCount}`}
        type="button"
      >
        {menuCount === 0 ? messages.menu.empty : `${messages.columns.menu} · ${menuCount}`}
      </button>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
        <Button onClick={onEdit} size="sm" variant="ghost">{messages.actions.edit}</Button>
        {capabilities.manageFollowQrCode
          ? (
            <Button onClick={onFollowQrCode} size="sm" variant="ghost">
              {messages.actions.followQrCode}
            </Button>
          )
          : null}
        {capabilities.deleteAccount
          ? <Button onClick={onDelete} size="sm" variant="ghost">{messages.actions.delete}</Button>
          : null}
      </div>
    </div>
  );
}

/**
 * The shared official-account surface: list, create/edit, enable/disable,
 * delete, and the custom-menu draft editor for the accounts of one
 * administration posture.
 *
 * The panel is a workspace, not a page: it renders no heading of its own, so a
 * host dialog that already states the surface's title and description shows
 * that copy exactly once. Its header is a single toolbar row — search with its
 * action on the left, the list actions on the right.
 *
 * {@link OfficialAccountsCapabilities} decides which sections exist:
 * `manageDomains` removes the domain tab, `manageNotify` removes the
 * message-push block, `editCredentials` removes the add action and locks the
 * credential fields, `deleteAccount` removes the delete action, `publishMenu`
 * adds the publish action of the menu drawer, `manageQrLogin` adds the
 * scan-login default switch, `manageFollowQrCode` adds the follow-QR row
 * action, and `mode` selects the self-service server-information tab.
 */
export function SdkworkOfficialAccountsPanel({
  capabilities,
  controller,
  domainVerification,
  driveUploadImageService,
  initialOpen = false,
  messages: messagesOverride,
  notifyBaseUrl,
  onOpenCustomMenu,
  onSaveServerIps,
  serverIps = [],
}: {
  /** What the host allows; see {@link OfficialAccountsCapabilities}. */
  capabilities: OfficialAccountsCapabilities;
  controller: OfficialAccountsController;
  /**
   * Host-injected WeChat verification-file capability for configured domains.
   * Present: each protected-domain row can upload the `MP_verify_*.txt` the
   * WeChat console issues, and the platform serves it at the domain root.
   * Absent: the domain rows keep only add/remove.
   */
  domainVerification?: OfficialAccountsDomainVerification;
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
  /**
   * Open the add-account drawer as soon as the panel mounts (a host deep link
   * such as `?open=add`). The drawer opens once per mount; later visits are the
   * user's own decision.
   */
  initialOpen?: boolean;
  /**
   * The gateway origin the standard WeChat callback URL is built from. The URL
   * is deterministic: `{notifyBaseUrl}/iam/v3/api/iam/oauth/official_accounts/
   * {id}/wechat/notify`. Absent means the host cannot tell the panel where it is
   * reachable, so the drawer states the URL is generated after saving instead of
   * guessing one.
   */
  notifyBaseUrl?: string;
  /**
   * Persists the operator-maintained server egress IP allowlist. Present on an
   * operator surface whose host stores the tenant-level list; the server-info
   * tab then offers a maintenance action in addition to copy-per-IP.
   */
  onSaveServerIps?: (ips: string[]) => Promise<readonly string[]>;
  /**
   * The deployment's published server egress IPs, listed in the 服务器信息 tab
   * for the WeChat 公众号 IP allowlist. Empty means the deployment publishes no
   * list and the tab states that instead.
   */
  serverIps?: readonly string[];
  /**
   * Operator hosts may take over custom-menu navigation (a dedicated route or a
   * full-screen editor) instead of opening the drawer's menu editor.
   */
  onOpenCustomMenu?: (accountId: string) => void;
  /** Override copy (hosts and tests); defaults to the module catalog. */
  messages?: OfficialAccountsMessages;
}): ReactNode {
  const messages = messagesOverride ?? useOfficialAccountsMessages();
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  const [search, setSearch] = useState(state.query);
  const [form, setForm] = useState<FormState>();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [logoUploading, setLogoUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<DrawerTab>("basic");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [pendingDelete, setPendingDelete] = useState<OfficialAccount>();
  const [menuAccount, setMenuAccount] = useState<OfficialAccount>();
  const [followQr, setFollowQr] = useState<FollowQrState>();
  // Create mode has no account id at pick time: the field parks the pick and
  // the submit flushes it once `controller.create` returns an id.
  const logoFieldRef = useRef<DriveUploadImageHandle | null>(null);
  const initialOpenHandled = useRef(false);

  useEffect(() => {
    if (state.status === "idle") void controller.load({ page: 1 });
  }, [controller, state.status]);

  const resetDrawerState = (): void => {
    setFormError(undefined);
    setLogoUploading(false);
    setPublishing(false);
    setPublished(false);
    setFieldErrors({});
    setActiveTab("basic");
  };
  const openCreate = (): void => {
    resetDrawerState();
    setForm({ mode: "create", draft: emptyDraft(), menu: { buttons: [] } });
  };
  // A host deep link (`?open=add`) asks for the add drawer once per mount.
  useEffect(() => {
    if (!initialOpen || initialOpenHandled.current) return;
    initialOpenHandled.current = true;
    openCreate();
  }, [initialOpen]);
  const openEdit = (account: OfficialAccount): void => {
    resetDrawerState();
    setForm({ mode: "edit", account, draft: draftOf(account), menu: account.customMenu });
  };
  const openMenu = (account: OfficialAccount): void => {
    if (onOpenCustomMenu !== undefined) {
      onOpenCustomMenu(account.id);
      return;
    }
    // Every surface edits the menu through the one shared workspace dialog
    // (the same component the IAM admin full-screen editor mounts).
    setMenuAccount(account);
  };
  /**
   * Requests the account's follow (parameterized) QR and shows it in its own
   * dialog. The action is capability-gated; the transport reports whether the
   * channel can issue one.
   * @param account - the account row the action was invoked from.
   */
  const openFollowQrCode = (account: OfficialAccount): void => {
    setFollowQr({ account, loading: true });
    void controller.createFollowQrCode(account)
      .then((qr) => { setFollowQr({ account, qr, loading: false }); })
      .catch((error: unknown) => {
        setFollowQr({
          account,
          loading: false,
          error: error instanceof Error && error.message.trim() !== ""
            ? error.message
            : messages.followQrCode.failure,
        });
      });
  };
  const closeForm = (): void => {
    if (saving || publishing) return;
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
    created: OfficialAccount,
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
  // The standard notify URL is server-owned: the account id and the gateway
  // origin fully determine it, so the drawer never accepts a hand-typed one.
  const notifyBase = notifyBaseUrl?.trim().replace(/\/+$/u, "") ?? "";
  const standardNotifyUrl = form?.account === undefined || notifyBase === ""
    ? undefined
    : `${notifyBase}/iam/v3/api/iam/oauth/official_accounts/${form.account.id}/wechat/notify`;
  /**
   * Validates the open drawer.
   * @param form - the drawer form state.
   * @returns whether the drawer may be submitted, and the issues found.
   */
  const validateOpenForm = (open: FormState): FormIssue[] | undefined => {
    if (open.mode === "menu") {
      const menuIssue = validateMenu(open.menu, messages);
      if (menuIssue !== undefined) {
        setFormError(menuIssue);
        return undefined;
      }
      return [];
    }
    const issues = validateForm(open, messages);
    if (issues.length > 0) {
      const nextErrors: Partial<Record<FieldKey, string>> = {};
      for (const issue of issues) nextErrors[issue.field] = issue.message;
      setFieldErrors(nextErrors);
      setActiveTab(issues[0]?.tab ?? "basic");
      setFormError(undefined);
      return undefined;
    }
    return [];
  };
  const submit = async (): Promise<void> => {
    if (form === undefined) return;
    const issues = validateOpenForm(form);
    if (issues === undefined) return;
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
  /**
   * Saves the menu draft and pushes it to the WeChat console.
   */
  const publish = async (): Promise<void> => {
    if (form?.mode !== "menu" || form.account === undefined) return;
    const issues = validateOpenForm(form);
    if (issues === undefined) return;
    setPublishing(true);
    setFormError(undefined);
    setPublished(false);
    try {
      await controller.saveMenu(form.account, form.menu);
      await controller.publishMenu(form.account, form.menu);
      setPublished(true);
    } catch (error) {
      setFormError(error instanceof Error
        ? `${messages.menu.publishFailed} (${error.message})`
        : messages.menu.publishFailed);
    } finally {
      setPublishing(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(state.totalItems / Math.max(1, state.pageSize)));
  const basicFieldError = fieldErrors.displayName !== undefined
    || fieldErrors.appId !== undefined
    || fieldErrors.notifyUrl !== undefined
    || fieldErrors.notifyToken !== undefined
    || fieldErrors.notifyEncodingAesKey !== undefined;
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
          {capabilities.editCredentials
            ? <Button onClick={openCreate} size="sm">{messages.panel.add}</Button>
            : null}
        </div>
      </header>

      {state.error !== undefined ? <StatusNotice tone="danger">{state.error}</StatusNotice> : null}

      <div className="min-h-0 flex-1 overflow-auto rounded-[1rem] border border-[var(--sdk-color-border-default)]">
        <div className={capabilities.mode === "operator" ? OPERATOR_LIST_MIN_WIDTH : SELF_SERVICE_LIST_MIN_WIDTH}>
          <div
            className={`sticky top-0 z-10 grid ${capabilities.mode === "operator" ? OPERATOR_ROW_GRID : SELF_SERVICE_ROW_GRID} items-center gap-3 border-b border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] px-3 py-2 text-xs font-medium text-[var(--sdk-color-text-muted)]`}
            data-official-accounts-header=""
          >
            <span className="min-w-0 truncate">{messages.columns.name}</span>
            <span
              className="min-w-0 truncate"
              title={`${messages.columns.appId} / ${messages.columns.originalId}`}
            >
              {messages.columns.identifier}
            </span>
            <span className="min-w-0 truncate">{messages.columns.type}</span>
            {capabilities.mode === "operator"
              ? (
                <>
                  <span className="min-w-0 truncate">{messages.columns.organization}</span>
                  <span className="min-w-0 truncate">{messages.columns.maintainer}</span>
                </>
              )
              : null}
            <span className="min-w-0 truncate">{messages.columns.status}</span>
            <span className="min-w-0 truncate">{messages.columns.menu}</span>
            {/* The action buttons are ghost buttons with their own `px-3`, so the
              label carries the same inset to share their text baseline. */}
            <span className="min-w-0 truncate pr-3 text-right">{messages.columns.actions}</span>
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
                capabilities={capabilities}
                key={account.id}
                messages={messages}
                onDelete={() => setPendingDelete(account)}
                onEdit={() => openEdit(account)}
                onFollowQrCode={() => openFollowQrCode(account)}
                onMenu={() => openMenu(account)}
                onToggle={(enabled) => { void controller.setEnabled(account, enabled); }}
              />
            ))}
        </div>
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
        {/* One sixth wider than the xl size (48rem → 56rem) so the credential grid
          and the server configuration block fit without wrapping. */}
      <DrawerContent className="w-[min(92vw,56rem)]" side="right" size="xl">
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
            {form !== undefined && form.mode !== "menu"
              ? (
                <AccountTabBar
                  activeTab={activeTab}
                  basicError={basicFieldError}
                  capabilities={capabilities}
                  messages={messages}
                  onTabChange={setActiveTab}
                />
              )
              : null}
          </DrawerHeader>
          <DrawerBody className="space-y-3">
            {formError !== undefined ? <StatusNotice tone="danger">{formError}</StatusNotice> : null}
            {published ? <StatusNotice tone="success">{messages.menu.published}</StatusNotice> : null}
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
                  <>
                    <div
                      aria-labelledby="official-account-tab-basic"
                      hidden={activeTab !== "basic"}
                      id="official-account-panel-basic"
                      role="tabpanel"
                    >
                      <BasicInfoTab
                        accountId={form.account?.id}
                        capabilities={capabilities}
                        draft={form.draft}
                        driveUploadImageService={driveUploadImageService}
                        editing={form.mode === "edit"}
                        fieldErrors={fieldErrors}
                        logoFieldRef={logoFieldRef}
                        messages={messages}
                        notifyUrl={standardNotifyUrl}
                        onDraftChange={updateDraft}
                        onLogoUploadingChange={setLogoUploading}
                      />
                    </div>
                    {capabilities.manageDomains
                      ? (
                        <div
                          aria-labelledby="official-account-tab-domains"
                          hidden={activeTab !== "domains"}
                          id="official-account-panel-domains"
                          role="tabpanel"
                        >
                          <DomainsTab
                            domainVerification={domainVerification}
                            draft={form.draft}
                            messages={messages}
                            onDraftChange={updateDraft}
                          />
                        </div>
                      )
                      : null}
                    {capabilities.mode === "self-service" || capabilities.mode === "operator"
                      ? (
                        <div
                          aria-labelledby="official-account-tab-server"
                          hidden={activeTab !== "server"}
                          id="official-account-panel-server"
                          role="tabpanel"
                        >
                          <ServerInfoTab
                            canMaintain={capabilities.mode === "operator" && onSaveServerIps !== undefined}
                            messages={messages}
                            onSave={onSaveServerIps}
                            serverIps={serverIps}
                          />
                        </div>
                      )
                      : null}
                  </>
                )
                : null}
          </DrawerBody>
          <DrawerFooter>
            <Button onClick={closeForm} variant="outline">{messages.form.cancel}</Button>
            {form?.mode === "menu" && capabilities.publishMenu
              ? (
                <Button
                  disabled={saving || publishing}
                  onClick={() => { void publish(); }}
                  variant="secondary"
                >
                  {publishing ? messages.menu.publishing : messages.menu.publish}
                </Button>
              )
              : null}
            <Button
              disabled={saving || publishing || logoUploading}
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

      <Modal
        onOpenChange={(open) => { if (!open) setFollowQr(undefined); }}
        open={followQr !== undefined}
      >
        <ModalContent size="sm">
          <ModalHeader>
            <ModalTitle>{messages.followQrCode.title}</ModalTitle>
            <ModalDescription>{messages.followQrCode.description}</ModalDescription>
          </ModalHeader>
          <ModalBody className="flex flex-col items-center gap-3">
            {followQr?.error !== undefined
              ? <StatusNotice tone="danger">{followQr.error}</StatusNotice>
              : null}
            {followQr?.loading === true
              ? (
                <span className="flex h-56 w-56 items-center justify-center text-sm text-[var(--sdk-color-text-muted)]">
                  {messages.followQrCode.loading}
                </span>
              )
              : null}
            {followQr?.loading !== true && followQr?.qr !== undefined
              ? (
                <>
                  <img
                    alt={followQr.account.displayName}
                    className="h-56 w-56 border border-[var(--sdk-color-border-default)]"
                    src={followQr.qr.qrCode}
                  />
                  <span className="text-sm font-medium text-[var(--sdk-color-text-primary)]">
                    {followQr.account.displayName}
                  </span>
                  {followQr.qr.scene === undefined || followQr.qr.scene === ""
                    ? null
                    : (
                      <code className="max-w-full truncate text-xs text-[var(--sdk-color-text-muted)]">
                        {messages.followQrCode.sceneLabel}: {followQr.qr.scene}
                      </code>
                    )}
                  <StatusNotice tone="default">{messages.followQrCode.permanentHint}</StatusNotice>
                </>
              )
              : null}
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setFollowQr(undefined)} variant="outline">
              {messages.followQrCode.close}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

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

      <SdkworkOfficialAccountsMenuDialog
        canPublish={capabilities.publishMenu}
        canUpdate={capabilities.editCredentials}
        context={menuAccount === undefined ? undefined : {
          accountId: menuAccount.id,
          menu: menuAccount.customMenu,
          displayName: menuAccount.displayName,
          logoUrl: menuAccount.logoUrl,
        }}
        messages={messages.menuEditor}
        onClose={() => setMenuAccount(undefined)}
        onPublish={capabilities.publishMenu
          ? async (menu) => {
            if (menuAccount === undefined) return undefined;
            await controller.saveMenu(menuAccount, menu);
            // Publish the stored revision, so the transport can send the
            // version it just saved and the server can reject a concurrent edit.
            let stored = menu;
            try {
              stored = (await controller.loadMenu(menuAccount.id)).menu;
              setMenuAccount((current) => current === undefined ? current : { ...current, customMenu: stored });
            } catch {
              // The publish request still carries the caller's draft.
            }
            return await controller.publishMenu(menuAccount, stored);
          }
          : undefined}
        onRefresh={capabilities.refreshMenu === true
          ? async (baseVersion) => {
            if (menuAccount === undefined) throw new Error("official account menu dialog has no account");
            return await controller.syncMenu(menuAccount, baseVersion);
          }
          : undefined}
        onRollback={capabilities.rollbackMenu === true
          ? async (version, baseVersion) => {
            if (menuAccount === undefined) throw new Error("official account menu dialog has no account");
            return await controller.rollbackMenu(menuAccount, version, baseVersion);
          }
          : undefined}
        onSave={async (menu) => {
          if (menuAccount === undefined) return undefined;
          await controller.saveMenu(menuAccount, menu);
          // The store advances the menu revision on save; read it back so the
          // dialog's refresh/publish/rollback carry the current baseVersion.
          try {
            const refreshed = await controller.loadMenu(menuAccount.id);
            setMenuAccount((current) => current === undefined ? current : { ...current, customMenu: refreshed.menu });
            return refreshed.menu;
          } catch {
            setMenuAccount((current) => current === undefined ? current : { ...current, customMenu: menu });
            return menu;
          }
        }}
        open={menuAccount !== undefined}
      />
    </div>
  );
}

/** Follow-QR dialog state: the row, its pending request, and the response. */
interface FollowQrState {
  account: OfficialAccount;
  qr?: OfficialAccountsFollowQrCode;
  loading: boolean;
  error?: string;
}

interface FormState {
  mode: "create" | "edit" | "menu";
  account?: OfficialAccount;
  draft: FormDraft;
  menu: OfficialAccountsMenu;
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
  notifyEncryptMode: OfficialAccountsEncryptMode;
  jsSecureDomains: string[];
  webAuthDomains: string[];
  businessDomains: string[];
  enabled: boolean;
  qrDefaultEnabled: boolean;
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
    qrDefaultEnabled: false,
  };
}

function draftOf(account: OfficialAccount): FormDraft {
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
    qrDefaultEnabled: account.qrDefaultEnabled ?? false,
  };
}

function toDraft(form: FormDraft): OfficialAccountDraft {
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
    qrDefaultEnabled: form.qrDefaultEnabled,
  };
}

/**
 * Validates the custom-menu draft shown in its own drawer.
 * @param menu - the complete menu draft.
 * @param messages - resolved copy.
 * @returns the first failure message, or undefined when the draft is complete.
 */
function validateMenu(
  menu: OfficialAccountsMenu,
  messages: OfficialAccountsMessages,
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
  messages: OfficialAccountsMessages,
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
  const token = form.draft.notifyToken.trim();
  if (token !== "" && !NOTIFY_TOKEN_PATTERN.test(token)) {
    issues.push({
      tab: "basic",
      field: "notifyToken",
      message: messages.validation.notifyTokenInvalid,
    });
  }
  const aesKey = form.draft.notifyEncodingAesKey.trim();
  if (aesKey !== "" && !NOTIFY_AES_KEY_PATTERN.test(aesKey)) {
    issues.push({
      tab: "basic",
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

/** One option of a {@link PanelSelect}. */
interface PanelSelectOption {
  value: string;
  label: string;
}

/**
 * Native select for the drawer's enumerated controls.
 *
 * The shared Radix select renders its options through a `document.body` portal,
 * outside the embedding dialog's layer: inside the Harness management modal the
 * options painted behind the drawer and a click never reached an item. A native
 * `<select>` renders its options in the platform's own top layer, inherits this
 * field's stacking context, and keeps keyboard/screen-reader behaviour without
 * portal or layer bookkeeping. Only used for small fixed enumerations.
 */
function PanelSelect({
  ariaLabel,
  id,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  id?: string;
  onChange: (value: string) => void;
  options: readonly PanelSelectOption[];
  value: string;
}): ReactNode {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        className="h-10 w-full appearance-none rounded-[var(--sdk-radius-field)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] px-3 py-2 pr-9 text-sm text-[var(--sdk-color-text-primary)] shadow-[var(--sdk-shadow-sm)] outline-none focus:ring-2 focus:ring-[var(--sdk-color-border-focus)] disabled:cursor-not-allowed disabled:opacity-60"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[var(--sdk-color-text-muted)]"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

/** One domain's WeChat verification-file state, as reported by the host capability. */
export interface OfficialAccountsDomainVerificationStatus {
  /** Whether the deployment manages the domain's DNS zone. */
  managed: boolean
  /** The uploaded WeChat verification file name, when one exists. */
  fileName?: string
  /** Last upload time, when reported. */
  updatedAt?: string
}

/**
 * Host capability that stores the WeChat `MP_verify_*.txt` file for a domain
 * the deployment manages. The platform serves that file verbatim at the domain
 * root, so WeChat can fetch it when the operator saves the domain in the
 * console; a domain outside the managed zones cannot be verified this way.
 */
export interface OfficialAccountsDomainVerification {
  /** @param domain - the configured domain. */
  read(domain: string): Promise<OfficialAccountsDomainVerificationStatus>
  /** Replaces the domain's verification file with the picked one. */
  upload(
    domain: string,
    file: { fileName: string; content: string },
  ): Promise<OfficialAccountsDomainVerificationStatus>
}

/** One managed domain's verification UI state. */
interface DomainVerificationState {
  status?: OfficialAccountsDomainVerificationStatus
  loading: boolean
  uploading: boolean
  error?: string
}

/** WeChat verification names: a token-like stem plus the `.txt` suffix. */
const VERIFICATION_FILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\.txt$/u;

/** The Deploy service caps verification content at 2048 bytes. */
const VERIFICATION_FILE_MAX_BYTES = 2048;

/**
 * Reads a picked WeChat verification file, enforcing the console and Deploy
 * service rules (`.txt` name, non-empty content no larger than 2048 bytes).
 * @param file - the picked file.
 * @returns the file name and verbatim content, or undefined when it is invalid.
 */
async function toVerificationFile(
  file: File,
): Promise<{ fileName: string; content: string } | undefined> {
  if (
    !VERIFICATION_FILE_PATTERN.test(file.name)
    || file.size === 0
    || file.size > VERIFICATION_FILE_MAX_BYTES
  ) {
    return undefined;
  }
  try {
    const content = await file.text();
    return content === "" ? undefined : { fileName: file.name, content };
  } catch {
    return undefined;
  }
}

/**
 * One protected-domain set: every entry stays editable inline, the add field
 * remains available even at the WeChat limit (so a full set explains itself
 * instead of quietly disappearing), and each row carries the verification-file
 * state when the host provides that capability.
 */
function DomainListField({
  addLabel,
  domainVerification,
  hint,
  label,
  max,
  messages,
  onChange,
  placeholder,
  value,
}: {
  addLabel: string;
  domainVerification?: OfficialAccountsDomainVerification;
  hint: string;
  label: string;
  max: number;
  messages: OfficialAccountsMessages;
  onChange: (value: string[]) => void;
  placeholder: string;
  value: readonly string[];
}): ReactNode {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string>();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [states, setStates] = useState<Record<string, DomainVerificationState>>({});
  const picker = useRef<HTMLInputElement | null>(null);
  const pendingDomain = useRef<string | undefined>(undefined);
  const full = value.length >= max;
  const limitMessage = messages.form.domainLimitReached.replace("{max}", String(max));

  // Read every listed domain's stored verification file whenever the set or the
  // capability changes, so an entry added or loaded from the API shows its real
  // state instead of a guess.
  useEffect(() => {
    if (domainVerification === undefined) {
      setStates({});
      return;
    }
    let active = true;
    const domains = [...value];
    setStates((current) => {
      const next: Record<string, DomainVerificationState> = {};
      for (const domain of domains) {
        next[domain] = current[domain]?.status === undefined
          ? { loading: true, uploading: false }
          : current[domain] as DomainVerificationState;
      }
      return next;
    });
    for (const domain of domains) {
      void domainVerification.read(domain).then((status) => {
        if (!active) return;
        setStates((current) => ({
          ...current,
          [domain]: { loading: false, uploading: false, status },
        }));
      }).catch((cause: unknown) => {
        if (!active) return;
        setStates((current) => ({
          ...current,
          [domain]: {
            loading: false,
            uploading: false,
            error: cause instanceof Error ? cause.message : String(cause),
          },
        }));
      });
    }
    return () => { active = false; };
  }, [domainVerification, value]);

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
    if (full) {
      setError(limitMessage);
      return;
    }
    onChange([...value, domain]);
    setInput("");
    setError(undefined);
  };

  const clearRowError = (domain: string): void => {
    setRowErrors((current) => {
      if (current[domain] === undefined) return current;
      const next = { ...current };
      delete next[domain];
      return next;
    });
  };

  const commitEdit = (original: string): void => {
    const raw = edits[original];
    if (raw === undefined) return;
    const revertToCommitted = (): void => {
      setEdits((current) => {
        const next = { ...current };
        delete next[original];
        return next;
      });
    };
    const domain = normalizeDomainInput(raw);
    if (domain === undefined) {
      setRowErrors((current) => ({ ...current, [original]: messages.form.domainInvalid }));
      revertToCommitted();
      return;
    }
    if (value.some((entry) => entry !== original && entry === domain)) {
      setRowErrors((current) => ({ ...current, [original]: messages.form.domainDuplicate }));
      revertToCommitted();
      return;
    }
    clearRowError(original);
    revertToCommitted();
    if (domain !== original) {
      onChange(value.map((entry) => (entry === original ? domain : entry)));
    }
  };

  const revertEdit = (domain: string): void => {
    clearRowError(domain);
    setEdits((current) => {
      const next = { ...current };
      delete next[domain];
      return next;
    });
  };

  const chooseFile = (domain: string): void => {
    pendingDomain.current = domain;
    picker.current?.click();
  };
  const uploadPicked = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    const domain = pendingDomain.current;
    if (domain === undefined || file === undefined || domainVerification === undefined) return;
    const parsed = await toVerificationFile(file);
    if (parsed === undefined) {
      setStates((current) => ({
        ...current,
        [domain]: {
          ...(current[domain] ?? { loading: false, uploading: false }),
          error: messages.form.domainVerificationInvalid,
        },
      }));
      return;
    }
    setStates((current) => ({
      ...current,
      [domain]: {
        ...(current[domain] ?? { loading: false }),
        uploading: true,
        error: undefined,
      },
    }));
    try {
      const status = await domainVerification.upload(domain, parsed);
      setStates((current) => ({
        ...current,
        [domain]: { loading: false, uploading: false, status },
      }));
    } catch (cause) {
      setStates((current) => ({
        ...current,
        [domain]: {
          loading: false,
          uploading: false,
          error: cause instanceof Error && cause.message !== ""
            ? `${messages.form.domainVerificationFailed}: ${cause.message}`
            : messages.form.domainVerificationFailed,
        },
      }));
    }
  };

  const verificationText = (domain: string): ReactNode => {
    const state = states[domain];
    if (state === undefined) return null;
    if (state.error !== undefined) {
      return <span className="text-[var(--sdk-color-state-danger)]">{state.error}</span>;
    }
    if (state.loading) return messages.form.domainVerificationLoading;
    const status = state.status;
    if (status === undefined) return null;
    if (!status.managed) return messages.form.domainVerificationUnmanaged;
    if (status.fileName === undefined) return messages.form.domainVerificationMissing;
    return messages.form.domainVerificationUploaded.replace("{file}", status.fileName);
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
          <ul className="overflow-hidden rounded-[0.75rem] border border-[var(--sdk-color-border-default)]">
            {value.map((domain, index) => {
              const state = states[domain];
              const managed = state?.status?.managed !== false;
              return (
                <li
                  className="space-y-1 border-b border-[var(--sdk-color-border-subtle)] px-3 py-2 last:border-b-0"
                  key={domain}
                >
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label={`${label} ${index + 1}`}
                      className={`${FIELD_CLASS_NAME} font-mono`}
                      onBlur={(event) => {
                        const next = event.relatedTarget;
                        if (next instanceof Node && event.currentTarget.closest("li")?.contains(next)) {
                          return;
                        }
                        commitEdit(domain);
                      }}
                      onChange={(event) => {
                        const next = event.target.value;
                        setEdits((current) => ({ ...current, [domain]: next }));
                        clearRowError(domain);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitEdit(domain);
                        }
                      }}
                      value={edits[domain] ?? domain}
                    />
                    <div className="flex shrink-0 items-center gap-1">
                      {domainVerification !== undefined && managed && state?.loading !== true
                        ? (
                          <Button
                            disabled={state?.uploading === true}
                            onClick={() => chooseFile(domain)}
                            size="sm"
                            variant="ghost"
                          >
                            {state?.status?.fileName === undefined
                              ? messages.form.domainVerificationUpload
                              : messages.form.domainVerificationReplace}
                          </Button>
                        )
                        : null}
                      <button
                        aria-label={`${messages.form.domainRemove}: ${domain}`}
                        className="px-1 text-base text-[var(--sdk-color-text-muted)] transition-colors hover:text-[var(--sdk-color-state-danger)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--sdk-color-border-focus)]"
                        onClick={() => {
                          revertEdit(domain);
                          onChange(value.filter((entry) => entry !== domain));
                        }}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {domainVerification === undefined
                    ? null
                    : (
                      <p className="text-xs text-[var(--sdk-color-text-muted)]">
                        {verificationText(domain)}
                      </p>
                    )}
                  <FieldError message={rowErrors[domain]} />
                </li>
              );
            })}
          </ul>
        )
        : null}
      <div className="flex items-center gap-2">
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
        <Button className="h-10 shrink-0 px-4 text-sm" onClick={add} variant="outline">
          {addLabel}
        </Button>
      </div>
      <FieldError message={error} />
      <p className="text-xs text-[var(--sdk-color-text-muted)]">{hint}</p>
      {domainVerification === undefined
        ? null
        : <p className="text-xs text-[var(--sdk-color-text-muted)]">{messages.form.domainVerificationHint}</p>}
      <input
        accept=".txt,text/plain"
        aria-hidden="true"
        className="hidden"
        data-domain-verification-input=""
        onChange={(event) => { void uploadPicked(event); }}
        ref={picker}
        tabIndex={-1}
        type="file"
      />
    </div>
  );
}

/**
 * The drawer's tab bar. The account surfaces are independent components; this
 * bar only decides which panel the drawer body shows, and it carries the
 * validation marker of the tab that owns the submit errors. Tabs whose
 * capability is off are not rendered at all.
 */
function AccountTabBar({
  activeTab,
  basicError,
  capabilities,
  messages,
  onTabChange,
}: {
  activeTab: DrawerTab;
  basicError: boolean;
  capabilities: OfficialAccountsCapabilities;
  messages: OfficialAccountsMessages;
  onTabChange: (tab: DrawerTab) => void;
}): ReactNode {
  const tabs = [
    { id: "basic" as const, label: messages.form.tabBasic, visible: true },
    { id: "domains" as const, label: messages.form.tabDomains, visible: capabilities.manageDomains },
    {
      id: "server" as const,
      label: messages.form.tabServer,
      visible: true,
    },
  ].filter((tab) => tab.visible);
  const order = tabs.map((tab) => tab.id);
  const select = (tab: DrawerTab): void => {
    onTabChange(tab);
    document.getElementById(`official-account-tab-${tab}`)?.focus();
  };
  return (
    <div
      className="mt-3 inline-flex h-10 items-center gap-1 rounded-[var(--sdk-radius-control)] bg-[var(--sdk-color-surface-panel-muted)] p-1"
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const step = event.key === "ArrowRight" ? 1 : -1;
        const current = order.indexOf(activeTab);
        const next = order[(current + step + order.length) % order.length];
        if (next !== undefined) select(next);
      }}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          aria-controls={`official-account-panel-${tab.id}`}
          aria-selected={activeTab === tab.id}
          className={`inline-flex min-w-[6rem] items-center justify-center rounded-[var(--sdk-radius-control)] px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdk-color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sdk-color-surface-panel)] ${
            activeTab === tab.id
              ? "bg-[var(--sdk-color-surface-panel)] text-[var(--sdk-color-text-primary)] shadow-[var(--sdk-shadow-sm)]"
              : "text-[var(--sdk-color-text-secondary)] hover:text-[var(--sdk-color-text-primary)]"
          }`}
          id={`official-account-tab-${tab.id}`}
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          role="tab"
          tabIndex={activeTab === tab.id ? 0 : -1}
          type="button"
        >
          {tab.label}
          {tab.id === "basic" && basicError
            ? (
              <span
                aria-hidden="true"
                className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--sdk-color-state-danger)]"
              />
            )
            : null}
        </button>
      ))}
    </div>
  );
}

/** The 基础信息 surface: logo, credentials, account type, enable switch, and the
 * message-push server configuration. */
function BasicInfoTab({
  accountId,
  capabilities,
  draft,
  driveUploadImageService,
  editing,
  fieldErrors,
  logoFieldRef,
  messages,
  notifyUrl,
  onDraftChange,
  onLogoUploadingChange,
}: {
  /** Edit-mode upload attribution anchor: the account id. */
  accountId?: string;
  capabilities: OfficialAccountsCapabilities;
  draft: FormDraft;
  driveUploadImageService?: DriveUploadImageService;
  editing: boolean;
  fieldErrors: Partial<Record<FieldKey, string>>;
  logoFieldRef: RefObject<DriveUploadImageHandle | null>;
  messages: OfficialAccountsMessages;
  /** The standard callback URL, generated once the account has an id. */
  notifyUrl?: string;
  onDraftChange: (patch: Partial<FormDraft>) => void;
  onLogoUploadingChange: (uploading: boolean) => void;
}): ReactNode {
  const encryptModeHint = draft.notifyEncryptMode === "safe"
    ? messages.form.encryptSafeHint
    : draft.notifyEncryptMode === "compatible"
      ? messages.form.encryptCompatibleHint
      : messages.form.encryptPlaintextHint;
  type CopyAction = "url" | "token" | "aes";
  const [copiedAction, setCopiedAction] = useState<CopyAction>();
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => {
    if (copyTimer.current !== undefined) clearTimeout(copyTimer.current);
  }, []);
  const copyValue = async (value: string, action: CopyAction): Promise<void> => {
    if (value === "" || !(await copyText(value))) return;
    setCopiedAction(action);
    if (copyTimer.current !== undefined) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopiedAction(undefined), 1500);
  };
  return (
    <div className="space-y-5">
      <OfficialAccountLogoField
        accountId={editing ? accountId : undefined}
        copy={messages.form}
        driveUploadImageService={driveUploadImageService}
        fieldRef={logoFieldRef}
        onChange={(logoUrl) => onDraftChange({ logoUrl })}
        onUploadingChange={onLogoUploadingChange}
        value={draft.logoUrl}
      />
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
        <div className="space-y-1.5">
          <Label htmlFor="official-account-app-id">{messages.form.appId}</Label>
          <Input
            aria-invalid={fieldErrors.appId !== undefined}
            disabled={editing || !capabilities.editCredentials}
            id="official-account-app-id"
            className={`${FIELD_CLASS_NAME} font-mono disabled:opacity-60`}
            onChange={(event) => onDraftChange({ appId: event.target.value })}
            placeholder={messages.form.appIdPlaceholder}
            value={draft.appId}
          />
          <FieldError message={fieldErrors.appId} />
          <p className="text-xs text-[var(--sdk-color-text-muted)]">{messages.form.appIdHint}</p>
        </div>
        {capabilities.editCredentials
          ? (
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
          )
          : (
            <div className="space-y-1.5">
              <Label htmlFor="official-account-secret">{messages.form.appSecret}</Label>
              <p className="text-xs text-[var(--sdk-color-text-muted)]">
                {messages.form.credentialsLocked}
              </p>
            </div>
          )}
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
          <PanelSelect
            ariaLabel={messages.form.accountType}
            id="official-account-type"
            onChange={(value) => onDraftChange({ accountType: value })}
            options={[
              { value: "service", label: messages.accountType.service },
              { value: "subscription", label: messages.accountType.subscription },
            ]}
            value={draft.accountType}
          />
        </div>
        {editing
          ? (
            <div className="space-y-1.5">
              <label className="flex h-full items-center justify-between gap-3 rounded-[0.75rem] border border-[var(--sdk-color-border-default)] px-3 py-2.5 text-sm text-[var(--sdk-color-text-primary)]">
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
        {editing && capabilities.manageQrLogin
          ? (
            <div className="space-y-1.5">
              <label className="flex h-full items-center justify-between gap-3 rounded-[0.75rem] border border-[var(--sdk-color-border-default)] px-3 py-2.5 text-sm text-[var(--sdk-color-text-primary)]">
                <span className="flex flex-col">
                  <span>{messages.form.qrLogin}</span>
                  <span className="text-xs text-[var(--sdk-color-text-muted)]">
                    {messages.form.qrLoginHint}
                  </span>
                </span>
                <Switch
                  checked={draft.qrDefaultEnabled}
                  onCheckedChange={(qrDefaultEnabled) => onDraftChange({ qrDefaultEnabled })}
                />
              </label>
            </div>
          )
          : null}
      </div>

      {capabilities.manageNotify
        ? (
          <fieldset className="space-y-4 rounded-[1rem] border border-[var(--sdk-color-border-default)] p-4">
            <legend className="px-1 text-sm font-medium text-[var(--sdk-color-text-primary)]">
              {messages.form.notifySection}
            </legend>
            <p className="text-xs text-[var(--sdk-color-text-muted)]">
              {messages.form.serverConfigHint}
            </p>
            <div className="space-y-1.5">
              <Label>{messages.form.notifyUrlStandard}</Label>
              {notifyUrl === undefined
                ? (
                  <p className="rounded-[0.75rem] border border-dashed border-[var(--sdk-color-border-default)] px-3 py-2 text-xs text-[var(--sdk-color-text-muted)]">
                    {messages.form.notifyUrlPending}
                  </p>
                )
                : (
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 break-all rounded-[0.75rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] px-3 py-2 font-mono text-xs text-[var(--sdk-color-text-primary)]">
                      {notifyUrl}
                    </code>
                    <Button
                      className="shrink-0"
                      onClick={() => { void copyValue(notifyUrl, "url"); }}
                      size="sm"
                      variant="outline"
                    >
                      {copiedAction === "url" ? messages.form.notifyUrlCopied : messages.form.notifyUrlCopy}
                    </Button>
                  </div>
                )}
              <p className="text-xs text-[var(--sdk-color-text-muted)]">
                {messages.form.notifyUrlStandardHint}
              </p>
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
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-[var(--sdk-color-text-muted)]">{messages.form.notifyTokenHint}</p>
                  <span className="flex shrink-0 items-center gap-3">
                    <button
                      aria-label={`${messages.form.notifyCopy} ${messages.form.notifyToken}`}
                      className="text-xs font-medium text-[var(--sdk-color-text-primary)] underline underline-offset-2 transition-colors hover:text-[var(--sdk-color-text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sdk-color-border-focus)] disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={draft.notifyToken === ""}
                      onClick={() => { void copyValue(draft.notifyToken, "token"); }}
                      type="button"
                    >
                      {copiedAction === "token" ? messages.form.notifyCopied : messages.form.notifyCopy}
                    </button>
                    <button
                      aria-label={`${messages.form.notifyGenerate} ${messages.form.notifyToken}`}
                      className="text-xs font-medium text-[var(--sdk-color-text-primary)] underline underline-offset-2 transition-colors hover:text-[var(--sdk-color-text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sdk-color-border-focus)]"
                      onClick={() => onDraftChange({ notifyToken: randomWechatSecret(GENERATED_TOKEN_LENGTH) })}
                      type="button"
                    >
                      {messages.form.notifyGenerate}
                    </button>
                  </span>
                </div>
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
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-[var(--sdk-color-text-muted)]">
                    {messages.form.notifyEncodingAesKeyHint}
                  </p>
                  <span className="flex shrink-0 items-center gap-3">
                    <button
                      aria-label={`${messages.form.notifyCopy} ${messages.form.notifyEncodingAesKey}`}
                      className="text-xs font-medium text-[var(--sdk-color-text-primary)] underline underline-offset-2 transition-colors hover:text-[var(--sdk-color-text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sdk-color-border-focus)] disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={draft.notifyEncodingAesKey === ""}
                      onClick={() => { void copyValue(draft.notifyEncodingAesKey, "aes"); }}
                      type="button"
                    >
                      {copiedAction === "aes" ? messages.form.notifyCopied : messages.form.notifyCopy}
                    </button>
                    <button
                      aria-label={`${messages.form.notifyGenerate} ${messages.form.notifyEncodingAesKey}`}
                      className="text-xs font-medium text-[var(--sdk-color-text-primary)] underline underline-offset-2 transition-colors hover:text-[var(--sdk-color-text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sdk-color-border-focus)]"
                      onClick={() => onDraftChange({
                        notifyEncodingAesKey: randomWechatSecret(GENERATED_AES_KEY_LENGTH),
                      })}
                      type="button"
                    >
                      {messages.form.notifyGenerate}
                    </button>
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="official-account-encrypt-mode">{messages.form.notifyEncryptMode}</Label>
              <PanelSelect
                ariaLabel={messages.form.notifyEncryptMode}
                id="official-account-encrypt-mode"
                onChange={(value) => onDraftChange({
                  notifyEncryptMode: value === "safe"
                    ? "safe"
                    : value === "compatible" ? "compatible" : "plaintext",
                })}
                options={[
                  { value: "plaintext", label: messages.form.encryptPlaintext },
                  { value: "compatible", label: messages.form.encryptCompatible },
                  { value: "safe", label: messages.form.encryptSafe },
                ]}
                value={draft.notifyEncryptMode}
              />
              <p className="text-xs text-[var(--sdk-color-text-muted)]">{encryptModeHint}</p>
            </div>
          </fieldset>
        )
        : null}

      <StatusNotice tone="default">{messages.form.ipWhitelistHint}</StatusNotice>
    </div>
  );
}

/** The 域名配置 surface: the three WeChat protected-domain sets. */
function DomainsTab({
  domainVerification,
  draft,
  messages,
  onDraftChange,
}: {
  domainVerification?: OfficialAccountsDomainVerification;
  draft: FormDraft;
  messages: OfficialAccountsMessages;
  onDraftChange: (patch: Partial<FormDraft>) => void;
}): ReactNode {
  return (
    <div className="space-y-5">
      <p className="text-xs text-[var(--sdk-color-text-muted)]">{messages.form.domainsHint}</p>
      <DomainListField
        addLabel={messages.form.domainAdd}
        domainVerification={domainVerification}
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
        domainVerification={domainVerification}
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
        domainVerification={domainVerification}
        hint={messages.form.businessDomainsHint}
        label={messages.form.businessDomains}
        max={BUSINESS_DOMAIN_LIMIT}
        messages={messages}
        onChange={(value) => onDraftChange({ businessDomains: value })}
        placeholder={messages.form.domainPlaceholder}
        value={draft.businessDomains}
      />

      <StatusNotice tone="default">{messages.form.domainsMonthlyHint}</StatusNotice>
    </div>
  );
}

/**
 * Copies text through the async clipboard API, falling back to a transient
 * textarea for hosts that only expose the legacy copy command.
 * @param value - the text to copy.
 * @returns whether a copy command reported success.
 */
async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const copied = typeof document.execCommand === "function"
        ? document.execCommand("copy")
        : false;
      area.remove();
      return copied;
    } catch {
      return false;
    }
  }
}

/**
 * The 服务器信息 surface: the deployment's published egress IPs, each copyable,
 * so an operator can paste them into the WeChat 公众号 IP allowlist.
 */
function ServerInfoTab({
  canMaintain = false,
  messages,
  onSave,
  serverIps,
}: {
  canMaintain?: boolean;
  messages: OfficialAccountsMessages;
  onSave?: (ips: string[]) => Promise<readonly string[]>;
  serverIps: readonly string[];
}): ReactNode {
  const [copied, setCopied] = useState<string>();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [localIps, setLocalIps] = useState<readonly string[]>();
  const [maintainOpen, setMaintainOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const ips = localIps ?? serverIps;
  useEffect(() => () => {
    if (timer.current !== undefined) clearTimeout(timer.current);
  }, []);
  const copy = async (value: string, id: string): Promise<void> => {
    if (!(await copyText(value))) return;
    setCopied(id);
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(undefined), 1500);
  };
  const openMaintain = (): void => {
    setDraft(ips.join("\n"));
    setError(undefined);
    setMaintainOpen(true);
  };
  const saveMaintain = async (): Promise<void> => {
    if (onSave === undefined) return;
    const entries = draft
      .split(/\r?\n/u)
      .map((entry) => entry.trim())
      .filter((entry) => entry !== "");
    const unique = [...new Set(entries)];
    if (unique.some((entry) => /\s/u.test(entry))) {
      setError(messages.form.serverIpsInvalid);
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const saved = await onSave(unique);
      setLocalIps(saved);
      setMaintainOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : messages.form.serverIpsInvalid);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--sdk-color-text-muted)]">{messages.form.serverIpsHint}</p>
      <StatusNotice tone="default">{messages.form.serverIpsNote}</StatusNotice>
      {ips.length === 0
        ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--sdk-color-text-muted)]">
              {canMaintain ? messages.form.serverIpsEmptyMaintain : messages.form.serverIpsEmpty}
            </p>
            {canMaintain
              ? (
                <Button onClick={openMaintain} size="sm" variant="outline">
                  {messages.form.serverIpsMaintain}
                </Button>
              )
              : null}
          </div>
        )
        : (
          <div className="overflow-hidden rounded-[1rem] border border-[var(--sdk-color-border-default)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--sdk-color-border-default)] px-3 py-2">
              <span className="text-xs font-medium text-[var(--sdk-color-text-muted)]">
                {messages.form.serverIpsCount.replace("{count}", String(ips.length))}
              </span>
              <div className="flex items-center gap-2">
                {canMaintain
                  ? (
                    <Button onClick={openMaintain} size="sm" variant="outline">
                      {messages.form.serverIpsMaintain}
                    </Button>
                  )
                  : null}
                <Button
                  onClick={() => { void copy(ips.join("\n"), "all"); }}
                  size="sm"
                  variant="outline"
                >
                  {copied === "all" ? messages.form.serverIpCopied : messages.form.serverIpCopyAll}
                </Button>
              </div>
            </div>
            <ul>
              {ips.map((ip) => (
                <li
                  className="flex items-center justify-between gap-3 border-b border-[var(--sdk-color-border-subtle)] px-3 py-2 last:border-b-0"
                  key={ip}
                >
                  <span className="font-mono text-sm text-[var(--sdk-color-text-primary)]">{ip}</span>
                  <Button
                    onClick={() => { void copy(ip, ip); }}
                    size="sm"
                    variant="ghost"
                  >
                    {copied === ip ? messages.form.serverIpCopied : messages.form.serverIpCopy}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

      <Modal open={maintainOpen} onOpenChange={setMaintainOpen}>
        <ModalContent size="md">
          <ModalHeader>
            <ModalTitle>{messages.form.serverIpsMaintainTitle}</ModalTitle>
            <ModalDescription>{messages.form.serverIpsMaintainDescription}</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3">
            {error === undefined ? null : <StatusNotice tone="danger">{error}</StatusNotice>}
            <Textarea
              aria-label={messages.form.serverIpsMaintainTitle}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={messages.form.serverIpsPlaceholder}
              rows={6}
              value={draft}
            />
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setMaintainOpen(false)} variant="outline">
              {messages.form.cancel}
            </Button>
            <Button loading={saving} onClick={() => { void saveMaintain(); }}>
              {messages.form.serverIpsSave}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
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
  copy: OfficialAccountsMessages["form"];
  driveUploadImageService?: DriveUploadImageService;
  fieldRef: RefObject<DriveUploadImageHandle | null>;
  onChange: (logoUrl: string) => void;
  onUploadingChange: (uploading: boolean) => void;
  value: string;
}): ReactNode {
  const previewSrc = value !== "" && !value.startsWith("drive://") ? value : undefined;
  return (
    <div className="space-y-2" data-official-account-logo="">
      <span className="block text-sm font-medium text-[var(--sdk-color-text-primary)]">
        {copy.logo}
      </span>
      <div className="flex flex-wrap items-start gap-4">
        {driveUploadImageService === undefined
          ? (
            previewSrc === undefined
              ? null
              : (
                <img
                  alt={copy.logo}
                  className="h-24 w-24 rounded-xl border border-[var(--sdk-color-border-default)] object-cover"
                  src={previewSrc}
                />
              )
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
              maxSizeBytes={LOGO_MAX_BYTES}
              onChange={(uploaded) => onChange(uploaded?.uri ?? "")}
              onUploadingChange={onUploadingChange}
              ref={fieldRef}
              service={driveUploadImageService}
              shape="rounded"
              sizePx={96}
              value={toLogoUploadValue(value)}
            />
          )}
        <div className="min-w-0 space-y-1 pt-1">
          {driveUploadImageService === undefined
            ? <p className="text-xs text-[var(--sdk-color-text-muted)]">{copy.logoUnavailable}</p>
            : (
              <>
                <p className="text-xs text-[var(--sdk-color-text-muted)]">{copy.logoHint}</p>
                <p className="text-xs text-[var(--sdk-color-text-muted)]">{copy.logoNote}</p>
              </>
            )}
        </div>
      </div>
    </div>
  );
}

function MenuEditor({
  draft,
  messages,
  onChange,
}: {
  draft: OfficialAccountsMenu;
  messages: OfficialAccountsMessages;
  onChange: (menu: OfficialAccountsMenu) => void;
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
              <PanelSelect
                ariaLabel={messages.menu.buttonType}
                onChange={(value) => updateButton(index, {
                  ...button,
                  type: value === "click" ? "click" : value === "parent" ? "parent" : "view",
                })}
                options={[
                  { value: "view", label: messages.menu.typeView },
                  { value: "click", label: messages.menu.typeClick },
                  { value: "parent", label: messages.menu.addSubButton },
                ]}
                value={button.type}
              />
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
                      <PanelSelect
                        ariaLabel={messages.menu.buttonType}
                        onChange={(value) => updateButton(index, {
                          ...button,
                          subButtons: button.subButtons.map((current, currentIndex) =>
                            currentIndex === subIndex
                              ? { ...current, type: value === "click" ? "click" : "view" }
                              : current),
                        })}
                        options={[
                          { value: "view", label: messages.menu.typeView },
                          { value: "click", label: messages.menu.typeClick },
                        ]}
                        value={sub.type}
                      />
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
