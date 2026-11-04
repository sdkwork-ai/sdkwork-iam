import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
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
} from "@sdkwork/ui-pc-react";

import type {
  SdkworkIamOfficialAccount,
  SdkworkIamOfficialAccountDraft,
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

const FIELD_CLASS_NAME =
  "w-full rounded-[0.75rem] border border-[var(--sdk-color-border-default)] bg-transparent px-3 py-2 text-sm";

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
 */
export function SdkworkIamOfficialAccountsPanel({
  controller,
  messages: messagesOverride,
}: {
  controller: SdkworkIamOfficialAccountsController;
  /** Override copy (hosts and tests); defaults to the module catalog. */
  messages?: SdkworkIamOfficialAccountsMessages;
}): ReactNode {
  const messages = messagesOverride ?? useSdkworkIamOfficialAccountsMessages();
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  const [search, setSearch] = useState(state.query);
  const [form, setForm] = useState<FormState>();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [pendingDelete, setPendingDelete] = useState<SdkworkIamOfficialAccount>();

  useEffect(() => {
    if (state.status === "idle") void controller.load({ page: 1 });
  }, [controller, state.status]);

  const openCreate = (): void => {
    setFormError(undefined);
    setForm({ mode: "create", draft: emptyDraft(), menu: { buttons: [] } });
  };
  const openEdit = (account: SdkworkIamOfficialAccount): void => {
    setFormError(undefined);
    setForm({ mode: "edit", account, draft: draftOf(account), menu: account.customMenu });
  };
  const openMenu = (account: SdkworkIamOfficialAccount): void => {
    setFormError(undefined);
    setForm({ mode: "menu", account, draft: draftOf(account), menu: account.customMenu });
  };
  const closeForm = (): void => {
    if (saving) return;
    setForm(undefined);
    setFormError(undefined);
  };
  const submit = async (): Promise<void> => {
    if (form === undefined) return;
    const issue = validate(form, messages);
    if (issue !== undefined) {
      setFormError(issue);
      return;
    }
    setSaving(true);
    setFormError(undefined);
    try {
      const draft = { ...toDraft(form.draft), customMenu: form.menu };
      if (form.mode === "create") {
        await controller.create(draft);
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
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-semibold text-[var(--sdk-color-text-primary)]">
            {messages.panel.title}
          </h2>
          <p className="text-xs text-[var(--sdk-color-text-muted)]">{messages.panel.description}</p>
        </div>
        <div className="flex items-center gap-2">
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

      <div className="flex flex-wrap items-center gap-2">
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
        <Button onClick={() => { void controller.load({ q: search, page: 1 }); }} size="sm" variant="secondary">
          {messages.panel.search}
        </Button>
        <span className="ml-auto text-xs text-[var(--sdk-color-text-muted)]">
          {messages.panel.total.replace("{total}", String(state.totalItems))}
        </span>
      </div>

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
        <DrawerContent side="right" size="lg">
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
          <DrawerBody>
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
                  <AccountFields
                    draft={form.draft}
                    editing={form.mode === "edit"}
                    messages={messages}
                    onChange={(draft) => setForm({ ...form, draft })}
                  />
                )
                : null}
          </DrawerBody>
          <DrawerFooter>
            <Button onClick={closeForm} variant="outline">{messages.form.cancel}</Button>
            <Button disabled={saving} loading={saving} onClick={() => { void submit(); }}>
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
    enabled: form.enabled,
  };
}

function validate(form: FormState, messages: SdkworkIamOfficialAccountsMessages): string | undefined {
  if (form.mode !== "menu") {
    if (form.draft.displayName.trim() === "") return messages.validation.displayNameRequired;
    if (form.mode === "create") {
      if (form.draft.appId.trim() === "") return messages.validation.appIdRequired;
      if (!/^[A-Za-z0-9_-]{4,64}$/.test(form.draft.appId.trim())) {
        return messages.validation.appIdInvalid;
      }
    }
  }
  for (const button of form.menu.buttons) {
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

function AccountFields({
  draft,
  editing,
  messages,
  onChange,
}: {
  draft: FormDraft;
  editing: boolean;
  messages: SdkworkIamOfficialAccountsMessages;
  onChange: (draft: FormDraft) => void;
}): ReactNode {
  const set = <K extends keyof FormDraft>(key: K, value: FormDraft[K]): void => {
    onChange({ ...draft, [key]: value });
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="official-account-name">{messages.form.displayName}</Label>
          <Input
            id="official-account-name"
            className={FIELD_CLASS_NAME}
            onChange={(event) => set("displayName", event.target.value)}
            placeholder={messages.form.displayNamePlaceholder}
            value={draft.displayName}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="official-account-app-id">{messages.form.appId}</Label>
          <Input
            disabled={editing}
            id="official-account-app-id"
            className={FIELD_CLASS_NAME}
            onChange={(event) => set("appId", event.target.value)}
            placeholder={messages.form.appIdPlaceholder}
            value={draft.appId}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="official-account-secret">{messages.form.appSecret}</Label>
          <Input
            id="official-account-secret"
            autoComplete="off"
            className={FIELD_CLASS_NAME}
            onChange={(event) => set("appSecret", event.target.value)}
            placeholder={editing ? messages.form.appSecretKeep : messages.form.appSecretPlaceholder}
            type="password"
            value={draft.appSecret}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="official-account-type">{messages.form.accountType}</Label>
          <Select onValueChange={(value) => set("accountType", value)} value={draft.accountType}>
            <SelectTrigger aria-label={messages.form.accountType} id="official-account-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="service">{messages.accountType.service}</SelectItem>
              <SelectItem value="subscription">{messages.accountType.subscription}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="official-account-original-id">{messages.form.originalId}</Label>
          <Input
            id="official-account-original-id"
            className={FIELD_CLASS_NAME}
            onChange={(event) => set("originalId", event.target.value)}
            placeholder={messages.form.originalIdPlaceholder}
            value={draft.originalId}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="official-account-logo">{messages.form.logoUrl}</Label>
          <Input
            id="official-account-logo"
            className={FIELD_CLASS_NAME}
            onChange={(event) => set("logoUrl", event.target.value)}
            placeholder={messages.form.logoUrlPlaceholder}
            value={draft.logoUrl}
          />
        </div>
      </div>

      <fieldset className="space-y-3 rounded-[1rem] border border-[var(--sdk-color-border-default)] p-4">
        <legend className="px-1 text-sm font-medium text-[var(--sdk-color-text-primary)]">
          {messages.form.notifySection}
        </legend>
        <div className="space-y-1.5">
          <Label htmlFor="official-account-notify-url">{messages.form.notifyUrl}</Label>
          <Input
            id="official-account-notify-url"
            className={FIELD_CLASS_NAME}
            onChange={(event) => set("notifyUrl", event.target.value)}
            placeholder={messages.form.notifyUrlPlaceholder}
            value={draft.notifyUrl}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="official-account-notify-token">{messages.form.notifyToken}</Label>
            <Input
              id="official-account-notify-token"
              autoComplete="off"
              className={FIELD_CLASS_NAME}
              onChange={(event) => set("notifyToken", event.target.value)}
              placeholder={messages.form.notifyTokenPlaceholder}
              value={draft.notifyToken}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="official-account-aes-key">{messages.form.notifyEncodingAesKey}</Label>
            <Input
              id="official-account-aes-key"
              autoComplete="off"
              className={FIELD_CLASS_NAME}
              onChange={(event) => set("notifyEncodingAesKey", event.target.value)}
              placeholder={messages.form.notifyEncodingAesKeyPlaceholder}
              value={draft.notifyEncodingAesKey}
            />
          </div>
        </div>
      </fieldset>

      {editing
        ? (
          <label className="flex items-center gap-2 text-sm text-[var(--sdk-color-text-primary)]">
            <Switch
              checked={draft.enabled}
              onCheckedChange={(enabled) => set("enabled", enabled)}
            />
            {messages.form.enabled}
          </label>
        )
        : null}
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
