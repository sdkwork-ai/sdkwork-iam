import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { AppWindow, Boxes, Building2, Image as ImageIcon, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { DriveUploadImage, type DriveUploadImageHandle } from "sdkwork-drive-pc-upload-image";
import {
  formatDriveUploadImageBytes,
  type DriveUploadImageService,
  type DriveUploadImageValue,
} from "@sdkwork/drive-upload-image-core";
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
  IconButton,
  Input,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  StatusNotice,
  Textarea,
} from "@sdkwork/ui-pc-react";

import { TenantApplicationsPanel } from "../components/TenantApplicationsPanel";
import { useSdkworkIamTenantAdminMessages } from "../i18n";
import type { SdkworkIamTenantAdminMessages } from "../types/tenant-admin-messages";
import type {
  SdkworkIamTenant,
  SdkworkIamTenantAdminWorkspaceProps,
  SdkworkIamTenantDraft,
  SdkworkIamTenantLogoMediaResource,
  SdkworkIamTenantMember,
  SdkworkIamTenantMemberDraft,
} from "../types/tenant-admin-types";

type TenantDetailTab = "applications" | "members";
type TenantDraftField = "code" | "contactEmail" | "contactPhone" | "name";

/// Accepted logo image types; mirrors the catalog image upload declaration.
const TENANT_LOGO_ACCEPT = ["image/png", "image/jpeg", "image/webp"] as const;
/// Keep aligned with the `admin-tenant-logo` upload slot ceiling: the backend
/// persists only the media-resource snapshot, so the image may follow the
/// standard admin-asset image ceiling.
const TENANT_LOGO_MAX_BYTES = 2 * 1024 * 1024;
/// Tenant codes are the unique business identifier and drive isolation and
/// audit, so the drawer keeps them URL-safe.
const TENANT_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/u;
const TENANT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const TENANT_PHONE_PATTERN = /^[+()0-9][0-9+()\s-]{3,31}$/u;
const TENANT_DESCRIPTION_MAX_LENGTH = 200;

const emptyTenantDraft = (): SdkworkIamTenantDraft => ({ code: "", name: "" });
const emptyMemberDraft = (): SdkworkIamTenantMemberDraft => ({ roleCode: "", userId: "" });

export function SdkworkIamTenantAdminWorkspace({
  controller,
  driveUploadImageService,
  onOpenApplications,
  permissions = {
    members: { create: true, delete: true, read: true, update: true },
    tenants: { create: true, delete: true, update: true },
  },
}: SdkworkIamTenantAdminWorkspaceProps) {
  const messages = useSdkworkIamTenantAdminMessages();
  const initialState = controller.getState();
  const [tenants, setTenants] = useState(initialState.tenants);
  const [members, setMembers] = useState(initialState.members);
  const [listPageInfo, setListPageInfo] = useState(initialState.listPageInfo);
  const [selectedTenant, setSelectedTenant] = useState<SdkworkIamTenant>();
  const [activeTab, setActiveTab] = useState<TenantDetailTab>("applications");
  const [selectedMember, setSelectedMember] = useState<SdkworkIamTenantMember>();
  const [tenantDraft, setTenantDraft] = useState<SdkworkIamTenantDraft>(emptyTenantDraft);
  const [memberDraft, setMemberDraft] = useState<SdkworkIamTenantMemberDraft>(emptyMemberDraft);
  const [tenantDrawerMode, setTenantDrawerMode] = useState<"create" | "edit">();
  const [memberDrawerMode, setMemberDrawerMode] = useState<"create" | "edit">();
  const [deleteTenantTarget, setDeleteTenantTarget] = useState<SdkworkIamTenant>();
  const [removeMemberTarget, setRemoveMemberTarget] = useState<SdkworkIamTenantMember>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  // The shared upload field owns the picked file in its own controller
  // (persist-first, DRIVE_SPEC.md section 18.3). Create mode parks the pick
  // with no anchor and this handle flushes it against the freshly created
  // tenant id; closing the drawer destroys the controller and with it an
  // unsubmitted pick.
  const logoFieldRef = useRef<DriveUploadImageHandle | null>(null);
  // True while the shared logo field is uploading; saving is blocked so the
  // persisted record cannot race an in-flight logo upload.
  const [logoUploading, setLogoUploading] = useState(false);
  // Required-field errors appear after the first submit attempt, then stay in
  // sync with the draft.
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Detail header display URL for a Drive-backed logo snapshot, resolved
  // through the injected bounded preview reader. Presentation-only state and
  // never persisted.
  const [resolvedLogoUrl, setResolvedLogoUrl] = useState<string>();
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [tenantPage, setTenantPage] = useState(1);
  const [tenantPageSize, setTenantPageSize] = useState(20);
  const [memberPage, setMemberPage] = useState(1);
  const [memberPageSize, setMemberPageSize] = useState(20);

  const syncState = () => setListPageInfo(controller.getState().listPageInfo);

  const refreshTenants = async (query = appliedSearchQuery, nextPage = tenantPage, nextPageSize = tenantPageSize) => {
    const params: Record<string, unknown> = { page: nextPage, page_size: nextPageSize };
    if (query) params.q = query;
    const items = await controller.listTenants(params);
    setTenants(items);
    syncState();
    return items;
  };

  const refreshMembers = async (tenantId: string, nextPage = memberPage, nextPageSize = memberPageSize) => {
    const params: Record<string, unknown> = { page: nextPage, page_size: nextPageSize };
    const items = await controller.listTenantMembers(tenantId, params);
    setMembers(items);
    syncState();
    return items;
  };

  useEffect(() => {
    setLoading(true);
    void refreshTenants()
      .catch((loadError) => setError(toErrorMessage(loadError, messages.tenants.notices.loadError)))
      .finally(() => setLoading(false));
  }, [controller]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    setAppliedSearchQuery(query);
    setTenantPage(1);
    setLoading(true);
    setError(undefined);
    void refreshTenants(query, 1, tenantPageSize)
      .catch((loadError) => setError(toErrorMessage(loadError, messages.tenants.notices.loadError)))
      .finally(() => setLoading(false));
  };

  const changeTenantPage = (nextPage: number) => {
    setTenantPage(nextPage);
    setLoading(true);
    setError(undefined);
    void refreshTenants(appliedSearchQuery, nextPage)
      .catch((loadError) => setError(toErrorMessage(loadError, messages.tenants.notices.loadError)))
      .finally(() => setLoading(false));
  };

  const changeTenantPageSize = (nextPageSize: number) => {
    setTenantPageSize(nextPageSize);
    setTenantPage(1);
    setLoading(true);
    setError(undefined);
    void refreshTenants(appliedSearchQuery, 1, nextPageSize)
      .catch((loadError) => setError(toErrorMessage(loadError, messages.tenants.notices.loadError)))
      .finally(() => setLoading(false));
  };

  const changeMemberPage = (nextPage: number) => {
    if (!selectedTenant) return;
    setMemberPage(nextPage);
    setLoading(true);
    setError(undefined);
    void refreshMembers(selectedTenant.tenantId, nextPage)
      .catch((loadError) => setError(toErrorMessage(loadError, messages.members.notices.loadError)))
      .finally(() => setLoading(false));
  };

  const changeMemberPageSize = (nextPageSize: number) => {
    if (!selectedTenant) return;
    setMemberPageSize(nextPageSize);
    setMemberPage(1);
    setLoading(true);
    setError(undefined);
    void refreshMembers(selectedTenant.tenantId, 1, nextPageSize)
      .catch((loadError) => setError(toErrorMessage(loadError, messages.members.notices.loadError)))
      .finally(() => setLoading(false));
  };

  const runAction = async (action: () => Promise<void>, successMessage: string, fallbackError: string) => {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await action();
      setNotice(successMessage);
    } catch (actionError) {
      setError(toErrorMessage(actionError, fallbackError));
    } finally {
      setBusy(false);
    }
  };

  // Drive-backed tenant logos have no delivery URL; the detail header shows
  // the bounded preview the injected upload service resolves. External logos
  // keep their own delivery URL and skip this entirely.
  const selectedLogo = selectedTenant?.logo;
  const selectedLogoUrl = selectedTenant?.logoUrl || undefined;
  useEffect(() => {
    if (selectedLogoUrl || !selectedLogo || !driveUploadImageService) {
      setResolvedLogoUrl(undefined);
      return;
    }
    const uri = selectedLogo.uri ?? selectedLogo.publicUrl ?? selectedLogo.url;
    if (!uri) {
      setResolvedLogoUrl(undefined);
      return;
    }
    let cancelled = false;
    void driveUploadImageService.resolvePreview({ uri })
      .then((url) => {
        if (!cancelled) setResolvedLogoUrl(url ?? undefined);
      })
      .catch(() => {
        if (!cancelled) setResolvedLogoUrl(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [driveUploadImageService, selectedLogo, selectedLogoUrl]);

  const selectTenant = async (tenant: SdkworkIamTenant) => {
    setError(undefined);
    try {
      const resolved = await controller.selectTenant(tenant.tenantId) ?? tenant;
      setSelectedTenant(resolved);
      setTenantDraft(tenantToDraft(resolved));
      setActiveTab("applications");
      setMembers([]);
    } catch (loadError) {
      setError(toErrorMessage(loadError, messages.tenants.notices.loadError));
    }
  };

  const openTenantCreator = () => {
    setSelectedTenant(undefined);
    setTenantDraft(emptyTenantDraft());
    setLogoUploading(false);
    setSubmitAttempted(false);
    setTenantDrawerMode("create");
  };

  const openTenantEditor = (tenant: SdkworkIamTenant) => {
    setSelectedTenant(tenant);
    setTenantDraft(tenantToDraft(tenant));
    setLogoUploading(false);
    setSubmitAttempted(false);
    setTenantDrawerMode("edit");
  };

  /**
   * Submits the tenant drawer.
   *
   * Create runs persist-first (`DRIVE_SPEC.md` section 18.3): the tenant is
   * created, then the shared upload field flushes its parked pick against the
   * new id and a follow-up update attaches the returned media resource. When
   * the attach fails the drawer flips to edit mode for the created record so
   * the retry targets that entity instead of creating a duplicate, and the
   * failure is reported without a success notice.
   */
  const submitTenant = async () => {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      if (tenantDrawerMode === "edit" && selectedTenant) {
        const updated = await controller.updateTenant(selectedTenant.tenantId, tenantDraft);
        setSelectedTenant(updated);
        await refreshTenants();
        setNotice(messages.tenants.notices.updateSuccess);
      } else {
        const created = await controller.createTenant(tenantDraft);
        let attached: SdkworkIamTenant = created;
        try {
          const values = await logoFieldRef.current?.uploadPending({ appResourceId: created.tenantId });
          const logoValue = values?.[values.length - 1];
          if (logoValue) {
            attached = await controller.updateTenant(created.tenantId, {
              logo: driveUploadImageValueToTenantLogo(logoValue),
            });
          }
        } catch {
          setSelectedTenant(created);
          setTenantDrawerMode("edit");
          setSubmitAttempted(false);
          await refreshTenants();
          setError(messages.tenants.notices.logoAttachFailed);
          return;
        }
        setSelectedTenant(attached);
        setActiveTab("applications");
        await refreshTenants();
        setNotice(messages.tenants.notices.createSuccess);
      }
      setTenantDrawerMode(undefined);
    } catch (actionError) {
      setError(toErrorMessage(actionError, messages.common.operationError));
    } finally {
      setBusy(false);
    }
  };

  const switchDetailTab = (value: string) => {
    if (!selectedTenant || (value !== "applications" && value !== "members")) return;
    setActiveTab(value);
    if (value === "members") {
      setMemberPage(1);
      setLoading(true);
      void refreshMembers(selectedTenant.tenantId, 1, memberPageSize)
        .catch((loadError) => setError(toErrorMessage(loadError, messages.members.notices.loadError)))
        .finally(() => setLoading(false));
    }
  };

  const tenantColumns = useMemo<DataTableColumn<SdkworkIamTenant>[]>(() => [
    { id: "name", header: messages.tenants.table.name, cell: (tenant) => tenant.name },
    { id: "code", header: messages.tenants.table.code, cell: (tenant) => tenant.code || "-" },
    { id: "industry", header: messages.tenants.table.industry, cell: (tenant) => tenant.industryCategory || "-" },
    { id: "tenantId", header: messages.tenants.table.tenantId, cell: (tenant) => <code className="text-xs">{tenant.tenantId}</code> },
    {
      id: "status",
      header: messages.tenants.table.status,
      cell: (tenant) => tenant.status
        ? <StatusBadge label={formatEnumLabel(messages.tenants.statuses, tenant.status)} showIcon status={tenant.status} variant={tenantStatusVariant(tenant.status)} />
        : "-",
    },
  ], [messages]);

  const memberColumns = useMemo<DataTableColumn<SdkworkIamTenantMember>[]>(() => [
    { id: "member", header: messages.members.table.member, cell: (member) => member.displayName || member.username || member.email || member.userId },
    { id: "userId", header: messages.members.table.userId, cell: (member) => <code className="text-xs">{member.userId}</code> },
    { id: "roleCode", header: messages.members.table.role, cell: (member) => member.roleCode || "-" },
    {
      id: "status",
      header: messages.members.table.status,
      cell: (member) => member.status
        ? <StatusBadge label={formatEnumLabel(messages.members.statuses, member.status)} status={member.status} />
        : "-",
    },
  ], [messages]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {error ? <StatusNotice tone="danger">{error}</StatusNotice> : null}
        {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <form className="flex min-w-0 items-center gap-2" onSubmit={submitSearch} role="search">
            <label className="relative w-64 shrink-0">
              <span className="sr-only">{messages.tenants.searchLabel}</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sdk-color-text-muted)]" />
              <Input
                aria-label={messages.tenants.searchLabel}
                className="pl-9"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={messages.tenants.searchPlaceholder}
                value={searchQuery}
              />
            </label>
            <Button disabled={loading} type="submit" variant="outline">
              <Search className="h-4 w-4" />
              {messages.tenants.applySearch}
            </Button>
          </form>
          {permissions.tenants.create ? (
            <Button onClick={openTenantCreator} type="button">
              <Plus className="h-4 w-4" />
              {messages.tenants.create}
            </Button>
          ) : null}
        </div>

        <DataTable
          className={selectedTenant ? "max-h-[40vh]" : "min-h-0 flex-1"}
          columns={tenantColumns}
          emptyDescription={messages.tenants.emptyDescription}
          emptyTitle={messages.tenants.emptyTitle}
          footer={(
            <CatalogPagination
              busy={busy}
              copy={{
                next: messages.pagination.next,
                pageSize: messages.pagination.pageSize,
                previous: messages.pagination.previous,
                total: messages.pagination.total,
              }}
              onPageChange={changeTenantPage}
              onPageSizeChange={changeTenantPageSize}
              pageInfo={listPageInfo?.tenants}
            />
          )}
          getRowId={(tenant) => tenant.tenantId}
          loading={loading && !selectedTenant}
          onRowClick={(tenant) => void selectTenant(tenant)}
          rowActionsLabel={messages.tenants.table.actions}
          rowActions={(tenant) => (
            <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
              {onOpenApplications ? (
                <Button onClick={() => onOpenApplications(tenant)} size="sm" type="button" variant="outline">
                  <Boxes className="h-3.5 w-3.5" />
                  {messages.tenants.applications}
                </Button>
              ) : null}
              <Button onClick={() => void selectTenant(tenant)} size="sm" type="button" variant="outline">
                {messages.tenants.manage}
              </Button>
              {permissions.tenants.update ? (
                <IconButton aria-label={messages.tenants.edit} onClick={() => openTenantEditor(tenant)} title={messages.tenants.edit} variant="ghost">
                  <Pencil className="h-3.5 w-3.5" />
                </IconButton>
              ) : null}
              {permissions.tenants.delete ? (
                <IconButton aria-label={messages.tenants.delete} onClick={() => setDeleteTenantTarget(tenant)} title={messages.tenants.delete} variant="ghost">
                  <Trash2 className="h-3.5 w-3.5 text-[var(--sdk-color-state-danger)]" />
                </IconButton>
              ) : null}
            </div>
          )}
          rows={[...tenants]}
          slotProps={{
            surface: { className: "flex min-h-0 flex-1 flex-col" },
            viewport: { className: "min-h-0 flex-1" },
            footer: { className: "shrink-0" },
          }}
          stickyHeader
        />

        {selectedTenant ? (
          <section className="flex min-h-0 flex-1 flex-col border-t border-[var(--sdk-color-border-subtle)] pt-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                {selectedTenant.logoUrl || resolvedLogoUrl ? (
                  <img
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] object-cover"
                    src={selectedTenant.logoUrl || resolvedLogoUrl}
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--sdk-radius-control)] bg-[var(--sdk-color-surface-panel-muted)] text-[var(--sdk-color-text-secondary)]">
                    <Building2 className="h-5 w-5" />
                  </span>
                )}
                <span className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-[var(--sdk-color-text-primary)]">
                    {template(messages.tenants.selectedTitleTemplate, { name: selectedTenant.name })}
                  </h2>
                  <p className="truncate text-sm text-[var(--sdk-color-text-muted)]">
                    {template(messages.tenants.selectedDescriptionTemplate, { id: selectedTenant.tenantId })}
                  </p>
                </span>
              </div>
              <SegmentedControl
                aria-label={messages.tenants.manage}
                className="w-full lg:w-auto"
                fullWidth={false}
                onValueChange={switchDetailTab}
                options={[
                  { icon: <AppWindow className="h-4 w-4" />, label: messages.tabs.applications, value: "applications" },
                  ...(permissions.members.read
                    ? [{ icon: <Users className="h-4 w-4" />, label: messages.tabs.members, value: "members" }]
                    : []),
                ]}
                value={activeTab}
              />
            </div>

            <div className="mt-5 flex min-h-0 flex-1 flex-col">
              {activeTab === "applications"
                ? <TenantApplicationsPanel controller={controller} tenant={selectedTenant} />
                : (
                  <DataTable
                    className="min-h-0 flex-1"
                    columns={memberColumns}
                    emptyDescription={messages.members.emptyDescription}
                    emptyTitle={messages.members.emptyTitle}
                    footer={(
                      <CatalogPagination
                        busy={busy}
                        copy={{
                          next: messages.pagination.next,
                          pageSize: messages.pagination.pageSize,
                          previous: messages.pagination.previous,
                          total: messages.pagination.total,
                        }}
                        onPageChange={changeMemberPage}
                        onPageSizeChange={changeMemberPageSize}
                        pageInfo={listPageInfo?.members}
                      />
                    )}
                    getRowId={(member) => member.id}
                    loading={loading}
                    onRowClick={permissions.members.update ? (member) => {
                      setSelectedMember(member);
                      setMemberDraft({ roleCode: member.roleCode ?? "", userId: member.userId });
                      setMemberDrawerMode("edit");
                    } : undefined}
                    rowActions={permissions.members.update || permissions.members.delete ? (member) => (
                      <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                        {permissions.members.update ? (
                          <IconButton
                            aria-label={messages.common.edit}
                            onClick={() => {
                              setSelectedMember(member);
                              setMemberDraft({ roleCode: member.roleCode ?? "", userId: member.userId });
                              setMemberDrawerMode("edit");
                            }}
                            title={messages.common.edit}
                            variant="outline"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </IconButton>
                        ) : null}
                        {permissions.members.delete ? (
                          <Button onClick={() => setRemoveMemberTarget(member)} size="sm" type="button" variant="danger">
                            {messages.members.remove}
                          </Button>
                        ) : null}
                      </div>
                    ) : undefined}
                    rows={[...members]}
                    slotProps={{
                      surface: { className: "flex min-h-0 flex-1 flex-col" },
                      viewport: { className: "min-h-0 flex-1" },
                      footer: { className: "shrink-0" },
                    }}
                    stickyHeader
                    title={template(messages.members.titleTemplate, { name: selectedTenant.name })}
                    toolbar={permissions.members.create ? (
                      <Button onClick={() => {
                        setSelectedMember(undefined);
                        setMemberDraft(emptyMemberDraft());
                        setMemberDrawerMode("create");
                      }} type="button">
                        <Plus className="h-4 w-4" />
                        {messages.members.add}
                      </Button>
                    ) : undefined}
                  />
                )}
            </div>
          </section>
        ) : null}
      </div>

      <TenantDrawer
        busy={busy}
        draft={tenantDraft}
        driveUploadImageService={driveUploadImageService}
        logoFieldRef={logoFieldRef}
        logoUploading={logoUploading}
        mode={tenantDrawerMode}
        onClose={() => {
          setTenantDrawerMode(undefined);
          setLogoUploading(false);
        }}
        onDraftChange={setTenantDraft}
        onInvalidLogo={(message) => setError(message)}
        onLogoUploadingChange={setLogoUploading}
        onSubmit={() => void submitTenant()}
        onSubmitted={() => setSubmitAttempted(true)}
        statuses={messages.tenants.statuses}
        submitAttempted={submitAttempted}
        tenantId={tenantDrawerMode === "edit" ? selectedTenant?.tenantId : undefined}
      />

      <MemberDrawer
        busy={busy}
        draft={memberDraft}
        mode={memberDrawerMode}
        onDraftChange={setMemberDraft}
        onOpenChange={(open) => { if (!open) setMemberDrawerMode(undefined); }}
        onSubmit={() => {
          if (!selectedTenant) return;
          void runAction(async () => {
            if (memberDrawerMode === "edit" && selectedMember) {
              await controller.updateTenantMember(selectedTenant.tenantId, selectedMember.userId, memberDraft);
            } else {
              await controller.createTenantMember(selectedTenant.tenantId, memberDraft);
            }
            await refreshMembers(selectedTenant.tenantId);
            setMemberDrawerMode(undefined);
          }, memberDrawerMode === "edit" ? messages.members.notices.updateSuccess : messages.members.notices.addSuccess, messages.members.notices.loadError);
        }}
      />

      <ConfirmDialog
        closeOnConfirm={false}
        confirmLabel={messages.tenants.delete}
        confirmLoading={busy}
        description={deleteTenantTarget ? template(messages.tenants.deleteDescriptionTemplate, { name: deleteTenantTarget.name }) : undefined}
        onConfirm={() => {
          if (!deleteTenantTarget) return;
          void runAction(async () => {
            await controller.deleteTenant(deleteTenantTarget.tenantId);
            if (selectedTenant?.tenantId === deleteTenantTarget.tenantId) {
              setSelectedTenant(undefined);
              setMembers([]);
            }
            await refreshTenants();
            setDeleteTenantTarget(undefined);
          }, messages.tenants.notices.deleteSuccess, messages.tenants.notices.loadError);
        }}
        onOpenChange={(open) => { if (!open && !busy) setDeleteTenantTarget(undefined); }}
        open={Boolean(deleteTenantTarget)}
        title={messages.tenants.deleteTitle}
        tone="danger"
      />

      <ConfirmDialog
        closeOnConfirm={false}
        confirmLabel={messages.members.remove}
        confirmLoading={busy}
        description={removeMemberTarget ? template(messages.members.removeDescriptionTemplate, {
          name: removeMemberTarget.displayName || removeMemberTarget.username || removeMemberTarget.userId,
        }) : undefined}
        onConfirm={() => {
          if (!selectedTenant || !removeMemberTarget) return;
          void runAction(async () => {
            await controller.removeTenantMember(selectedTenant.tenantId, removeMemberTarget.userId);
            await refreshMembers(selectedTenant.tenantId);
            setRemoveMemberTarget(undefined);
          }, messages.members.notices.removeSuccess, messages.members.notices.loadError);
        }}
        onOpenChange={(open) => { if (!open && !busy) setRemoveMemberTarget(undefined); }}
        open={Boolean(removeMemberTarget)}
        title={messages.members.removeTitle}
        tone="danger"
      />
    </div>
  );
}

/**
 * The tenant create/edit drawer.
 *
 * Layout follows the backend-admin form convention: identity first (logo,
 * name, code, lifecycle status), then profile attributes, then contact
 * details. Required fields validate on the first submit attempt and stay in
 * sync afterwards. The logo is one shared placeholder upload field: there is
 * no separate pick button and no image-URL input.
 */
function TenantDrawer({
  busy,
  draft,
  driveUploadImageService,
  logoFieldRef,
  logoUploading,
  mode,
  onClose,
  onDraftChange,
  onInvalidLogo,
  onLogoUploadingChange,
  onSubmit,
  onSubmitted,
  statuses,
  submitAttempted,
  tenantId,
}: {
  busy: boolean;
  draft: SdkworkIamTenantDraft;
  driveUploadImageService?: DriveUploadImageService;
  logoFieldRef: RefObject<DriveUploadImageHandle | null>;
  logoUploading: boolean;
  mode?: "create" | "edit";
  onClose: () => void;
  onDraftChange: (draft: SdkworkIamTenantDraft) => void;
  onInvalidLogo: (message: string) => void;
  onLogoUploadingChange: (uploading: boolean) => void;
  onSubmit: () => void;
  onSubmitted: () => void;
  statuses: SdkworkIamTenantAdminMessages["tenants"]["statuses"];
  submitAttempted: boolean;
  tenantId?: string;
}) {
  const messages = useSdkworkIamTenantAdminMessages();
  const copy = messages.tenants.drawer;
  const editing = mode === "edit";
  const errors = validateTenantDraft(draft, copy);
  const errorFor = (field: TenantDraftField) => (submitAttempted ? errors[field] : undefined);
  const logoHint = template(copy.logoHintTemplate, {
    max: formatDriveUploadImageBytes(TENANT_LOGO_MAX_BYTES),
  });

  const submit = () => {
    onSubmitted();
    if (Object.keys(errors).length > 0) return;
    onSubmit();
  };

  return (
    <Drawer onOpenChange={(open) => { if (!open) onClose(); }} open={Boolean(mode)}>
      <DrawerContent size="lg">
        <DrawerHeader>
          <DrawerTitle>{editing ? copy.editTitle : copy.createTitle}</DrawerTitle>
          <DrawerDescription>{editing ? copy.editDescription : copy.createDescription}</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-7">
          <DrawerSection description={copy.basicDescription} title={copy.basicSection}>
            <TenantLogoField
              copy={copy}
              draft={draft}
              driveUploadImageService={driveUploadImageService}
              editing={editing}
              hint={logoHint}
              logoFieldRef={logoFieldRef}
              onDraftChange={onDraftChange}
              onInvalid={onInvalidLogo}
              onUploadingChange={onLogoUploadingChange}
              tenantId={tenantId}
            />
            <Field
              error={errorFor("name")}
              label={copy.name}
              onChange={(name) => onDraftChange({ ...draft, name })}
              placeholder={copy.namePlaceholder}
              required
              value={draft.name}
            />
            <Field
              error={errorFor("code")}
              hint={copy.codeHint}
              label={copy.code}
              onChange={(code) => onDraftChange({ ...draft, code })}
              placeholder={copy.codePlaceholder}
              required
              value={draft.code ?? ""}
            />
            {editing ? (
              <TenantStatusField
                label={copy.status}
                onChange={(status) => onDraftChange({ ...draft, status })}
                statuses={statuses}
                value={draft.status ?? ""}
              />
            ) : null}
          </DrawerSection>

          <DrawerSection description={copy.profileDescription} title={copy.profileSection}>
            <Field
              label={copy.industry}
              onChange={(industryCategory) => onDraftChange({ ...draft, industryCategory })}
              placeholder={copy.industryPlaceholder}
              value={draft.industryCategory ?? ""}
            />
            <TextareaField
              counterTemplate={copy.descriptionCountTemplate}
              label={copy.description}
              maxLength={TENANT_DESCRIPTION_MAX_LENGTH}
              onChange={(description) => onDraftChange({ ...draft, description })}
              placeholder={copy.descriptionPlaceholder}
              value={draft.description ?? ""}
            />
          </DrawerSection>

          <DrawerSection title={copy.contactSection}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                error={errorFor("contactPhone")}
                label={copy.contactPhone}
                onChange={(contactPhone) => onDraftChange({ ...draft, contactPhone })}
                placeholder={copy.contactPhonePlaceholder}
                type="tel"
                value={draft.contactPhone ?? ""}
              />
              <Field
                error={errorFor("contactEmail")}
                label={copy.contactEmail}
                onChange={(contactEmail) => onDraftChange({ ...draft, contactEmail })}
                placeholder={copy.contactEmailPlaceholder}
                type="email"
                value={draft.contactEmail ?? ""}
              />
            </div>
            <Field
              label={copy.address}
              onChange={(address) => onDraftChange({ ...draft, address })}
              placeholder={copy.addressPlaceholder}
              value={draft.address ?? ""}
            />
          </DrawerSection>
        </DrawerBody>
        <DrawerFooter>
          <Button disabled={busy} onClick={onClose} type="button" variant="secondary">{messages.common.cancel}</Button>
          <Button disabled={busy || logoUploading} loading={busy} onClick={submit} type="button">
            {editing ? messages.common.save : messages.common.create}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/** A titled group inside the drawer body; keeps long forms scannable. */
function DrawerSection({ children, description, title }: { children: ReactNode; description?: string; title: string }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1 border-b border-[var(--sdk-color-border-subtle)] pb-2">
        <h3 className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">{title}</h3>
        {description ? <p className="text-xs text-[var(--sdk-color-text-muted)]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <span className="flex items-center gap-1 font-medium text-[var(--sdk-color-text-primary)]">
      {label}
      {required ? <span aria-hidden="true" className="text-[var(--sdk-color-state-danger)]">*</span> : null}
    </span>
  );
}

function FieldSupport({ error, hint }: { error?: string; hint?: string }) {
  if (error) {
    return <span className="block text-xs text-[var(--sdk-color-state-danger)]" role="alert">{error}</span>;
  }
  if (hint) {
    return <span className="block text-xs text-[var(--sdk-color-text-muted)]">{hint}</span>;
  }
  return null;
}

function Field({ disabled, error, hint, label, onChange, placeholder, required, type, value }: {
  disabled?: boolean;
  error?: string;
  hint?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "email" | "tel" | "text" | "url";
  value: string;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <FieldLabel label={label} required={required} />
      <Input
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      <FieldSupport error={error} hint={hint} />
    </label>
  );
}

function TextareaField({ counterTemplate, label, maxLength, onChange, placeholder, value }: {
  counterTemplate: string;
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="flex items-center justify-between gap-3">
        <FieldLabel label={label} />
        <span className="text-xs tabular-nums text-[var(--sdk-color-text-muted)]">
          {template(counterTemplate, { count: String(value.length), max: String(maxLength) })}
        </span>
      </span>
      <Textarea
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        value={value}
      />
    </label>
  );
}

/**
 * The tenant logo field.
 *
 * Every mode renders the shared `DriveUploadImage` placeholder — the dashed
 * pick area is the upload trigger, so the drawer needs no separate button.
 * Edit uploads immediately against the tenant id; create passes a resolver
 * that returns `null`, so the pick parks in the field's controller and the
 * workspace flushes it after the tenant exists (`DRIVE_SPEC.md` section 18.3).
 * Previews of stored Drive snapshots go through the same service's bounded
 * reader.
 */
function TenantLogoField({
  copy,
  draft,
  driveUploadImageService,
  editing,
  hint,
  logoFieldRef,
  onDraftChange,
  onInvalid,
  onUploadingChange,
  tenantId,
}: {
  copy: SdkworkIamTenantAdminMessages["tenants"]["drawer"];
  draft: SdkworkIamTenantDraft;
  driveUploadImageService?: DriveUploadImageService;
  editing: boolean;
  hint: string;
  logoFieldRef: RefObject<DriveUploadImageHandle | null>;
  onDraftChange: (draft: SdkworkIamTenantDraft) => void;
  onInvalid: (message: string) => void;
  onUploadingChange: (uploading: boolean) => void;
  tenantId?: string;
}) {
  if (!driveUploadImageService) {
    return (
      <div className="space-y-1.5 text-sm">
        <FieldLabel label={copy.logo} />
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[var(--sdk-radius-control)] border-2 border-dashed border-[var(--sdk-color-border-default)] text-[var(--sdk-color-text-muted)]">
            <ImageIcon className="h-6 w-6" />
          </span>
          <span className="max-w-72 pt-1 text-xs leading-5 text-[var(--sdk-color-text-muted)]">{copy.logoUnavailable}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 text-sm">
      <FieldLabel label={copy.logo} />
      <div className="flex items-start gap-4">
        <DriveUploadImage
          accept={[...TENANT_LOGO_ACCEPT]}
          alt={copy.logo}
          appResourceId={editing && tenantId ? tenantId : () => null}
          className="shrink-0"
          copy={{
            fileTooLarge: copy.logoTooLarge,
            fileTooLargeDetail: copy.logoTooLargeTemplate,
            invalidFileType: copy.logoInvalidType,
            pickImage: copy.logoUpload,
            removeImage: copy.logoRemove,
            replaceImage: copy.logoReplace,
            retryUpload: copy.logoRetry,
            uploadFailed: copy.logoReadError,
            uploading: copy.logoUploading,
          }}
          maxSizeBytes={TENANT_LOGO_MAX_BYTES}
          onChange={(next) => onDraftChange({
            ...draft,
            logo: next ? driveUploadImageValueToTenantLogo(next) : undefined,
            logoUrl: "",
          })}
          onFileRejected={(rejection) => onInvalid(rejection.code === "file-too-large" ? copy.logoTooLarge : copy.logoInvalidType)}
          onUploadError={() => onInvalid(copy.logoReadError)}
          onUploadingChange={onUploadingChange}
          ref={logoFieldRef}
          service={driveUploadImageService}
          shape="rounded"
          sizePx={96}
          value={tenantLogoResourceToDriveUploadImageValue(draft.logo)}
        />
        <p className="min-w-0 flex-1 pt-1 text-xs leading-5 text-[var(--sdk-color-text-muted)]">{hint}</p>
      </div>
    </div>
  );
}

function MemberDrawer({ busy, draft, mode, onDraftChange, onOpenChange, onSubmit }: { busy: boolean; draft: SdkworkIamTenantMemberDraft; mode?: "create" | "edit"; onDraftChange: (draft: SdkworkIamTenantMemberDraft) => void; onOpenChange: (open: boolean) => void; onSubmit: () => void }) {
  const messages = useSdkworkIamTenantAdminMessages();
  const editing = mode === "edit";
  return (
    <Drawer onOpenChange={onOpenChange} open={Boolean(mode)}>
      <DrawerContent size="md">
        <DrawerHeader>
          <DrawerTitle>{editing ? messages.members.drawer.editTitle : messages.members.drawer.addTitle}</DrawerTitle>
          <DrawerDescription>{editing ? messages.members.drawer.editDescription : messages.members.drawer.addDescription}</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-4">
          <Field disabled={editing} label={messages.members.drawer.userId} onChange={(userId) => onDraftChange({ ...draft, userId })} value={draft.userId} />
          <Field label={messages.members.drawer.roleCode} onChange={(roleCode) => onDraftChange({ ...draft, roleCode })} value={draft.roleCode ?? ""} />
        </DrawerBody>
        <DrawerFooter>
          <Button disabled={busy} onClick={() => onOpenChange(false)} type="button" variant="secondary">{messages.common.cancel}</Button>
          <Button disabled={busy || !draft.userId.trim()} loading={busy} onClick={onSubmit} type="button">{editing ? messages.common.save : messages.members.add}</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/** Tenant lifecycle states registered by `IAM_SPEC.md`. */
const TENANT_STATUS_OPTIONS = ["active", "suspended", "disabled", "terminated"] as const;

function TenantStatusField({ label, onChange, statuses, value }: {
  label: string;
  onChange: (value: string) => void;
  statuses: SdkworkIamTenantAdminMessages["tenants"]["statuses"];
  value: string;
}) {
  const normalized = value.trim().toLowerCase();
  const options = TENANT_STATUS_OPTIONS.map((status) => [status, statuses[status]] as const);
  const currentUnknown = options.some(([optionValue]) => optionValue === normalized) ? undefined : value;
  return (
    <label className="block space-y-1.5 text-sm">
      <FieldLabel label={label} />
      <Select onValueChange={onChange} value={value}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}
          {currentUnknown ? <SelectItem key={currentUnknown} value={currentUnknown}>{formatEnumLabel(statuses, currentUnknown)}</SelectItem> : null}
        </SelectContent>
      </Select>
    </label>
  );
}

function tenantStatusVariant(status: string): "danger" | "default" | "secondary" | "success" | "warning" {
  switch (status.trim().toLowerCase()) {
    case "active":
      return "success";
    case "suspended":
      return "warning";
    case "terminated":
      return "danger";
    case "disabled":
      return "secondary";
    default:
      return "default";
  }
}

/**
 * Drawer-level validation.
 *
 * Name and code are required by the backend create handler, so the drawer
 * blocks the request instead of letting a returning 400 read as an opaque
 * operation failure. Optional contact values only validate when present.
 */
function validateTenantDraft(
  draft: SdkworkIamTenantDraft,
  copy: SdkworkIamTenantAdminMessages["tenants"]["drawer"],
): Partial<Record<TenantDraftField, string>> {
  const errors: Partial<Record<TenantDraftField, string>> = {};
  if (!draft.name.trim()) {
    errors.name = copy.nameRequired;
  }
  const code = draft.code?.trim() ?? "";
  if (!code) {
    errors.code = copy.codeRequired;
  } else if (!TENANT_CODE_PATTERN.test(code)) {
    errors.code = copy.codeInvalid;
  }
  const email = draft.contactEmail?.trim() ?? "";
  if (email && !TENANT_EMAIL_PATTERN.test(email)) {
    errors.contactEmail = copy.emailInvalid;
  }
  const phone = draft.contactPhone?.trim() ?? "";
  if (phone && !TENANT_PHONE_PATTERN.test(phone)) {
    errors.contactPhone = copy.phoneInvalid;
  }
  return errors;
}

function tenantToDraft(tenant: SdkworkIamTenant): SdkworkIamTenantDraft {
  return {
    address: tenant.address ?? "",
    code: tenant.code ?? "",
    contactEmail: tenant.contactEmail ?? "",
    contactPhone: tenant.contactPhone ?? "",
    description: tenant.description ?? "",
    industryCategory: tenant.industryCategory ?? "",
    logo: tenant.logo,
    logoUrl: tenant.logoUrl ?? "",
    name: tenant.name,
    status: tenant.status ?? "",
  };
}

/** Seeds the shared upload component from a stored tenant logo snapshot. */
function tenantLogoResourceToDriveUploadImageValue(
  logo: SdkworkIamTenantLogoMediaResource | undefined,
): DriveUploadImageValue | null {
  if (!logo) {
    return null;
  }
  const uri = logo.uri ?? logo.publicUrl ?? logo.url;
  if (!uri) {
    return null;
  }
  const drive = logo.metadata?.drive;
  const driveMetadata = logo.source === "drive" && drive?.nodeId && drive.spaceId
    ? { drive: { nodeId: drive.nodeId, spaceId: drive.spaceId } }
    : undefined;
  return {
    ...(driveMetadata === undefined ? {} : { metadata: driveMetadata }),
    source: logo.source === "external" ? "external" : "drive",
    uri,
  };
}

/**
 * Maps a freshly uploaded component value back onto the stored snapshot shape.
 *
 * The snapshot is what `iam_tenant.logo_resource_snapshot` persists, so it
 * keeps the stable Drive reference plus the display metadata the media
 * resource contract defines — never a transient preview URL.
 */
function driveUploadImageValueToTenantLogo(
  value: DriveUploadImageValue,
): SdkworkIamTenantLogoMediaResource {
  const drive = value.metadata?.drive;
  const driveMetadata = drive?.nodeId && drive.spaceId
    ? { drive: { nodeId: drive.nodeId, spaceId: drive.spaceId } }
    : undefined;
  return {
    ...(drive?.contentType === undefined ? {} : { mimeType: drive.contentType }),
    ...(drive?.contentLength === undefined ? {} : { sizeBytes: drive.contentLength }),
    ...(drive?.nodeId === undefined ? {} : { id: drive.nodeId }),
    ...(drive?.originalFileName === undefined ? {} : { fileName: drive.originalFileName }),
    kind: "image",
    ...(driveMetadata === undefined ? {} : { metadata: driveMetadata }),
    source: value.source,
    uri: value.uri,
  };
}

function formatEnumLabel(statuses: Record<string, string>, value: string) {
  const normalized = value.trim().toLowerCase();
  return statuses[normalized] ?? statuses.unknown;
}

function template(value: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce(
    (result, [key, replacement]) => result.replace(`{${key}}`, replacement),
    value,
  );
}

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
