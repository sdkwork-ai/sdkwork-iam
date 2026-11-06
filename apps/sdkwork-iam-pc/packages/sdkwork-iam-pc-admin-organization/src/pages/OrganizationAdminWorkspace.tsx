import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { Boxes, Briefcase, Building2, GitBranch, Image as ImageIcon, Pencil, Plus, Search, ShieldCheck, Trash2, Users } from "lucide-react";
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

import { useSdkworkIamOrganizationAdminMessages } from "../i18n";
import type { SdkworkIamOrganizationAdminMessages } from "../types/organization-admin-messages";
import type {
  SdkworkIamDepartment,
  SdkworkIamDepartmentDraft,
  SdkworkIamOrganization,
  SdkworkIamOrganizationAdminWorkspaceProps,
  SdkworkIamOrganizationDraft,
  SdkworkIamOrganizationLogoMediaResource,
  SdkworkIamOrganizationMembership,
  SdkworkIamOrganizationMembershipDraft,
  SdkworkIamOrganizationState,
  SdkworkIamPosition,
  SdkworkIamRoleBinding,
} from "../types/organization-admin-types";

type PageInfoState = Pick<SdkworkIamOrganizationState,
  "departmentListPageInfo" | "membershipListPageInfo" | "organizationListPageInfo" | "positionListPageInfo" | "roleBindingListPageInfo">;
type DrawerMode = "create" | "edit";
type OrganizationDetailTab = "departments" | "memberships" | "positions" | "roleBindings";
type ListKind = "organizations" | "departments" | "memberships" | "positions" | "roleBindings";
type OrganizationDraftField = "code" | "contactEmail" | "contactPhone" | "name";

/// Tokens accepted by the backend organizations.create/update validation.
const ORGANIZATION_KINDS = ["enterprise", "government", "nonprofit", "team", "other"] as const;
/// Accepted logo image types; mirrors the catalog image upload declaration.
const ORGANIZATION_LOGO_ACCEPT = ["image/png", "image/jpeg", "image/webp"] as const;
/// Raw file ceiling for an uploaded logo. The backend persists only the media
/// resource snapshot (uri + drive identity), so the image itself can follow the
/// standard admin-asset image ceiling.
const ORGANIZATION_LOGO_MAX_BYTES = 2 * 1024 * 1024;
/// Organization codes are the unique business identifier and become the
/// organization path, so the drawer keeps them URL-safe.
const ORGANIZATION_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/u;
/// Contact details are optional, but a malformed value would otherwise reach
/// the backend and surface as an opaque failure.
const ORGANIZATION_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const ORGANIZATION_PHONE_PATTERN = /^[+()0-9][0-9+()\s-]{3,31}$/u;
const ORGANIZATION_DESCRIPTION_MAX_LENGTH = 200;
/// Page ceiling the backend list endpoint accepts; the parent picker loads the
/// whole tenant hierarchy in one request instead of the current page slice.
const ORGANIZATION_PARENT_PAGE_SIZE = 200;
/// Radix Select forbids empty-string item values, so the "no parent" option
/// uses this sentinel and the change handler maps it back to "".
const ROOT_PARENT_VALUE = "__sdkwork_root__";

const emptyOrganizationDraft = (): SdkworkIamOrganizationDraft => ({ name: "", organizationKind: "enterprise" });
const emptyDepartmentDraft = (organizationId: string): SdkworkIamDepartmentDraft => ({ name: "", organizationId });
const emptyMembershipDraft = (): SdkworkIamOrganizationMembershipDraft => ({ userId: "" });

export function SdkworkIamOrganizationAdminWorkspace({
  controller,
  driveUploadImageService,
  onOpenApplications,
  onOpenStructure,
  permissions = {
    departments: { create: true, delete: true, read: true, update: true },
    memberships: { create: true, read: true, update: true },
    organizations: { create: true, delete: true, update: true },
    positions: { read: true },
    roleBindings: { read: true },
  },
}: SdkworkIamOrganizationAdminWorkspaceProps) {
  const messages = useSdkworkIamOrganizationAdminMessages();
  const state = controller.getState();
  const [organizations, setOrganizations] = useState(state.organizations);
  const [departments, setDepartments] = useState(state.departments);
  const [memberships, setMemberships] = useState(state.memberships);
  const [positions, setPositions] = useState(state.positions);
  const [roleBindings, setRoleBindings] = useState(state.roleBindings);
  const [pageInfo, setPageInfo] = useState<PageInfoState>({
    departmentListPageInfo: state.departmentListPageInfo,
    membershipListPageInfo: state.membershipListPageInfo,
    organizationListPageInfo: state.organizationListPageInfo,
    positionListPageInfo: state.positionListPageInfo,
    roleBindingListPageInfo: state.roleBindingListPageInfo,
  });
  const [selectedOrganization, setSelectedOrganization] = useState<SdkworkIamOrganization>();
  const [organizationEditTarget, setOrganizationEditTarget] = useState<SdkworkIamOrganization>();
  const [selectedDepartment, setSelectedDepartment] = useState<SdkworkIamDepartment>();
  const [selectedMembership, setSelectedMembership] = useState<SdkworkIamOrganizationMembership>();
  const [organizationDraft, setOrganizationDraft] = useState<SdkworkIamOrganizationDraft>(emptyOrganizationDraft);
  const [departmentDraft, setDepartmentDraft] = useState<SdkworkIamDepartmentDraft>(() => emptyDepartmentDraft(""));
  const [membershipDraft, setMembershipDraft] = useState<SdkworkIamOrganizationMembershipDraft>(emptyMembershipDraft);
  const [organizationDrawerMode, setOrganizationDrawerMode] = useState<DrawerMode>();
  const [departmentDrawerMode, setDepartmentDrawerMode] = useState<DrawerMode>();
  const [membershipDrawerMode, setMembershipDrawerMode] = useState<DrawerMode>();
  const [deleteOrganizationTarget, setDeleteOrganizationTarget] = useState<SdkworkIamOrganization>();
  const [deleteDepartmentTarget, setDeleteDepartmentTarget] = useState<SdkworkIamDepartment>();
  const [activeTab, setActiveTab] = useState<OrganizationDetailTab>();
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [pages, setPages] = useState<Record<ListKind, number>>({
    departments: 1, memberships: 1, organizations: 1, positions: 1, roleBindings: 1,
  });
  const [pageSizes, setPageSizes] = useState<Record<ListKind, number>>({
    departments: 20, memberships: 20, organizations: 20, positions: 20, roleBindings: 20,
  });
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  // The shared upload field owns the picked file in its own controller
  // (persist-first, DRIVE_SPEC.md section 18.3). Create mode parks the pick
  // with no anchor and this handle flushes it against the freshly created
  // organization id; closing the drawer destroys the controller and with it
  // an unsubmitted pick.
  const logoFieldRef = useRef<DriveUploadImageHandle | null>(null);
  // Parent picker candidates: the whole tenant hierarchy, not the current
  // table page, so an organization never becomes unreachable because it sits
  // past page one.
  const [parentOptions, setParentOptions] = useState<readonly SdkworkIamOrganization[]>([]);
  // Required-field errors appear after the first submit attempt, then stay in
  // sync with the draft.
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // True while the shared logo field is uploading; saving is blocked so the
  // persisted record cannot race an in-flight logo upload.
  const [logoUploading, setLogoUploading] = useState(false);
  // Detail header display URL for a Drive-backed logo snapshot, resolved
  // through the injected bounded preview reader. Presentation-only state and
  // never persisted.
  const [resolvedLogoUrl, setResolvedLogoUrl] = useState<string>();

  const detailTabs = useMemo(() => [
    ...(permissions.departments.read
      ? [{ icon: <GitBranch className="h-4 w-4" />, label: messages.tabs.departments, value: "departments" as const }]
      : []),
    ...(permissions.memberships.read
      ? [{ icon: <Users className="h-4 w-4" />, label: messages.tabs.memberships, value: "memberships" as const }]
      : []),
    ...(permissions.positions.read
      ? [{ icon: <Briefcase className="h-4 w-4" />, label: messages.tabs.positions, value: "positions" as const }]
      : []),
    ...(permissions.roleBindings.read
      ? [{ icon: <ShieldCheck className="h-4 w-4" />, label: messages.tabs.roleBindings, value: "roleBindings" as const }]
      : []),
  ], [messages, permissions]);

  const syncPageInfo = () => {
    const next = controller.getState();
    setPageInfo({
      departmentListPageInfo: next.departmentListPageInfo,
      membershipListPageInfo: next.membershipListPageInfo,
      organizationListPageInfo: next.organizationListPageInfo,
      positionListPageInfo: next.positionListPageInfo,
      roleBindingListPageInfo: next.roleBindingListPageInfo,
    });
  };

  const refreshOrganizations = async (query = appliedSearchQuery, nextPage = pages.organizations, nextPageSize = pageSizes.organizations) => {
    const params: Record<string, unknown> = { page: nextPage, page_size: nextPageSize };
    if (query) params.q = query;
    const items = await controller.listOrganizations(params);
    setOrganizations(items);
    syncPageInfo();
    return items;
  };

  const refreshDepartments = async (organizationId: string, nextPage = pages.departments, nextPageSize = pageSizes.departments) => {
    const items = await controller.listDepartments(organizationId, { page: nextPage, page_size: nextPageSize });
    setDepartments(items);
    syncPageInfo();
    return items;
  };

  const refreshMemberships = async (organizationId: string, nextPage = pages.memberships, nextPageSize = pageSizes.memberships) => {
    const items = await controller.listMemberships(organizationId, { page: nextPage, page_size: nextPageSize });
    setMemberships(items);
    syncPageInfo();
    return items;
  };

  const loadDetailTab = async (tab: OrganizationDetailTab, organizationId: string, nextPage = pages[tab], nextPageSize = pageSizes[tab]) => {
    if (tab === "departments") {
      await refreshDepartments(organizationId, nextPage, nextPageSize);
    } else if (tab === "memberships") {
      await refreshMemberships(organizationId, nextPage, nextPageSize);
    } else if (tab === "positions") {
      setPositions(await controller.listPositions({ organizationId, page: nextPage, page_size: nextPageSize }));
      syncPageInfo();
    } else {
      setRoleBindings(await controller.listRoleBindings({ organizationId, page: nextPage, page_size: nextPageSize }));
      syncPageInfo();
    }
  };

  useEffect(() => {
    setLoading(true);
    void refreshOrganizations("")
      .catch((loadError) => setError(toErrorMessage(loadError, messages.notices.loadOrganizationsError)))
      .finally(() => setLoading(false));
  }, [controller]);

  // Drive-backed logo snapshots have no delivery URL; the detail header shows
  // the bounded preview the injected upload service resolves. External logos
  // keep their own delivery URL and skip this entirely.
  const selectedLogo = selectedOrganization?.logo;
  const selectedLogoUrl = selectedOrganization?.logoUrl || undefined;
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

  const runAction = async (action: () => Promise<void>, successMessage: string, fallbackError = messages.common.operationError) => {
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

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    setAppliedSearchQuery(query);
    setPages((current) => ({ ...current, organizations: 1 }));
    setLoading(true);
    setError(undefined);
    void refreshOrganizations(query, 1, pageSizes.organizations)
      .catch((loadError) => setError(toErrorMessage(loadError, messages.notices.loadOrganizationsError)))
      .finally(() => setLoading(false));
  };

  const changePage = (kind: ListKind, nextPage: number) => {
    setPages((current) => ({ ...current, [kind]: nextPage }));
    if (kind === "organizations") {
      setLoading(true);
      setError(undefined);
      void refreshOrganizations(appliedSearchQuery, nextPage)
        .catch((loadError) => setError(toErrorMessage(loadError, messages.notices.loadOrganizationsError)))
        .finally(() => setLoading(false));
      return;
    }
    if (!selectedOrganization) return;
    setDetailLoading(true);
    setError(undefined);
    void loadDetailTab(kind as OrganizationDetailTab, selectedOrganization.organizationId, nextPage)
      .catch((loadError) => setError(toErrorMessage(loadError, detailLoadError(kind as OrganizationDetailTab, messages.notices))))
      .finally(() => setDetailLoading(false));
  };

  const changePageSize = (kind: ListKind, nextPageSize: number) => {
    setPageSizes((current) => ({ ...current, [kind]: nextPageSize }));
    setPages((current) => ({ ...current, [kind]: 1 }));
    if (kind === "organizations") {
      setLoading(true);
      setError(undefined);
      void refreshOrganizations(appliedSearchQuery, 1, nextPageSize)
        .catch((loadError) => setError(toErrorMessage(loadError, messages.notices.loadOrganizationsError)))
        .finally(() => setLoading(false));
      return;
    }
    if (!selectedOrganization) return;
    setDetailLoading(true);
    setError(undefined);
    void loadDetailTab(kind as OrganizationDetailTab, selectedOrganization.organizationId, 1, nextPageSize)
      .catch((loadError) => setError(toErrorMessage(loadError, detailLoadError(kind as OrganizationDetailTab, messages.notices))))
      .finally(() => setDetailLoading(false));
  };

  const paginationCopy = {
    next: messages.pagination.next,
    pageSize: messages.pagination.pageSize,
    previous: messages.pagination.previous,
    total: messages.pagination.total,
  };

  const selectOrganization = async (organization: SdkworkIamOrganization) => {
    setError(undefined);
    setDetailLoading(true);
    try {
      const resolved = await controller.selectOrganization(organization.organizationId) ?? organization;
      setSelectedOrganization(resolved);
      const nextTab = detailTabs[0]?.value;
      setActiveTab(nextTab);
      if (nextTab) await loadDetailTab(nextTab, resolved.organizationId);
    } catch (loadError) {
      setError(toErrorMessage(loadError, messages.notices.loadOrganizationError));
    } finally {
      setDetailLoading(false);
    }
  };

  const switchDetailTab = (value: string) => {
    if (!selectedOrganization || !detailTabs.some((tab) => tab.value === value)) return;
    const nextTab = value as OrganizationDetailTab;
    setActiveTab(nextTab);
    setPages((current) => ({ ...current, [nextTab]: 1 }));
    setDetailLoading(true);
    setError(undefined);
    void loadDetailTab(nextTab, selectedOrganization.organizationId, 1, pageSizes[nextTab])
      .catch((loadError) => setError(toErrorMessage(loadError, detailLoadError(nextTab, messages.notices))))
      .finally(() => setDetailLoading(false));
  };

  // The parent picker must offer the whole hierarchy, so each drawer opening
  // refreshes the candidate list independently of the current table page.
  const loadParentOptions = async () => {
    try {
      setParentOptions(await controller.listOrganizations({ page: 1, page_size: ORGANIZATION_PARENT_PAGE_SIZE }));
    } catch {
      setParentOptions(organizations);
    }
  };

  const openOrganizationCreator = () => {
    setOrganizationEditTarget(undefined);
    setOrganizationDraft(emptyOrganizationDraft());
    setLogoUploading(false);
    setSubmitAttempted(false);
    setOrganizationDrawerMode("create");
    void loadParentOptions();
  };

  const openOrganizationEditor = (organization: SdkworkIamOrganization) => {
    setOrganizationEditTarget(organization);
    setOrganizationDraft({
      address: organization.address ?? "",
      code: organization.code ?? "",
      contactEmail: organization.contactEmail ?? "",
      contactPhone: organization.contactPhone ?? "",
      description: organization.description ?? "",
      industryCategory: organization.industryCategory ?? "",
      logo: organization.logo,
      logoUrl: organization.logoUrl ?? "",
      name: organization.name,
      organizationCategory: organization.organizationCategory ?? "",
      organizationKind: organization.organizationKind ?? "enterprise",
      parentId: organization.parentId ?? "",
      status: organization.status ?? "",
      tenantId: organization.tenantId ?? "",
    });
    setLogoUploading(false);
    setSubmitAttempted(false);
    setOrganizationDrawerMode("edit");
    void loadParentOptions();
  };

  /**
   * Submits the organization drawer.
   *
   * Create runs persist-first (`DRIVE_SPEC.md` section 18.3): the organization
   * is created, then the shared upload field flushes its parked pick against
   * the new id and a follow-up update attaches the returned media resource.
   * When the attach fails the drawer flips to edit mode for the created record
   * so the retry targets that entity instead of creating a duplicate, and the
   * failure is reported without a success notice.
   */
  const submitOrganization = async () => {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      if (organizationDrawerMode === "edit" && organizationEditTarget) {
        const updated = await controller.updateOrganization(organizationEditTarget.organizationId, organizationDraft);
        if (selectedOrganization?.organizationId === updated.organizationId) setSelectedOrganization(updated);
        await refreshOrganizations();
        setNotice(messages.notices.organizationUpdated);
      } else {
        const created = await controller.createOrganization(organizationDraft);
        let attached: SdkworkIamOrganization = created;
        try {
          const values = await logoFieldRef.current?.uploadPending({ appResourceId: created.organizationId });
          const logoValue = values?.[values.length - 1];
          if (logoValue) {
            attached = await controller.updateOrganization(created.organizationId, {
              logo: driveUploadImageValueToLogoResource(logoValue),
            });
          }
        } catch {
          setOrganizationEditTarget(created);
          setOrganizationDrawerMode("edit");
          setSubmitAttempted(false);
          await refreshOrganizations();
          setError(messages.notices.organizationLogoAttachFailed);
          return;
        }
        await refreshOrganizations();
        setNotice(messages.notices.organizationCreated);
        if (onOpenStructure) {
          onOpenStructure(attached);
        } else {
          setSelectedOrganization(attached);
          const nextTab = detailTabs[0]?.value;
          setActiveTab(nextTab);
          if (nextTab) await loadDetailTab(nextTab, attached.organizationId);
        }
      }
      setOrganizationDrawerMode(undefined);
      setOrganizationEditTarget(undefined);
    } catch (actionError) {
      setError(toErrorMessage(actionError, messages.common.operationError));
    } finally {
      setBusy(false);
    }
  };

  const openDepartmentEditor = (department: SdkworkIamDepartment) => {
    setSelectedDepartment(department);
    setDepartmentDraft({
      code: department.code ?? "",
      name: department.name,
      organizationId: department.organizationId,
      parentDepartmentId: department.parentDepartmentId ?? "",
      status: department.status ?? "",
    });
    setDepartmentDrawerMode("edit");
  };

  const openMembershipEditor = (membership: SdkworkIamOrganizationMembership) => {
    setSelectedMembership(membership);
    setMembershipDraft({
      membershipKind: membership.membershipKind ?? "",
      roleCode: membership.roleCode ?? "",
      status: membership.status ?? "",
      userId: membership.userId,
    });
    setMembershipDrawerMode("edit");
  };

  const organizationColumns = useMemo<DataTableColumn<SdkworkIamOrganization>[]>(() => {
    const nameByOrganizationId = new Map(organizations.map((organization) => [organization.organizationId, organization.name]));
    return [
      { id: "name", header: messages.organizations.table.organization, cell: (item) => item.name },
      { id: "code", header: messages.organizations.table.code, cell: (item) => item.code || "-" },
      { id: "kind", header: messages.organizations.table.kind, cell: (item) => kindLabel(messages.organizations.organizationKinds, item.organizationKind) ?? "-" },
      { id: "parent", header: messages.organizations.table.parent, cell: (item) => (item.parentId ? nameByOrganizationId.get(item.parentId) ?? item.parentId : "-") },
      { id: "status", header: messages.organizations.table.status, cell: (item) => item.status ? <StatusBadge label={statusLabel(messages.organizations.statuses, item.status)} showIcon status={item.status} /> : "-" },
    ];
  }, [messages, organizations]);

  const departmentColumns = useMemo<DataTableColumn<SdkworkIamDepartment>[]>(() => [
    { id: "name", header: messages.departments.table.department, cell: (item) => item.name },
    { id: "code", header: messages.departments.table.code, cell: (item) => item.code || "-" },
    { id: "parent", header: messages.departments.table.parent, cell: (item) => item.parentDepartmentId || "-" },
    { id: "status", header: messages.departments.table.status, cell: (item) => item.status ? <StatusBadge label={statusLabel(messages.departments.statuses, item.status)} showIcon status={item.status} /> : "-" },
  ], [messages]);

  const membershipColumns = useMemo<DataTableColumn<SdkworkIamOrganizationMembership>[]>(() => [
    { id: "member", header: messages.memberships.table.member, cell: (item) => item.displayName || item.username || item.email || item.userId },
    { id: "role", header: messages.memberships.table.role, cell: (item) => item.roleCode || "-" },
    { id: "kind", header: messages.memberships.table.kind, cell: (item) => item.membershipKind ? kindLabel(messages.memberships.membershipKinds, item.membershipKind) : "-" },
    { id: "status", header: messages.memberships.table.status, cell: (item) => item.status ? <StatusBadge label={statusLabel(messages.memberships.statuses, item.status)} showIcon status={item.status} /> : "-" },
  ], [messages]);

  const positionColumns = useMemo<DataTableColumn<SdkworkIamPosition>[]>(() => [
    { id: "name", header: messages.positions.table.position, cell: (item) => item.name },
    { id: "department", header: messages.positions.table.department, cell: (item) => item.departmentId || "-" },
    { id: "status", header: messages.positions.table.status, cell: (item) => item.status ? <StatusBadge label={statusLabel(messages.positions.statuses, item.status)} showIcon status={item.status} /> : "-" },
  ], [messages]);

  const bindingColumns = useMemo<DataTableColumn<SdkworkIamRoleBinding>[]>(() => [
    { id: "principal", header: messages.roleBindings.table.principal, cell: (item) => `${kindLabel(messages.roleBindings.principalKinds, item.principalKind) ?? messages.roleBindings.principalFallback}:${item.principalId || item.id}` },
    { id: "role", header: messages.roleBindings.table.role, cell: (item) => item.roleId || "-" },
    { id: "scope", header: messages.roleBindings.table.scope, cell: (item) => `${kindLabel(messages.roleBindings.scopeKinds, item.scopeKind) ?? messages.roleBindings.scopeFallback}:${item.scopeId || "-"}` },
    { id: "status", header: messages.roleBindings.table.status, cell: (item) => item.status ? <StatusBadge label={statusLabel(messages.roleBindings.statuses, item.status)} showIcon status={item.status} /> : "-" },
  ], [messages]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {error ? <StatusNotice tone="danger">{error}</StatusNotice> : null}
        {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <form className="flex min-w-0 items-center gap-2" onSubmit={submitSearch} role="search">
            <label className="relative w-64 shrink-0">
              <span className="sr-only">{messages.organizations.searchLabel}</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sdk-color-text-muted)]" />
              <Input aria-label={messages.organizations.searchLabel} className="pl-9" onChange={(event) => setSearchQuery(event.target.value)} placeholder={messages.organizations.searchPlaceholder} value={searchQuery} />
            </label>
            <Button disabled={loading} type="submit" variant="outline"><Search className="h-4 w-4" />{messages.organizations.searchAction}</Button>
          </form>
          {permissions.organizations.create ? (
            <Button onClick={openOrganizationCreator} type="button">
              <Plus className="h-4 w-4" />{messages.organizations.create}
            </Button>
          ) : null}
        </div>

        <DataTable
          className={selectedOrganization ? "max-h-[40vh]" : "min-h-0 flex-1"}
          columns={organizationColumns}
          emptyDescription={messages.organizations.emptyDescription}
          emptyTitle={messages.organizations.emptyTitle}
          footer={<CatalogPagination busy={busy} copy={paginationCopy} onPageChange={(page) => changePage("organizations", page)} onPageSizeChange={(pageSize) => changePageSize("organizations", pageSize)} pageInfo={pageInfo.organizationListPageInfo} />}
          getRowId={(item) => item.organizationId}
          loading={loading}
          onRowClick={(item) => (onOpenStructure ? onOpenStructure(item) : void selectOrganization(item))}
          rowActionsLabel={messages.organizations.table.actions}
          rowActions={(item) => (
            <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
              {onOpenApplications ? (
                <Button onClick={() => onOpenApplications(item)} size="sm" type="button" variant="outline">
                  <Boxes className="h-3.5 w-3.5" />
                  {messages.organizations.applications}
                </Button>
              ) : null}
              {onOpenStructure ? (
                <Button onClick={() => onOpenStructure(item)} size="sm" type="button" variant="outline">
                  <GitBranch className="h-3.5 w-3.5" />
                  {messages.organizations.structure}
                </Button>
              ) : (
                <Button onClick={() => void selectOrganization(item)} size="sm" type="button" variant="outline">{messages.organizations.manage}</Button>
              )}
              {permissions.organizations.update ? (
                <IconButton aria-label={messages.organizations.edit} onClick={() => openOrganizationEditor(item)} title={messages.organizations.edit} variant="ghost">
                  <Pencil className="h-3.5 w-3.5" />
                </IconButton>
              ) : null}
              {permissions.organizations.delete ? (
                <IconButton aria-label={messages.organizations.delete} onClick={() => setDeleteOrganizationTarget(item)} title={messages.organizations.delete} variant="ghost">
                  <Trash2 className="h-3.5 w-3.5 text-[var(--sdk-color-state-danger)]" />
                </IconButton>
              ) : null}
            </div>
          )}
          rows={[...organizations]}
          slotProps={{
            surface: { className: "flex min-h-0 flex-1 flex-col" },
            viewport: { className: "min-h-0 flex-1" },
            footer: { className: "shrink-0" },
          }}
          stickyHeader
        />

        {!onOpenStructure && selectedOrganization ? (
          <section className="flex min-h-0 flex-1 flex-col border-t border-[var(--sdk-color-border-subtle)] pt-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                {selectedOrganization.logoUrl || resolvedLogoUrl ? (
                  <img
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] object-cover"
                    src={selectedOrganization.logoUrl || resolvedLogoUrl}
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--sdk-radius-control)] bg-[var(--sdk-color-surface-panel-muted)] text-[var(--sdk-color-text-secondary)]">
                    <Building2 className="h-5 w-5" />
                  </span>
                )}
                <span className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-[var(--sdk-color-text-primary)]">{template(messages.organizations.selectedTitleTemplate, { name: selectedOrganization.name })}</h2>
                  <p className="truncate text-sm text-[var(--sdk-color-text-muted)]">{template(messages.organizations.selectedDescriptionTemplate, { id: selectedOrganization.organizationId })}</p>
                </span>
              </div>
              {detailTabs.length > 0 && activeTab ? (
                <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                  <SegmentedControl aria-label={messages.organizations.manage} className="w-full lg:w-auto" fullWidth={false} onValueChange={switchDetailTab} options={detailTabs} value={activeTab} />
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex min-h-0 flex-1 flex-col">
              {activeTab === "departments" ? (
                <DataTable
                  className="min-h-0 flex-1"
                  columns={departmentColumns}
                  emptyDescription={messages.departments.emptyDescription}
                  emptyTitle={messages.departments.emptyTitle}
                  footer={<CatalogPagination busy={busy} copy={paginationCopy} onPageChange={(page) => changePage("departments", page)} onPageSizeChange={(pageSize) => changePageSize("departments", pageSize)} pageInfo={pageInfo.departmentListPageInfo} />}
                  getRowId={(item) => item.departmentId}
                  loading={detailLoading}
                  onRowClick={permissions.departments.update ? openDepartmentEditor : undefined}
                  rowActionsLabel={messages.departments.table.actions}
                  rowActions={permissions.departments.update || permissions.departments.delete ? (item) => (
                    <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                      {permissions.departments.update ? <IconButton aria-label={messages.common.edit} onClick={() => openDepartmentEditor(item)} title={messages.common.edit} variant="ghost"><Pencil className="h-3.5 w-3.5" /></IconButton> : null}
                      {permissions.departments.delete ? <IconButton aria-label={messages.departments.delete} onClick={() => setDeleteDepartmentTarget(item)} title={messages.departments.delete} variant="ghost"><Trash2 className="h-3.5 w-3.5 text-[var(--sdk-color-state-danger)]" /></IconButton> : null}
                    </div>
                  ) : undefined}
                  rows={[...departments]}
                  slotProps={{
                    surface: { className: "flex min-h-0 flex-1 flex-col" },
                    viewport: { className: "min-h-0 flex-1" },
                    footer: { className: "shrink-0" },
                  }}
                  stickyHeader
                  title={template(messages.departments.titleTemplate, { name: selectedOrganization.name })}
                  toolbar={permissions.departments.create ? <Button onClick={() => { setSelectedDepartment(undefined); setDepartmentDraft(emptyDepartmentDraft(selectedOrganization.organizationId)); setDepartmentDrawerMode("create"); }} type="button"><Plus className="h-4 w-4" />{messages.departments.create}</Button> : undefined}
                />
              ) : null}

              {activeTab === "memberships" ? (
                <DataTable
                  className="min-h-0 flex-1"
                  columns={membershipColumns}
                  emptyDescription={messages.memberships.emptyDescription}
                  emptyTitle={messages.memberships.emptyTitle}
                  footer={<CatalogPagination busy={busy} copy={paginationCopy} onPageChange={(page) => changePage("memberships", page)} onPageSizeChange={(pageSize) => changePageSize("memberships", pageSize)} pageInfo={pageInfo.membershipListPageInfo} />}
                  getRowId={(item) => item.id}
                  loading={detailLoading}
                  onRowClick={permissions.memberships.update ? openMembershipEditor : undefined}
                  rowActionsLabel={messages.memberships.table.actions}
                  rowActions={permissions.memberships.update ? (item) => <IconButton aria-label={messages.common.edit} onClick={() => openMembershipEditor(item)} title={messages.common.edit} variant="ghost"><Pencil className="h-3.5 w-3.5" /></IconButton> : undefined}
                  rows={[...memberships]}
                  slotProps={{
                    surface: { className: "flex min-h-0 flex-1 flex-col" },
                    viewport: { className: "min-h-0 flex-1" },
                    footer: { className: "shrink-0" },
                  }}
                  stickyHeader
                  title={template(messages.memberships.titleTemplate, { name: selectedOrganization.name })}
                  toolbar={permissions.memberships.create ? <Button onClick={() => { setSelectedMembership(undefined); setMembershipDraft(emptyMembershipDraft()); setMembershipDrawerMode("create"); }} type="button"><Plus className="h-4 w-4" />{messages.memberships.add}</Button> : undefined}
                />
              ) : null}

              {activeTab === "positions" ? (
                <DataTable className="min-h-0 flex-1" columns={positionColumns} emptyDescription={messages.positions.emptyDescription} emptyTitle={messages.positions.emptyTitle} footer={<CatalogPagination busy={busy} copy={paginationCopy} onPageChange={(page) => changePage("positions", page)} onPageSizeChange={(pageSize) => changePageSize("positions", pageSize)} pageInfo={pageInfo.positionListPageInfo} />} getRowId={(item) => item.positionId} loading={detailLoading} rows={[...positions]} slotProps={{ surface: { className: "flex min-h-0 flex-1 flex-col" }, viewport: { className: "min-h-0 flex-1" }, footer: { className: "shrink-0" } }} stickyHeader title={template(messages.positions.titleTemplate, { name: selectedOrganization.name })} />
              ) : null}

              {activeTab === "roleBindings" ? (
                <DataTable className="min-h-0 flex-1" columns={bindingColumns} emptyDescription={messages.roleBindings.emptyDescription} emptyTitle={messages.roleBindings.emptyTitle} footer={<CatalogPagination busy={busy} copy={paginationCopy} onPageChange={(page) => changePage("roleBindings", page)} onPageSizeChange={(pageSize) => changePageSize("roleBindings", pageSize)} pageInfo={pageInfo.roleBindingListPageInfo} />} getRowId={(item) => item.id} loading={detailLoading} rows={[...roleBindings]} slotProps={{ surface: { className: "flex min-h-0 flex-1 flex-col" }, viewport: { className: "min-h-0 flex-1" }, footer: { className: "shrink-0" } }} stickyHeader title={template(messages.roleBindings.titleTemplate, { name: selectedOrganization.name })} />
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      <OrganizationDrawer
        busy={busy}
        copy={messages.drawers.organization}
        draft={organizationDraft}
        driveUploadImageService={driveUploadImageService}
        logoFieldRef={logoFieldRef}
        logoUploading={logoUploading}
        mode={organizationDrawerMode}
        onClose={() => {
          setOrganizationDrawerMode(undefined);
          setOrganizationEditTarget(undefined);
          setLogoUploading(false);
        }}
        onDraftChange={setOrganizationDraft}
        onLogoUploadingChange={setLogoUploading}
        onInvalidLogo={(message) => setError(message)}
        onSubmit={() => void submitOrganization()}
        onSubmitted={() => setSubmitAttempted(true)}
        organizationId={organizationDrawerMode === "edit" ? organizationEditTarget?.organizationId : undefined}
        parentOptions={parentOptions}
        statuses={messages.organizations.statuses}
        submitAttempted={submitAttempted}
      />

      <ResourceDrawer busy={busy} description={departmentDrawerMode === "edit" ? messages.drawers.department.editDescription : messages.drawers.department.createDescription} mode={departmentDrawerMode} onOpenChange={(open) => { if (!open) setDepartmentDrawerMode(undefined); }} onSubmit={() => {
        if (!selectedOrganization) return;
        void runAction(async () => {
          if (departmentDrawerMode === "edit" && selectedDepartment) await controller.updateDepartment(selectedDepartment.departmentId, departmentDraft);
          else await controller.createDepartment({ ...departmentDraft, organizationId: selectedOrganization.organizationId });
          await refreshDepartments(selectedOrganization.organizationId);
          setDepartmentDrawerMode(undefined);
        }, departmentDrawerMode === "edit" ? messages.notices.departmentUpdated : messages.notices.departmentCreated);
      }} submitDisabled={!departmentDraft.name.trim()} submitLabel={departmentDrawerMode === "edit" ? messages.common.save : messages.common.create} title={departmentDrawerMode === "edit" ? messages.drawers.department.editTitle : messages.drawers.department.createTitle}>
        <Field label={messages.drawers.department.name} onChange={(name) => setDepartmentDraft({ ...departmentDraft, name })} value={departmentDraft.name} />
        <Field label={messages.drawers.department.code} onChange={(code) => setDepartmentDraft({ ...departmentDraft, code })} value={departmentDraft.code ?? ""} />
        <Field label={messages.drawers.department.parentId} onChange={(parentDepartmentId) => setDepartmentDraft({ ...departmentDraft, parentDepartmentId })} value={departmentDraft.parentDepartmentId ?? ""} />
        {departmentDrawerMode === "edit" ? <StatusSelectField label={messages.drawers.department.status} onChange={(status) => setDepartmentDraft({ ...departmentDraft, status })} statuses={messages.departments.statuses} value={departmentDraft.status ?? ""} /> : null}
      </ResourceDrawer>

      <ResourceDrawer busy={busy} description={membershipDrawerMode === "edit" ? messages.drawers.membership.editDescription : messages.drawers.membership.createDescription} mode={membershipDrawerMode} onOpenChange={(open) => { if (!open) setMembershipDrawerMode(undefined); }} onSubmit={() => {
        if (!selectedOrganization) return;
        void runAction(async () => {
          if (membershipDrawerMode === "edit" && selectedMembership?.membershipId) await controller.updateMembership(selectedMembership.membershipId, membershipDraft);
          else await controller.addMembership(selectedOrganization.organizationId, membershipDraft);
          await refreshMemberships(selectedOrganization.organizationId);
          setMembershipDrawerMode(undefined);
        }, membershipDrawerMode === "edit" ? messages.notices.membershipUpdated : messages.notices.membershipCreated);
      }} submitDisabled={!membershipDraft.userId.trim()} submitLabel={membershipDrawerMode === "edit" ? messages.common.save : messages.common.create} title={membershipDrawerMode === "edit" ? messages.drawers.membership.editTitle : messages.drawers.membership.createTitle}>
        <Field disabled={membershipDrawerMode === "edit"} label={messages.drawers.membership.userId} onChange={(userId) => setMembershipDraft({ ...membershipDraft, userId })} value={membershipDraft.userId} />
        <Field label={messages.drawers.membership.roleCode} onChange={(roleCode) => setMembershipDraft({ ...membershipDraft, roleCode })} value={membershipDraft.roleCode ?? ""} />
        <KindSelectField label={messages.drawers.membership.kind} kinds={messages.memberships.membershipKinds} onChange={(membershipKind) => setMembershipDraft({ ...membershipDraft, membershipKind })} value={membershipDraft.membershipKind ?? ""} />
        {membershipDrawerMode === "edit" ? <StatusSelectField label={messages.drawers.membership.status} onChange={(status) => setMembershipDraft({ ...membershipDraft, status })} statuses={messages.memberships.statuses} value={membershipDraft.status ?? ""} /> : null}
      </ResourceDrawer>

      <ConfirmDialog closeOnConfirm={false} confirmLabel={messages.organizations.delete} confirmLoading={busy} description={deleteOrganizationTarget ? template(messages.organizations.deleteDescriptionTemplate, { name: deleteOrganizationTarget.name }) : undefined} onConfirm={() => {
        if (!deleteOrganizationTarget) return;
        void runAction(async () => {
          await controller.deleteOrganization(deleteOrganizationTarget.organizationId);
          if (selectedOrganization?.organizationId === deleteOrganizationTarget.organizationId) {
            setSelectedOrganization(undefined); setActiveTab(undefined); setDepartments([]); setMemberships([]); setPositions([]); setRoleBindings([]);
          }
          await refreshOrganizations();
          setDeleteOrganizationTarget(undefined);
        }, messages.notices.organizationDeleted);
      }} onOpenChange={(open) => { if (!open && !busy) setDeleteOrganizationTarget(undefined); }} open={Boolean(deleteOrganizationTarget)} title={messages.organizations.deleteTitle} tone="danger" />

      <ConfirmDialog closeOnConfirm={false} confirmLabel={messages.departments.delete} confirmLoading={busy} description={deleteDepartmentTarget ? template(messages.departments.deleteDescriptionTemplate, { name: deleteDepartmentTarget.name }) : undefined} onConfirm={() => {
        if (!selectedOrganization || !deleteDepartmentTarget) return;
        void runAction(async () => {
          await controller.deleteDepartment(deleteDepartmentTarget.departmentId);
          await refreshDepartments(selectedOrganization.organizationId);
          setDeleteDepartmentTarget(undefined);
        }, messages.notices.departmentDeleted);
      }} onOpenChange={(open) => { if (!open && !busy) setDeleteDepartmentTarget(undefined); }} open={Boolean(deleteDepartmentTarget)} title={messages.departments.deleteTitle} tone="danger" />
    </div>
  );
}

function ResourceDrawer({ busy, children, description, mode, onOpenChange, onSubmit, submitDisabled, submitLabel, title }: {
  busy: boolean;
  children: ReactNode;
  description: string;
  mode?: DrawerMode;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  submitDisabled: boolean;
  submitLabel: string;
  title: string;
}) {
  const messages = useSdkworkIamOrganizationAdminMessages();
  return (
    <Drawer onOpenChange={onOpenChange} open={Boolean(mode)}>
      <DrawerContent size="md">
        <DrawerHeader><DrawerTitle>{title}</DrawerTitle><DrawerDescription>{description}</DrawerDescription></DrawerHeader>
        <DrawerBody className="space-y-4">{children}</DrawerBody>
        <DrawerFooter>
          <Button disabled={busy} onClick={() => onOpenChange(false)} type="button" variant="secondary">{messages.common.cancel}</Button>
          <Button disabled={busy || submitDisabled} loading={busy} onClick={onSubmit} type="button">{submitLabel}</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * The organization create/edit drawer.
 *
 * Layout follows the backend-admin form convention: identity first (logo,
 * name, code, type), then hierarchy and profile attributes, then contact
 * details. Required fields validate on the first submit attempt and stay in
 * sync afterwards. The logo is one shared placeholder upload field: there is
 * no separate pick button and no image-URL input.
 */
function OrganizationDrawer({
  busy,
  copy,
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
  organizationId,
  parentOptions,
  statuses,
  submitAttempted,
}: {
  busy: boolean;
  copy: SdkworkIamOrganizationAdminMessages["drawers"]["organization"];
  draft: SdkworkIamOrganizationDraft;
  driveUploadImageService?: DriveUploadImageService;
  logoFieldRef: RefObject<DriveUploadImageHandle | null>;
  logoUploading: boolean;
  mode?: DrawerMode;
  onClose: () => void;
  onDraftChange: (draft: SdkworkIamOrganizationDraft) => void;
  onInvalidLogo: (message: string) => void;
  onLogoUploadingChange: (uploading: boolean) => void;
  onSubmit: () => void;
  onSubmitted: () => void;
  organizationId?: string;
  parentOptions: readonly SdkworkIamOrganization[];
  statuses: SdkworkIamOrganizationAdminMessages["organizations"]["statuses"];
  submitAttempted: boolean;
}) {
  const messages = useSdkworkIamOrganizationAdminMessages();
  const editing = mode === "edit";
  const errors = validateOrganizationDraft(draft, copy);
  const errorFor = (field: OrganizationDraftField) => (submitAttempted ? errors[field] : undefined);
  const logoHint = template(copy.logoHintTemplate, {
    max: formatDriveUploadImageBytes(ORGANIZATION_LOGO_MAX_BYTES),
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
            <OrganizationLogoField
              copy={copy}
              draft={draft}
              driveUploadImageService={driveUploadImageService}
              editing={editing}
              hint={logoHint}
              logoFieldRef={logoFieldRef}
              onDraftChange={onDraftChange}
              onInvalid={onInvalidLogo}
              onUploadingChange={onLogoUploadingChange}
              organizationId={organizationId}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <OrganizationKindSelectField
                kinds={messages.organizations.organizationKinds}
                label={copy.kind}
                onChange={(organizationKind) => onDraftChange({ ...draft, organizationKind })}
                required
                value={draft.organizationKind ?? "enterprise"}
              />
              {editing ? (
                <StatusSelectField
                  label={copy.status}
                  onChange={(status) => onDraftChange({ ...draft, status })}
                  statuses={statuses}
                  value={draft.status ?? ""}
                />
              ) : null}
            </div>
          </DrawerSection>

          <DrawerSection description={copy.profileDescription} title={copy.profileSection}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label={copy.category}
                onChange={(organizationCategory) => onDraftChange({ ...draft, organizationCategory })}
                placeholder={copy.categoryPlaceholder}
                value={draft.organizationCategory ?? ""}
              />
              <Field
                label={copy.industry}
                onChange={(industryCategory) => onDraftChange({ ...draft, industryCategory })}
                placeholder={copy.industryPlaceholder}
                value={draft.industryCategory ?? ""}
              />
            </div>
            <ParentOrganizationSelectField
              hint={copy.parentHint}
              label={copy.parentId}
              noParentLabel={copy.noParent}
              onChange={(parentId) => onDraftChange({ ...draft, parentId })}
              organizations={parentOptions}
              selfOrganizationId={editing ? organizationId : undefined}
              value={draft.parentId ?? ""}
            />
            <TextareaField
              counterTemplate={copy.descriptionCountTemplate}
              label={copy.description}
              maxLength={ORGANIZATION_DESCRIPTION_MAX_LENGTH}
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
 * The organization logo field.
 *
 * Every mode renders the shared `DriveUploadImage` placeholder  - the dashed
 * pick area is the upload trigger, so the drawer needs no separate button.
 * Edit uploads immediately against the organization id; create passes a
 * resolver that returns `null`, so the pick parks in the field's controller
 * and the workspace flushes it after the organization exists
 * (`DRIVE_SPEC.md` section 18.3). Previews of stored Drive snapshots go
 * through the same service's bounded reader.
 */
function OrganizationLogoField({
  copy,
  draft,
  driveUploadImageService,
  editing,
  hint,
  logoFieldRef,
  onDraftChange,
  onInvalid,
  onUploadingChange,
  organizationId,
}: {
  copy: SdkworkIamOrganizationAdminMessages["drawers"]["organization"];
  draft: SdkworkIamOrganizationDraft;
  driveUploadImageService?: DriveUploadImageService;
  editing: boolean;
  hint: string;
  logoFieldRef: RefObject<DriveUploadImageHandle | null>;
  onDraftChange: (draft: SdkworkIamOrganizationDraft) => void;
  onInvalid: (message: string) => void;
  onUploadingChange: (uploading: boolean) => void;
  organizationId?: string;
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
          accept={[...ORGANIZATION_LOGO_ACCEPT]}
          alt={copy.logo}
          appResourceId={editing && organizationId ? organizationId : () => null}
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
          maxSizeBytes={ORGANIZATION_LOGO_MAX_BYTES}
          onChange={(next) => onDraftChange({
            ...draft,
            logo: next ? driveUploadImageValueToLogoResource(next) : undefined,
            logoUrl: "",
          })}
          onFileRejected={(rejection) => onInvalid(rejection.code === "file-too-large" ? copy.logoTooLarge : copy.logoInvalidType)}
          onUploadError={() => onInvalid(copy.logoReadError)}
          onUploadingChange={onUploadingChange}
          ref={logoFieldRef}
          service={driveUploadImageService}
          shape="rounded"
          sizePx={96}
          value={logoResourceToDriveUploadImageValue(draft.logo)}
        />
        <p className="min-w-0 flex-1 pt-1 text-xs leading-5 text-[var(--sdk-color-text-muted)]">{hint}</p>
      </div>
    </div>
  );
}

/** Seeds the shared component from a stored logo snapshot (uri + drive identity). */
function logoResourceToDriveUploadImageValue(
  logo: SdkworkIamOrganizationLogoMediaResource | undefined,
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
 * The snapshot is what `iam_organization.logo_resource_snapshot` persists, so
 * it keeps the stable Drive reference plus the display metadata the media
 * resource contract defines — never a transient preview URL.
 */
function driveUploadImageValueToLogoResource(
  value: DriveUploadImageValue,
): SdkworkIamOrganizationLogoMediaResource {
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

function OrganizationKindSelectField({ kinds, label, onChange, required, value }: { kinds: { enterprise: string; government: string; nonprofit: string; other: string; team: string; unknown: string }; label: string; onChange: (value: string) => void; required?: boolean; value: string }) {
  const normalized = value.trim().toLowerCase();
  const options = ORGANIZATION_KINDS.map((kind) => [kind, kinds[kind]] as const);
  const currentUnknown = options.some(([optionValue]) => optionValue === normalized) ? undefined : value;
  return (
    <label className="block space-y-1.5 text-sm">
      <FieldLabel label={label} required={required} />
      <Select onValueChange={onChange} value={value}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}
          {currentUnknown ? <SelectItem key={currentUnknown} value={currentUnknown}>{kinds.unknown}</SelectItem> : null}
        </SelectContent>
      </Select>
    </label>
  );
}

/**
 * Parent picker over the whole tenant hierarchy.
 *
 * The organization itself and every descendant are excluded: selecting one
 * would create a cycle the backend closure rebuild rejects. The current value
 * is always displayable even when the candidate page has not loaded yet.
 */
function ParentOrganizationSelectField({ hint, label, noParentLabel, onChange, organizations, selfOrganizationId, value }: {
  hint?: string;
  label: string;
  noParentLabel: string;
  onChange: (value: string) => void;
  organizations: readonly SdkworkIamOrganization[];
  selfOrganizationId?: string;
  value: string;
}) {
  const candidates = useMemo(() => {
    const excluded = selfOrganizationId ? collectDescendantIds(organizations, selfOrganizationId) : new Set<string>();
    return organizations.filter((organization) =>
      organization.organizationId !== selfOrganizationId
      && !excluded.has(organization.organizationId));
  }, [organizations, selfOrganizationId]);
  const depthByOrganizationId = useMemo(() => buildDepthIndex(organizations), [organizations]);
  const known = !value || candidates.some((organization) => organization.organizationId === value) || value === selfOrganizationId;
  const selectValue = value || ROOT_PARENT_VALUE;
  return (
    <label className="block space-y-1.5 text-sm">
      <FieldLabel label={label} />
      <Select onValueChange={(selected) => onChange(selected === ROOT_PARENT_VALUE ? "" : selected)} value={selectValue}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ROOT_PARENT_VALUE}>{noParentLabel}</SelectItem>
          {candidates.map((organization) => (
            <SelectItem key={organization.organizationId} value={organization.organizationId}>
              <span style={{ paddingLeft: `${(depthByOrganizationId.get(organization.organizationId) ?? 0) * 12}px` }}>
                {organization.name}
              </span>
            </SelectItem>
          ))}
          {!known && value ? <SelectItem value={value}>{value}</SelectItem> : null}
        </SelectContent>
      </Select>
      <FieldSupport hint={hint} />
    </label>
  );
}

/** Parent -> children index used by the picker's cycle guard and depth labels. */
function buildDepthIndex(organizations: readonly SdkworkIamOrganization[]): Map<string, number> {
  const byId = new Map(organizations.map((organization) => [organization.organizationId, organization]));
  const depth = new Map<string, number>();
  const resolve = (organizationId: string): number => {
    const cached = depth.get(organizationId);
    if (cached !== undefined) return cached;
    const organization = byId.get(organizationId);
    const parentId = organization?.parentId;
    const next = parentId && byId.has(parentId)
      ? Math.min(resolve(parentId) + 1, organizations.length)
      : 0;
    depth.set(organizationId, next);
    return next;
  };
  for (const organization of organizations) resolve(organization.organizationId);
  return depth;
}

/** Every descendant id of `rootOrganizationId`, including grandchildren. */
function collectDescendantIds(organizations: readonly SdkworkIamOrganization[], rootOrganizationId: string): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const organization of organizations) {
    if (!organization.parentId) continue;
    const children = childrenByParent.get(organization.parentId) ?? [];
    children.push(organization.organizationId);
    childrenByParent.set(organization.parentId, children);
  }
  const descendants = new Set<string>();
  const queue = [rootOrganizationId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    for (const childId of childrenByParent.get(current) ?? []) {
      if (descendants.has(childId)) continue;
      descendants.add(childId);
      queue.push(childId);
    }
  }
  return descendants;
}

function StatusSelectField({ label, onChange, statuses, value }: { label: string; onChange: (value: string) => void; statuses: { active: string; disabled: string; unknown: string }; value: string }) {
  const normalized = value.trim().toLowerCase();
  const options = [
    ["active", statuses.active],
    ["disabled", statuses.disabled],
  ] as const;
  const currentUnknown = options.some(([optionValue]) => optionValue === normalized) ? undefined : value;
  return (
    <label className="block space-y-1.5 text-sm">
      <FieldLabel label={label} />
      <Select onValueChange={onChange} value={value}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}
          {currentUnknown ? <SelectItem key={currentUnknown} value={currentUnknown}>{statusLabel(statuses, currentUnknown)}</SelectItem> : null}
        </SelectContent>
      </Select>
    </label>
  );
}

function KindSelectField({ label, kinds, onChange, value }: { label: string; kinds: { employee: string; member: string; owner: string; unknown: string }; onChange: (value: string) => void; value: string }) {
  const normalized = value.trim().toLowerCase();
  const options = [
    ["employee", kinds.employee],
    ["member", kinds.member],
    ["owner", kinds.owner],
  ] as const;
  const currentUnknown = options.some(([optionValue]) => optionValue === normalized) ? undefined : value;
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-[var(--sdk-color-text-primary)]">{label}</span>
      <Select onValueChange={onChange} value={value}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}
          {currentUnknown ? <SelectItem key={currentUnknown} value={currentUnknown}>{kindLabel(kinds, currentUnknown)}</SelectItem> : null}
        </SelectContent>
      </Select>
    </label>
  );
}

function statusLabel(statuses: { active: string; disabled: string; unknown: string }, value: string) {
  const normalized = value.trim().toLowerCase();
  return statuses[normalized as keyof typeof statuses] ?? statuses.unknown;
}

function kindLabel(labels: Record<string, string>, value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return labels[normalized] ?? value;
}

/**
 * Drawer-level validation.
 *
 * Name and code are required by the backend create handler, so the drawer
 * blocks the request instead of letting a returning 400 read as an opaque
 * operation failure. Optional contact values only validate when present.
 */
function validateOrganizationDraft(
  draft: SdkworkIamOrganizationDraft,
  copy: SdkworkIamOrganizationAdminMessages["drawers"]["organization"],
): Partial<Record<OrganizationDraftField, string>> {
  const errors: Partial<Record<OrganizationDraftField, string>> = {};
  if (!draft.name.trim()) {
    errors.name = copy.nameRequired;
  }
  const code = draft.code?.trim() ?? "";
  if (!code) {
    errors.code = copy.codeRequired;
  } else if (!ORGANIZATION_CODE_PATTERN.test(code)) {
    errors.code = copy.codeInvalid;
  }
  const email = draft.contactEmail?.trim() ?? "";
  if (email && !ORGANIZATION_EMAIL_PATTERN.test(email)) {
    errors.contactEmail = copy.emailInvalid;
  }
  const phone = draft.contactPhone?.trim() ?? "";
  if (phone && !ORGANIZATION_PHONE_PATTERN.test(phone)) {
    errors.contactPhone = copy.phoneInvalid;
  }
  return errors;
}

function detailLoadError(tab: OrganizationDetailTab, notices: ReturnType<typeof useSdkworkIamOrganizationAdminMessages>["notices"]) {
  if (tab === "departments") return notices.loadDepartmentsError;
  if (tab === "memberships") return notices.loadMembershipsError;
  if (tab === "positions") return notices.loadPositionsError;
  return notices.loadRoleBindingsError;
}

function template(value: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce((result, [key, replacement]) => result.replace(`{${key}}`, replacement), value);
}

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
