import { useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from "react";
import { Ban, Eye, Pencil, Plus, Search, Trash2, Unlock } from "lucide-react";
import { CatalogPagination } from "@sdkwork/iam-pc-admin-core";
import {
  Button,
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  StatusNotice,
} from "@sdkwork/ui-pc-react";

import { USER_ADMIN_COUNTRY_OPTIONS, type UserAdminCountryOption } from "./user-admin-countries";
import { DriveUploadImage, type DriveUploadImageHandle } from "sdkwork-drive-pc-upload-image";
import type { DriveUploadImageValue } from "@sdkwork/drive-upload-image-core";
import type {
  SdkworkIamAdminUser,
  SdkworkIamAdminUserAvatarResource,
  SdkworkIamAdminUserDraft,
  SdkworkIamUserAdminWorkspaceProps,
} from "../types/user-admin-types";

const emptyUserDraft = (): SdkworkIamAdminUserDraft => ({ username: "" });
const readOnlyPermissions = { create: false, delete: false, update: false } as const;
const initialPasswordMinLength = 8;
const initialPasswordMaxLength = 64;
/** Raw image ceiling accepted from the picker; Drive still enforces its own quota. */
const avatarMaxBytes = 5 * 1024 * 1024;
const userAdminMessages = {
  "en-US": {
    locale: "en-US",
    avatar: "Avatar",
    avatarHint: "JPG, PNG, WebP, and other image formats up to 5 MB",
    avatarInvalidType: "The avatar must be an image file.",
    avatarPlaceholder: "Avatar image URL",
    avatarRemove: "Remove avatar",
    avatarReplace: "Replace avatar",
    avatarRetry: "Retry upload",
    avatarTooLarge: "The avatar must be 5 MiB or smaller.",
    avatarTooLargeDetail: "The avatar must be {max} or smaller.",
    avatarUpload: "Click or drop an image here",
    avatarUploadFailed: "Avatar upload failed",
    avatarUploading: "Uploading avatar…",
    ban: "Ban",
    banDescription: "Ban {name}? The user's sessions and API keys will be revoked immediately, and the account will no longer be able to sign in.",
    banSuccess: "User banned",
    birthDate: "Birth date",
    cancel: "Cancel",
    close: "Close",
    country: "Country",
    countryPlaceholder: "Select country",
    create: "Create user",
    createDescription: "Add a user to the IAM directory.",
    createSuccess: "User created",
    createTitle: "Create user",
    delete: "Delete user",
    deleteDescription: "Delete {name}? This permanently removes the directory record and cannot be undone.",
    deleteSuccess: "User deleted",
    detailsDescription: "Review identity attributes and account status.",
    detailsTitle: "User details",
    displayName: "Display name",
    edit: "Edit user",
    editDescription: "Update the selected directory record.",
    editSuccess: "User updated",
    editTitle: "Edit user",
    email: "Email",
    emptyDescription: "Create a user to populate the IAM directory.",
    emptyTitle: "No users found",
    gender: "Gender",
    genderPlaceholder: "Select gender",
    genders: { female: "Female", male: "Male", unknown: "Unknown" },
    initialPassword: "Initial password",
    initialPasswordEdit: "Reset password",
    initialPasswordHint: "8-64 characters. Leave blank to skip.",
    invalidInitialPassword: "The password must be 8-64 characters.",
    lastLoginAt: "Last login",
    loadError: "Failed to load users",
    noMatchDescription: "Try a different name, username, email, phone number, or status.",
    noMatchTitle: "No matching users",
    operationError: "Operation failed",
    paginationNext: "Next",
    paginationPageSize: "Per page",
    paginationPrevious: "Previous",
    paginationTotal: "{total} items in total",
    passwordPlaceholder: "Enter password",
    phone: "Phone",
    registeredAt: "Registered at",
    save: "Save changes",
    search: "Search",
    searchError: "Failed to search users",
    searchLabel: "Search users",
    searchPlaceholder: "Search name, username, email, or phone",
    status: "Status",
    statusAll: "All statuses",
    statuses: { active: "Active", banned: "Banned", disabled: "Disabled", locked: "Locked", unknown: "Unknown" },
    unban: "Unban",
    unbanSuccess: "User unbanned",
    user: "User",
    username: "Username",
    view: "View user",
  },
  "zh-CN": {
    locale: "zh-CN",
    avatar: "头像",
    avatarHint: "支持 JPG、PNG、WebP 等图片格式，不超过 5 MB",
    avatarInvalidType: "头像必须是图片文件。",
    avatarPlaceholder: "头像图片链接",
    avatarRemove: "移除头像",
    avatarReplace: "更换头像",
    avatarRetry: "重试上传",
    avatarTooLarge: "头像不能超过 5 MiB。",
    avatarTooLargeDetail: "头像不能超过 {max}。",
    avatarUpload: "点击或拖拽图片到此处",
    avatarUploadFailed: "头像上传失败",
    avatarUploading: "头像上传中…",
    ban: "封禁",
    banDescription: "确定封禁 {name} 吗？该用户的会话与 API key 将立即撤销，账号将无法再登录。",
    banSuccess: "用户已封禁",
    birthDate: "出生日期",
    cancel: "取消",
    close: "关闭",
    country: "国家",
    countryPlaceholder: "请选择国家",
    create: "创建用户",
    createDescription: "向 IAM 用户目录添加新用户。",
    createSuccess: "用户已创建",
    createTitle: "创建用户",
    delete: "删除用户",
    deleteDescription: "确定删除 {name} 吗？该目录记录将被永久移除，且无法撤销。",
    deleteSuccess: "用户已删除",
    detailsDescription: "查看身份属性和账号状态。",
    detailsTitle: "用户详情",
    displayName: "显示名称",
    edit: "编辑用户",
    editDescription: "更新所选用户的目录记录。",
    editSuccess: "用户已更新",
    editTitle: "编辑用户",
    email: "邮箱",
    emptyDescription: "创建用户后，账号将显示在 IAM 目录中。",
    emptyTitle: "暂无用户",
    gender: "性别",
    genderPlaceholder: "请选择性别",
    genders: { female: "女", male: "男", unknown: "未知" },
    initialPassword: "初始密码",
    initialPasswordEdit: "重置密码",
    initialPasswordHint: "8-64 位字符，留空则不设置。",
    invalidInitialPassword: "密码需为 8-64 个字符。",
    lastLoginAt: "上次登录时间",
    loadError: "用户加载失败",
    noMatchDescription: "请尝试其他姓名、用户名、邮箱、手机号或状态。",
    noMatchTitle: "未找到匹配用户",
    operationError: "操作失败",
    paginationNext: "下一页",
    paginationPageSize: "每页",
    paginationPrevious: "上一页",
    paginationTotal: "共 {total} 条",
    passwordPlaceholder: "请输入密码",
    phone: "手机号",
    registeredAt: "注册时间",
    save: "保存更改",
    search: "搜索",
    searchError: "用户搜索失败",
    searchLabel: "搜索用户",
    searchPlaceholder: "搜索姓名、用户名、邮箱或手机号",
    status: "状态",
    statusAll: "全部状态",
    statuses: { active: "正常", banned: "已封禁", disabled: "已禁用", locked: "已锁定", unknown: "未知" },
    unban: "解封",
    unbanSuccess: "用户已解封",
    user: "用户",
    username: "用户名",
    view: "查看用户",
  },
} as const;

export function SdkworkIamUserAdminWorkspace({
  controller,
  driveUploadImageService,
  locale,
  permissions = readOnlyPermissions,
}: SdkworkIamUserAdminWorkspaceProps) {
  const copy = locale?.toLowerCase().startsWith("zh") ? userAdminMessages["zh-CN"] : userAdminMessages["en-US"];
  const [users, setUsers] = useState(controller.getState().users);
  const [listPageInfo, setListPageInfo] = useState(controller.getState().listPageInfo);
  const [selectedUser, setSelectedUser] = useState<SdkworkIamAdminUser>();
  const [draft, setDraft] = useState<SdkworkIamAdminUserDraft>(emptyUserDraft);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit" | "view">();
  const [deleteTarget, setDeleteTarget] = useState<SdkworkIamAdminUser>();
  const [banTarget, setBanTarget] = useState<SdkworkIamAdminUser>();
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [appliedStatus, setAppliedStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  // The shared avatar field parks a create-mode pick inside its own
  // controller (persist-first, `DRIVE_SPEC.md` §18.3): the drawer hands the
  // fresh user id to the parked upload through this handle after createUser
  // returns. The controller dies with the drawer, so closing discards a
  // never-submitted pick.
  const avatarFieldRef = useRef<DriveUploadImageHandle | null>(null);

  const closeDrawer = () => {
    setDrawerMode(undefined);
  };

  const refreshUsers = async (nextQuery = appliedQuery, nextPage = page, nextPageSize = pageSize, nextStatus = appliedStatus) => {
    const params: Record<string, unknown> = { page: nextPage, page_size: nextPageSize };
    if (nextQuery) params.q = nextQuery;
    if (nextStatus && nextStatus !== "all") params.status = nextStatus;
    const items = await controller.listUsers(params);
    setUsers(items);
    setListPageInfo(controller.getState().listPageInfo);
    return items;
  };

  useEffect(() => {
    setLoading(true);
    void refreshUsers()
      .catch((loadError) => setError(toErrorMessage(loadError, copy.loadError)))
      .finally(() => setLoading(false));
  }, [controller]);

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await action();
      setNotice(successMessage);
    } catch (actionError) {
      setError(toErrorMessage(actionError, copy.operationError));
    } finally {
      setBusy(false);
    }
  };

  const openCreateDrawer = () => {
    setSelectedUser(undefined);
    setDraft(emptyUserDraft());
    setDrawerMode("create");
  };

  const openUserDrawer = async (user: SdkworkIamAdminUser, mode: "edit" | "view") => {
    setError(undefined);
    try {
      const resolved = await controller.selectUser(user.userId) ?? user;
      setSelectedUser(resolved);
      setDraft(toUserDraft(resolved));
      setDrawerMode(mode);
    } catch (loadError) {
      setError(toErrorMessage(loadError, copy.loadError));
    }
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = query.trim();
    const nextStatus = filterStatus;
    setAppliedQuery(nextQuery);
    setAppliedStatus(nextStatus);
    setPage(1);
    setLoading(true);
    setError(undefined);
    void refreshUsers(nextQuery, 1, pageSize, nextStatus)
      .catch((loadError) => setError(toErrorMessage(loadError, copy.searchError)))
      .finally(() => setLoading(false));
  };

  const changePage = (nextPage: number) => {
    setPage(nextPage);
    setLoading(true);
    setError(undefined);
    void refreshUsers(appliedQuery, nextPage, pageSize, appliedStatus)
      .catch((loadError) => setError(toErrorMessage(loadError, copy.loadError)))
      .finally(() => setLoading(false));
  };

  const changePageSize = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
    setLoading(true);
    setError(undefined);
    void refreshUsers(appliedQuery, 1, nextPageSize, appliedStatus)
      .catch((loadError) => setError(toErrorMessage(loadError, copy.loadError)))
      .finally(() => setLoading(false));
  };

  const columns = useMemo<DataTableColumn<SdkworkIamAdminUser>[]>(() => [
    { id: "identity", header: copy.user, cell: (user) => user.displayName || user.username || user.email || user.userId },
    { id: "username", header: copy.username, cell: (user) => user.username || "-" },
    { id: "email", header: copy.email, cell: (user) => user.email || "-" },
    { id: "phone", header: copy.phone, cell: (user) => user.phone || "-" },
    { id: "registeredAt", header: copy.registeredAt, cell: (user) => user.createdAt ? formatDateTime(user.createdAt) : "-" },
    { id: "lastLoginAt", header: copy.lastLoginAt, cell: (user) => user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "-" },
    { id: "status", header: copy.status, cell: (user) => user.status ? <StatusBadge label={statusLabel(copy.statuses, user.status)} showIcon status={user.status} /> : "-" },
  ], [copy]);

  const submitDraft = () => {
    const password = draft.initialPassword?.trim();
    if (password && (password.length < initialPasswordMinLength || password.length > initialPasswordMaxLength)) {
      setError(copy.invalidInitialPassword);
      return;
    }
    void runAction(async () => {
      if (drawerMode === "edit" && selectedUser) {
        await controller.updateUser(selectedUser.userId, draft);
      } else {
        const created = await controller.createUser(draft);
        try {
          // Persist first, upload second (DRIVE_SPEC section 18.3): flush the
          // parked avatar pick against the freshly created user id, then a
          // follow-up update attaches the returned media resource.
          const values = await avatarFieldRef.current?.uploadPending({ appResourceId: created.userId });
          const avatarValue = values?.[values.length - 1];
          if (avatarValue) {
            await controller.updateUser(created.userId, { avatar: avatarValueToAvatarResource(avatarValue) });
          }
        } catch (uploadError) {
          // The directory record exists; keep the drawer open as its edit
          // view so the retry targets the created user instead of creating a
          // duplicate, and the field's retry affordance stays reachable.
          setSelectedUser(created);
          setDraft(toUserDraft(created));
          setDrawerMode("edit");
          throw uploadError;
        }
      }
      await refreshUsers();
      setDrawerMode(undefined);
    }, drawerMode === "edit" ? copy.editSuccess : copy.createSuccess);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {error ? <StatusNotice tone="danger">{error}</StatusNotice> : null}
        {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <form className="flex min-w-0 items-center gap-2" onSubmit={submitSearch} role="search">
            <label className="relative w-64 shrink-0">
              <span className="sr-only">{copy.searchLabel}</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sdk-color-text-muted)]" />
              <Input
                aria-label={copy.searchLabel}
                className="pl-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.searchPlaceholder}
                type="search"
                value={query}
              />
            </label>
            <FilterSelect
              ariaLabel={copy.status}
              onValueChange={setFilterStatus}
              options={statusFilterOptions(copy)}
              value={filterStatus}
            />
            <Button disabled={loading} type="submit" variant="outline">
              <Search aria-hidden="true" className="h-4 w-4" />
              {copy.search}
            </Button>
          </form>
          {permissions.create ? (
            <Button onClick={openCreateDrawer} type="button">
              <Plus aria-hidden="true" className="h-4 w-4" />
              {copy.create}
            </Button>
          ) : null}
        </div>
        <DataTable
          className="min-h-0 flex-1"
          columns={columns}
          emptyDescription={appliedQuery ? copy.noMatchDescription : copy.emptyDescription}
          emptyTitle={appliedQuery ? copy.noMatchTitle : copy.emptyTitle}
          getRowId={(user) => user.userId}
          loading={loading}
          onRowClick={(user) => void openUserDrawer(user, "view")}
          rowActions={(user) => (
            <div className="flex items-center gap-1">
              <Button aria-label={`${copy.view}: ${user.displayName || user.username || user.userId}`} onClick={() => void openUserDrawer(user, "view")} size="icon" title={copy.view} type="button" variant="ghost">
                <Eye aria-hidden="true" className="h-4 w-4" />
              </Button>
              {permissions.update ? (
                <Button aria-label={`${copy.edit}: ${user.displayName || user.username || user.userId}`} onClick={() => void openUserDrawer(user, "edit")} size="icon" title={copy.edit} type="button" variant="ghost">
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                </Button>
              ) : null}
              {permissions.update && user.status === "active" ? (
                <Button aria-label={`${copy.ban}: ${user.displayName || user.username || user.userId}`} onClick={() => setBanTarget(user)} size="icon" title={copy.ban} type="button" variant="ghost">
                  <Ban aria-hidden="true" className="h-4 w-4" />
                </Button>
              ) : null}
              {permissions.update && user.status === "banned" ? (
                <Button aria-label={`${copy.unban}: ${user.displayName || user.username || user.userId}`} onClick={() => void runAction(async () => {
                  await controller.unbanUser(user.userId);
                  await refreshUsers();
                }, copy.unbanSuccess)} size="icon" title={copy.unban} type="button" variant="ghost">
                  <Unlock aria-hidden="true" className="h-4 w-4" />
                </Button>
              ) : null}
              {permissions.delete ? (
                <Button aria-label={`${copy.delete}: ${user.displayName || user.username || user.userId}`} onClick={() => setDeleteTarget(user)} size="icon" title={copy.delete} type="button" variant="ghost">
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          )}
          slotProps={{
            surface: { className: "flex min-h-0 flex-1 flex-col" },
            viewport: { className: "min-h-0 flex-1" },
            footer: { className: "shrink-0" },
          }}
          stickyHeader
          rows={[...users]}
          footer={(
            <CatalogPagination
              busy={busy}
              copy={{
                next: copy.paginationNext,
                pageSize: copy.paginationPageSize,
                previous: copy.paginationPrevious,
                total: copy.paginationTotal,
              }}
              onPageChange={changePage}
              onPageSizeChange={changePageSize}
              pageInfo={listPageInfo}
            />
          )}
        />
      </div>

      <UserDrawer
        avatarFieldRef={avatarFieldRef}
        busy={busy}
        copy={copy}
        draft={draft}
        driveUploadImageService={driveUploadImageService}
        mode={drawerMode}
        onDraftChange={setDraft}
        onEdit={() => setDrawerMode("edit")}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
        onSubmit={submitDraft}
        onError={setError}
        selectedUserId={selectedUser?.userId}
        updateAllowed={permissions.update}
      />

      <ConfirmDialog
        closeOnConfirm={false}
        confirmLabel={copy.delete}
        confirmLoading={busy}
        description={deleteTarget ? formatMessage(copy.deleteDescription, { name: deleteTarget.displayName || deleteTarget.username || deleteTarget.userId }) : undefined}
        onConfirm={() => {
          if (!deleteTarget) return;
          void runAction(async () => {
            await controller.deleteUser(deleteTarget.userId);
            await refreshUsers();
            setDeleteTarget(undefined);
          }, copy.deleteSuccess);
        }}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleteTarget(undefined);
        }}
        open={Boolean(deleteTarget)}
        title={copy.delete}
        tone="danger"
      />

      <ConfirmDialog
        closeOnConfirm={false}
        confirmLabel={copy.ban}
        confirmLoading={busy}
        description={banTarget ? formatMessage(copy.banDescription, { name: banTarget.displayName || banTarget.username || banTarget.userId }) : undefined}
        onConfirm={() => {
          if (!banTarget) return;
          void runAction(async () => {
            await controller.banUser(banTarget.userId);
            await refreshUsers();
            setBanTarget(undefined);
          }, copy.banSuccess);
        }}
        onOpenChange={(open) => {
          if (!open && !busy) setBanTarget(undefined);
        }}
        open={Boolean(banTarget)}
        title={copy.ban}
        tone="danger"
      />
    </div>
  );
}

function UserDrawer({
  avatarFieldRef,
  busy,
  copy,
  draft,
  driveUploadImageService,
  mode,
  onDraftChange,
  onEdit,
  onError,
  onOpenChange,
  onSubmit,
  selectedUserId,
  updateAllowed,
}: {
  avatarFieldRef: RefObject<DriveUploadImageHandle | null>;
  busy: boolean;
  copy: typeof userAdminMessages["en-US"] | typeof userAdminMessages["zh-CN"];
  draft: SdkworkIamAdminUserDraft;
  driveUploadImageService?: SdkworkIamUserAdminWorkspaceProps["driveUploadImageService"];
  mode?: "create" | "edit" | "view";
  onDraftChange: (draft: SdkworkIamAdminUserDraft) => void;
  onEdit: () => void;
  onError: (message: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  selectedUserId?: string;
  updateAllowed: boolean;
}) {
  const editing = mode === "edit";
  const viewing = mode === "view";
  return (
    <Drawer open={Boolean(mode)} onOpenChange={onOpenChange}>
      <DrawerContent size="md">
        <DrawerHeader>
          <DrawerTitle>{viewing ? copy.detailsTitle : editing ? copy.editTitle : copy.createTitle}</DrawerTitle>
          <DrawerDescription>{viewing ? copy.detailsDescription : editing ? copy.editDescription : copy.createDescription}</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-4">
          {driveUploadImageService ? (
            /*
             * Shared Drive image-upload placeholder for every drawer mode.
             * Edit uploads immediately against the existing user id; create
             * passes no anchor so the pick parks in the field's controller
             * and the workspace flushes it through `avatarFieldRef` after
             * createUser returns (persist first, upload second — DRIVE_SPEC
             * section 18.3). The stored resource maps onto the shared value
             * shape for display.
             */
            <DriveUploadImage
              appResourceId={editing && selectedUserId ? selectedUserId : () => null}
              copy={{
                fileTooLarge: copy.avatarTooLarge,
                fileTooLargeDetail: copy.avatarTooLargeDetail,
                invalidFileType: copy.avatarInvalidType,
                pickImage: copy.avatarUpload,
                removeImage: copy.avatarRemove,
                replaceImage: copy.avatarReplace,
                retryUpload: copy.avatarRetry,
                uploadFailed: copy.avatarUploadFailed,
                uploading: copy.avatarUploading,
              }}
              description={copy.avatarHint}
              label={copy.avatar}
              maxSizeBytes={avatarMaxBytes}
              onChange={(value) => onDraftChange({ ...draft, avatar: value ?? undefined, avatarUrl: "" })}
              onFileRejected={(rejection) => {
                onError(rejection.code === "file-too-large" ? copy.avatarTooLarge : copy.avatarInvalidType);
              }}
              onUploadError={(failure) => onError(toErrorMessage(failure, copy.avatarUploadFailed))}
              readOnly={busy || viewing}
              ref={avatarFieldRef}
              service={driveUploadImageService}
              shape="circle"
              sizePx={72}
              value={avatarResourceToDriveUploadImageValue(draft.avatar)}
            />
          ) : (
            <AvatarUrlField
              copy={copy}
              disabled={viewing}
              onDraftChange={onDraftChange}
              draft={draft}
            />
          )}
          <Field disabled={viewing} label={copy.username} onChange={(username) => onDraftChange({ ...draft, username })} value={draft.username ?? ""} />
          <Field disabled={viewing} label={copy.email} onChange={(email) => onDraftChange({ ...draft, email })} type="email" value={draft.email ?? ""} />
          <Field disabled={viewing} label={copy.displayName} onChange={(displayName) => onDraftChange({ ...draft, displayName })} value={draft.displayName ?? ""} />
          <Field disabled={viewing} label={copy.phone} onChange={(phone) => onDraftChange({ ...draft, phone })} type="tel" value={draft.phone ?? ""} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <GenderSelectField
              copy={copy}
              disabled={viewing}
              onChange={(gender) => onDraftChange({ ...draft, gender })}
              value={draft.gender ?? ""}
            />
            <Field disabled={viewing} label={copy.birthDate} onChange={(birthDate) => onDraftChange({ ...draft, birthDate })} type="date" value={draft.birthDate ?? ""} />
          </div>
          <CountrySelectField
            copy={copy}
            disabled={viewing}
            onChange={(country) => onDraftChange({ ...draft, country })}
            value={draft.country ?? ""}
          />
          {mode !== "view" ? (
            <Field
              hint={copy.initialPasswordHint}
              label={editing ? copy.initialPasswordEdit : copy.initialPassword}
              onChange={(initialPassword) => onDraftChange({ ...draft, initialPassword })}
              placeholder={copy.passwordPlaceholder}
              type="password"
              value={draft.initialPassword ?? ""}
            />
          ) : null}
          {mode !== "create" ? (
            viewing
              ? <StatusReadonlyField label={copy.status} statuses={copy.statuses} value={draft.status ?? ""} />
              : <StatusSelectField copy={copy} onChange={(status) => onDraftChange({ ...draft, status })} value={draft.status ?? ""} />
          ) : null}
        </DrawerBody>
        <DrawerFooter>
          <Button disabled={busy} onClick={() => onOpenChange(false)} type="button" variant="secondary">{viewing ? copy.close : copy.cancel}</Button>
          {viewing && updateAllowed ? (
            <Button onClick={onEdit} type="button">
              <Pencil aria-hidden="true" className="h-4 w-4" />
              {copy.edit}
            </Button>
          ) : null}
          {!viewing ? (
            <Button
              disabled={busy || (mode === "create" && (!draft.username?.trim() || !draft.displayName?.trim()))}
              loading={busy}
              onClick={onSubmit}
              type="button"
            >
              {editing ? copy.save : copy.create}
            </Button>
          ) : null}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function toUserDraft(user: SdkworkIamAdminUser): SdkworkIamAdminUserDraft {
  return {
    avatar: user.avatar,
    avatarUrl: user.avatarUrl ?? "",
    birthDate: user.birthDate ?? "",
    country: user.country ?? "",
    displayName: user.displayName ?? "",
    email: user.email ?? "",
    gender: user.gender ?? "",
    phone: user.phone ?? "",
    status: user.status ?? "",
    username: user.username ?? "",
  };
}

/**
 * Maps the stored avatar media resource onto the shared component's
 * persist-safe value shape. The resource is the media snapshot
 * (`DRIVE_SPEC.md` section 10), so only the stable reference fields travel:
 * the `drive://` (or external) uri, the source tag, and the drive identity
 * block. External URLs pass through so the component renders them directly.
 */
function avatarResourceToDriveUploadImageValue(
  avatar: SdkworkIamAdminUserAvatarResource | undefined,
): DriveUploadImageValue | null {
  if (!avatar) {
    return null;
  }
  const uri = avatar.uri ?? avatar.publicUrl ?? avatar.url;
  if (!uri) {
    return null;
  }
  const drive = avatar.metadata?.drive;
  const metadata =
    drive && drive.nodeId && drive.spaceId
      ? {
          drive: {
            nodeId: drive.nodeId,
            spaceId: drive.spaceId,
            ...(drive.spaceType === undefined ? {} : { spaceType: drive.spaceType }),
          },
        }
      : undefined;
  return {
    uri,
    source: avatar.source === "drive" ? "drive" : "external",
    ...(metadata === undefined ? {} : { metadata }),
  };
}

/**
 * Maps the shared component's persist-safe upload value back onto the avatar
 * media resource the directory record stores (`DRIVE_SPEC.md` section 10):
 * the stable `drive://` uri, the source tag, and the drive identity block —
 * the inverse of `avatarResourceToDriveUploadImageValue`.
 */
function avatarValueToAvatarResource(
  value: DriveUploadImageValue,
): SdkworkIamAdminUserAvatarResource {
  const drive = value.metadata?.drive;
  return {
    fileName: drive?.originalFileName,
    id: drive?.nodeId,
    kind: drive ? "image" : undefined,
    metadata:
      drive && drive.nodeId && drive.spaceId
        ? {
            drive: {
              nodeId: drive.nodeId,
              spaceId: drive.spaceId,
              ...(drive.spaceType === undefined ? {} : { spaceType: drive.spaceType }),
            },
          }
        : undefined,
    mimeType: drive?.contentType,
    sizeBytes: drive?.contentLength,
    source: value.source,
    uri: value.uri,
  };
}

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatMessage(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );
}

function Field({ disabled, hint, label, onChange, placeholder, type = "text", value }: { disabled?: boolean; hint?: string; label: string; onChange: (value: string) => void; placeholder?: string; type?: "date" | "email" | "password" | "tel" | "text" | "url"; value: string }) {
  return (
    <label className="block space-y-2 text-sm">
      <span>{label}</span>
      <Input disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} value={value} />
      {hint ? <span className="block text-xs text-[var(--sdk-color-text-muted)]">{hint}</span> : null}
    </label>
  );
}

/**
 * Degraded avatar field for hosts without the Drive upload capability.
 *
 * A local data-URL read would be a fake upload, so without the injected
 * service the field offers only the plain delivery-URL input — the same
 * degradation contract the organization workspace follows.
 */
function AvatarUrlField({
  copy,
  disabled,
  draft,
  onDraftChange,
}: {
  copy: typeof userAdminMessages["en-US"] | typeof userAdminMessages["zh-CN"];
  disabled?: boolean;
  draft: SdkworkIamAdminUserDraft;
  onDraftChange: (draft: SdkworkIamAdminUserDraft) => void;
}) {
  return (
    <Field
      disabled={disabled}
      label={copy.avatar}
      onChange={(avatarUrl) => onDraftChange({ ...draft, avatarUrl, avatar: undefined })}
      placeholder={copy.avatarPlaceholder}
      type="url"
      value={draft.avatarUrl ?? ""}
    />
  );
}

function GenderSelectField({ copy, disabled, onChange, value }: { copy: typeof userAdminMessages["en-US"] | typeof userAdminMessages["zh-CN"]; disabled?: boolean; onChange: (value: string) => void; value: string }) {
  const options = [
    ["male", copy.genders.male],
    ["female", copy.genders.female],
    ["unknown", copy.genders.unknown],
  ] as const;
  return (
    <label className="block space-y-2 text-sm">
      <span>{copy.gender}</span>
      <Select disabled={disabled} onValueChange={onChange} value={value || undefined}>
        <SelectTrigger><SelectValue placeholder={copy.genderPlaceholder} /></SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  );
}

function CountrySelectField({ copy, disabled, onChange, value }: { copy: typeof userAdminMessages["en-US"] | typeof userAdminMessages["zh-CN"]; disabled?: boolean; onChange: (value: string) => void; value: string }) {
  const chinese = copy.locale === "zh-CN";
  const labelOf = (option: UserAdminCountryOption) => (chinese ? `${option.zh} ${option.en}` : option.en);
  const known = USER_ADMIN_COUNTRY_OPTIONS.some((option) => option.code === value);
  return (
    <label className="block space-y-2 text-sm">
      <span>{copy.country}</span>
      <Select disabled={disabled} onValueChange={onChange} value={value || undefined}>
        <SelectTrigger><SelectValue placeholder={copy.countryPlaceholder} /></SelectTrigger>
        <SelectContent>
          {USER_ADMIN_COUNTRY_OPTIONS.map((option) => (
            <SelectItem key={option.code} value={option.code}>{labelOf(option)}</SelectItem>
          ))}
          {!known && value ? <SelectItem value={value}>{value}</SelectItem> : null}
        </SelectContent>
      </Select>
    </label>
  );
}

function StatusReadonlyField({ label, statuses, value }: { label: string; statuses: { active: string; banned: string; disabled: string; locked: string; unknown: string }; value: string }) {
  return (
    <label className="block space-y-2 text-sm">
      <span>{label}</span>
      <div className="border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-subtle)] px-3 py-2">
        {statusLabel(statuses, value)}
      </div>
    </label>
  );
}

function StatusSelectField({ copy, onChange, value }: { copy: typeof userAdminMessages["en-US"] | typeof userAdminMessages["zh-CN"]; onChange: (value: string) => void; value: string }) {
  const normalized = value.trim().toLowerCase();
  const options = [
    ["active", copy.statuses.active],
    ["banned", copy.statuses.banned],
    ["disabled", copy.statuses.disabled],
    ["locked", copy.statuses.locked],
  ] as const;
  const currentUnknown = options.some(([optionValue]) => optionValue === normalized) ? undefined : value;
  return (
    <label className="block space-y-2 text-sm">
      <span>{copy.status}</span>
      <Select onValueChange={onChange} value={value}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}
          {currentUnknown ? <SelectItem key={currentUnknown} value={currentUnknown}>{statusLabel(copy.statuses, currentUnknown)}</SelectItem> : null}
        </SelectContent>
      </Select>
    </label>
  );
}

function statusFilterOptions(copy: typeof userAdminMessages["en-US"] | typeof userAdminMessages["zh-CN"]): Array<[string, string]> {
  return [
    ["all", copy.statusAll],
    ["active", copy.statuses.active],
    ["banned", copy.statuses.banned],
    ["disabled", copy.statuses.disabled],
    ["locked", copy.statuses.locked],
  ];
}

function FilterSelect({ ariaLabel, onValueChange, options, value }: { ariaLabel: string; onValueChange: (value: string) => void; options: Array<[string, string]>; value: string }) {
  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger aria-label={ariaLabel} className="w-36 shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([optionValue, label]) => <SelectItem key={optionValue} value={optionValue}>{label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function statusLabel(statuses: { active: string; banned: string; disabled: string; locked: string; unknown: string }, value: string) {
  const normalized = value.trim().toLowerCase();
  return statuses[normalized as keyof typeof statuses] ?? statuses.unknown;
}
