import { createSdkWorkPagedListSession, hasPermissionInScope } from "@sdkwork/iam-contracts";
import type { SdkworkIamService } from "@sdkwork/iam-service";

import { SDKWORK_IAM_TENANT_APPLICATION_TYPES } from "../types/tenant-admin-types";
import type {
  CreateSdkworkIamTenantControllerInput,
  SdkworkIamTenant,
  SdkworkIamTenantController,
  SdkworkIamTenantDraft,
  SdkworkIamInstallation,
  SdkworkIamInstallationAccessToken,
  SdkworkIamInstallationDraft,
  SdkworkIamInstallationSummary,
  SdkworkIamInstallationType,
  SdkworkIamInstallationUpdateDraft,
  SdkworkIamTenantLogoMediaResource,
  SdkworkIamTenantMember,
  SdkworkIamTenantMemberDraft,
  SdkworkIamTenantState,
} from "../types/tenant-admin-types";

export function createSdkworkIamTenantController(
  input: SdkworkIamService | CreateSdkworkIamTenantControllerInput,
): SdkworkIamTenantController {
  const resolved = resolveInput(input);
  let state: SdkworkIamTenantState = {
    applications: [],
    applicationSummary: emptyApplicationSummary(),
    listPageInfo: undefined,
    members: [],
    selectedTenant: undefined,
    status: "idle",
    tenants: [],
  };

  const tenantsSession = createSdkWorkPagedListSession({
    fetchPage: (query) => resolved.service.iam.tenants.list(query),
    mapItem: toTenant,
  });

  let membersSessionTenantId = "";
  let membersSession = createMembersSession("");
  let applicationsSessionTenantId = "";
  let applicationsSession = createApplicationsSession("");

  function createMembersSession(tenantId: string) {
    return createSdkWorkPagedListSession({
      fetchPage: (query) => resolved.service.iam.tenants.members.list(tenantId, query),
      mapItem: toTenantMember,
    });
  }

  function createApplicationsSession(tenantId: string) {
    return createSdkWorkPagedListSession({
      fetchPage: (query) => resolved.service.iam.installations.list(tenantId, query),
      mapItem: toInstallation,
    });
  }

  function syncTenantsListPageInfo() {
    return { tenants: tenantsSession.getPageInfo() };
  }

  function syncMembersListPageInfo() {
    return { members: membersSession.getPageInfo() };
  }

  function syncApplicationsListPageInfo() {
    return { applications: applicationsSession.getPageInfo() };
  }

  const setState = (patch: Partial<SdkworkIamTenantState>) => {
    state = {
      ...state,
      ...patch,
    };
  };

  const controller: SdkworkIamTenantController = {
    createTenant: async (body) => {
      requireId(body.name, "name");
      requireId(body.code, "code");
      setState({ status: "loading" });
      try {
        const tenant = toTenant(await resolved.service.iam.tenants.create(toTenantWirePayload(body)));
        if (!tenant) {
          throw new Error("SDKWork IAM tenant create response is missing tenantId");
        }
        const tenants = [...state.tenants.filter((item) => item.tenantId !== tenant.tenantId), tenant];
        tenantsSession.setItems(tenants);
        setState({ selectedTenant: tenant, status: "ready", tenants });
        return tenant;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    createInstallationAccessToken: async (tenantId, installationId) => {
      const normalizedTenantId = requireId(tenantId, "tenantId");
      const normalizedApplicationId = requireId(installationId, "installationId");
      const application = state.applications.find(
        (item) => item.installationId === normalizedApplicationId,
      );
      const payload = await resolved.service.iam.accessCredentials.create({
        organizationId: application?.organizationId || "0",
        installationId: normalizedApplicationId,
        tenantId: normalizedTenantId,
      });
      const record = toRecord(payload);
      const data = toRecord(record.data);
      const item = toRecord(data.item ?? record.item ?? record);
      const accessToken = optionalString(item.accessCredential) || optionalString(item.accessToken);
      if (!accessToken) {
        throw new Error("SDKWork IAM access credential response is missing accessCredential");
      }
      return {
        accessToken,
        appId: optionalString(item.appId),
        expiresAt: optionalString(item.expiresAt),
        organizationId: optionalString(item.organizationId),
        sessionId: optionalString(item.sessionId),
        installationId: optionalString(item.installationId) || normalizedApplicationId,
        tenantId: optionalString(item.tenantId) || normalizedTenantId,
      };
    },
    createTenantMember: async (tenantId, body) => {
      const normalizedTenantId = requireId(tenantId, "tenantId");
      requireId(body.userId, "userId");
      setState({ status: "loading" });
      try {
        const member = toTenantMember(
          await resolved.service.iam.tenants.members.create(normalizedTenantId, body as unknown as Record<string, unknown>),
        );
        if (!member) {
          throw new Error("SDKWork IAM tenant member create response is missing userId");
        }
        const members = [...state.members.filter((item) => item.userId !== member.userId), member];
        membersSession.setItems(members);
        setState({ members, status: "ready" });
        return member;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    deleteTenant: async (tenantId) => {
      const normalizedTenantId = requireId(tenantId, "tenantId");
      setState({ status: "loading" });
      try {
        await resolved.service.iam.tenants.delete(normalizedTenantId);
        const tenants = state.tenants.filter((tenant) => tenant.tenantId !== normalizedTenantId);
        tenantsSession.setItems(tenants);
        const selectedTenant = state.selectedTenant?.tenantId === normalizedTenantId ? undefined : state.selectedTenant;
        setState({
          applications: selectedTenant ? state.applications : [],
          applicationSummary: selectedTenant ? state.applicationSummary : emptyApplicationSummary(),
          members: selectedTenant ? state.members : [],
          selectedTenant,
          status: "ready",
          tenants,
        });
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    getApplicationCapabilities: () => {
      const permissionScope = resolved.permissionScope;
      const hasPermission = (permission: string) =>
        permissionScope === undefined || hasPermissionInScope(permissionScope, permission);
      return {
        canEnable: hasPermission("iam.installations.enable"),
        canProvision: hasPermission("iam.installations.provision"),
        canUpdate: hasPermission("iam.installations.update"),
      };
    },
    getSelectedTenant: () => state.selectedTenant,
    getState: () => ({
      ...state,
      listPageInfo: state.listPageInfo
        ? {
            applications: state.listPageInfo.applications ? { ...state.listPageInfo.applications } : undefined,
            members: state.listPageInfo.members ? { ...state.listPageInfo.members } : undefined,
            tenants: state.listPageInfo.tenants ? { ...state.listPageInfo.tenants } : undefined,
          }
        : undefined,
      applications: state.applications.map((application) => ({
        ...application,
        accessPermissions: [...application.accessPermissions],
      })),
      applicationSummary: { ...state.applicationSummary },
      members: [...state.members],
      selectedTenant: state.selectedTenant ? { ...state.selectedTenant } : undefined,
      tenants: [...state.tenants],
    }),
    listInstallations: async (tenantId, params) => {
      const normalizedTenantId = requireId(tenantId, "tenantId");
      if (applicationsSessionTenantId !== normalizedTenantId) {
        applicationsSessionTenantId = normalizedTenantId;
        applicationsSession = createApplicationsSession(normalizedTenantId);
      }
      setState({ status: "loading" });
      try {
        const applications = await applicationsSession.list(params) as SdkworkIamInstallation[];
        setState({
          applications,
          listPageInfo: { ...state.listPageInfo, ...syncApplicationsListPageInfo() },
          status: "ready",
        });
        return applications;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    listTenantMembers: async (tenantId, params) => {
      const normalizedTenantId = requireId(tenantId, "tenantId");
      if (membersSessionTenantId !== normalizedTenantId) {
        membersSessionTenantId = normalizedTenantId;
        membersSession = createMembersSession(normalizedTenantId);
      }
      setState({ status: "loading" });
      try {
        const members = await membersSession.list(params) as SdkworkIamTenantMember[];
        setState({
          listPageInfo: { ...state.listPageInfo, ...syncMembersListPageInfo() },
          members,
          status: "ready",
        });
        return members;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    listTenants: async (params) => {
      setState({ status: "loading" });
      try {
        const tenants = await tenantsSession.list(params) as SdkworkIamTenant[];
        const selectedTenant = state.selectedTenant
          ? tenants.find((tenant) => tenant.tenantId === state.selectedTenant?.tenantId) ?? state.selectedTenant
          : tenants.find((tenant) => tenant.tenantId === resolved.selectedTenantId);
        setState({
          listPageInfo: { ...state.listPageInfo, ...syncTenantsListPageInfo() },
          selectedTenant,
          status: "ready",
          tenants,
        });
        return tenants;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    loadMoreInstallations: async (tenantId) => {
      const normalizedTenantId = requireId(tenantId, "tenantId");
      if (applicationsSessionTenantId !== normalizedTenantId) {
        return controller.listInstallations(normalizedTenantId);
      }
      setState({ status: "loading" });
      try {
        const applications = await applicationsSession.loadMore() as SdkworkIamInstallation[];
        setState({
          applications,
          listPageInfo: { ...state.listPageInfo, ...syncApplicationsListPageInfo() },
          status: "ready",
        });
        return applications;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    loadMoreTenantMembers: async (tenantId) => {
      const normalizedTenantId = requireId(tenantId, "tenantId");
      if (membersSessionTenantId !== normalizedTenantId) {
        return controller.listTenantMembers(normalizedTenantId);
      }
      setState({ status: "loading" });
      try {
        const members = await membersSession.loadMore() as SdkworkIamTenantMember[];
        setState({
          listPageInfo: { ...state.listPageInfo, ...syncMembersListPageInfo() },
          members,
          status: "ready",
        });
        return members;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    loadMoreTenants: async () => {
      setState({ status: "loading" });
      try {
        const tenants = await tenantsSession.loadMore() as SdkworkIamTenant[];
        const selectedTenant = state.selectedTenant
          ? tenants.find((tenant) => tenant.tenantId === state.selectedTenant?.tenantId) ?? state.selectedTenant
          : state.selectedTenant;
        setState({
          listPageInfo: { ...state.listPageInfo, ...syncTenantsListPageInfo() },
          selectedTenant,
          status: "ready",
          tenants,
        });
        return tenants;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    removeTenantMember: async (tenantId, userId) => {
      const normalizedTenantId = requireId(tenantId, "tenantId");
      const normalizedUserId = requireId(userId, "userId");
      setState({ status: "loading" });
      try {
        await resolved.service.iam.tenants.members.delete(normalizedTenantId, normalizedUserId);
        const members = state.members.filter((member) => member.userId !== normalizedUserId);
        membersSession.setItems(members);
        setState({
          members,
          status: "ready",
        });
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    provisionInstallation: async (tenantId, body) => {
      const normalizedTenantId = requireId(tenantId, "tenantId");
      validateApplicationDraft(body);
      setState({ status: "loading" });
      try {
        const application = toInstallation(
          await resolved.service.iam.installations.management.create(
            normalizedTenantId,
            applicationDraftToRecord(body),
          ),
        );
        if (!application) {
          throw new Error("SDKWork IAM tenant application provision response is missing installationId");
        }
        const applications = [
          application,
          ...state.applications.filter((item) => item.installationId !== application.installationId),
        ];
        applicationsSession.setItems(applications);
        setState({ applications, status: "ready" });
        return application;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    retrieveInstallationSummary: async (tenantId) => {
      const normalizedTenantId = requireId(tenantId, "tenantId");
      setState({ status: "loading" });
      try {
        const summary = toInstallationSummary(
          await resolved.service.iam.installations.summary.retrieve(normalizedTenantId),
        );
        setState({ applicationSummary: summary, status: "ready" });
        return summary;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    setInstallationEnabled: async (tenantId, installationId, enabled) => {
      const normalizedTenantId = requireId(tenantId, "tenantId");
      const normalizedApplicationId = requireId(installationId, "installationId");
      setState({ status: "loading" });
      try {
        const resource = resolved.service.iam.installations.management;
        const application = toInstallation(
          enabled
            ? await resource.enable(normalizedTenantId, normalizedApplicationId)
            : await resource.disable(normalizedTenantId, normalizedApplicationId),
        );
        if (!application) {
          throw new Error("SDKWork IAM tenant application status response is missing installationId");
        }
        replaceApplicationInState(application);
        return application;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    selectTenant: async (tenantId, params) => {
      const normalizedTenantId = requireId(tenantId, "tenantId");
      const tenants = state.tenants.length > 0 ? state.tenants : await controller.listTenants(params);
      const selectedTenant = tenants.find((tenant) => tenant.tenantId === normalizedTenantId || tenant.id === normalizedTenantId);
      setState({ selectedTenant });
      return selectedTenant;
    },
    updateTenant: async (tenantId, body) => {
      const normalizedTenantId = requireId(tenantId, "tenantId");
      setState({ status: "loading" });
      try {
        const tenant = toTenant(await resolved.service.iam.tenants.update(normalizedTenantId, toTenantWirePayload(body)))
          ?? toTenant(await resolved.service.iam.tenants.retrieve(normalizedTenantId));
        if (!tenant) {
          throw new Error("SDKWork IAM tenant update response is missing tenantId");
        }
        const tenants = state.tenants.map((item) => (item.tenantId === tenant.tenantId ? tenant : item));
        tenantsSession.setItems(tenants);
        const selectedTenant = state.selectedTenant?.tenantId === tenant.tenantId ? tenant : state.selectedTenant;
        setState({ selectedTenant, status: "ready", tenants });
        return tenant;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    updateInstallation: async (tenantId, installationId, body) => {
      const normalizedTenantId = requireId(tenantId, "tenantId");
      const normalizedApplicationId = requireId(installationId, "installationId");
      setState({ status: "loading" });
      try {
        const application = toInstallation(
          await resolved.service.iam.installations.management.update(
            normalizedTenantId,
            normalizedApplicationId,
            applicationUpdateDraftToRecord(body),
          ),
        );
        if (!application) {
          throw new Error("SDKWork IAM tenant application update response is missing installationId");
        }
        replaceApplicationInState(application);
        return application;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    updateTenantMember: async (tenantId, userId, body) => {
      const normalizedTenantId = requireId(tenantId, "tenantId");
      const normalizedUserId = requireId(userId, "userId");
      setState({ status: "loading" });
      try {
        const member = toTenantMember(
          await resolved.service.iam.tenants.members.update(normalizedTenantId, normalizedUserId, body),
        );
        if (!member) {
          throw new Error("SDKWork IAM tenant member update response is missing userId");
        }
        const members = state.members.map((item) => (item.userId === member.userId ? member : item));
        membersSession.setItems(members);
        setState({ members, status: "ready" });
        return member;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
  };

  function replaceApplicationInState(application: SdkworkIamInstallation) {
    const applications = state.applications.map((item) =>
      item.installationId === application.installationId ? application : item,
    );
    applicationsSession.setItems(applications);
    setState({ applications, status: "ready" });
  }

  return controller;
}

function emptyApplicationSummary(): SdkworkIamInstallationSummary {
  return { disabled: 0, enabled: 0, pending: 0, total: 0 };
}

/**
 * The `installations.management.create` wire payload.
 *
 * `IAM_SPEC` v3 retires application templates: an installation is opened from
 * the deploy application it serves plus explicit attributes, so the record
 * carries `deployApplicationId`/`applicationType` and never `appKey`/
 * `templateId`. `primaryDomain` is optional with `minLength: 1`, so an empty
 * value is omitted instead of travelling as `""`; `accessPermissions` always
 * travels because an empty array is an explicit "no API scope" choice.
 */
function applicationDraftToRecord(body: SdkworkIamInstallationDraft): Record<string, unknown> {
  const record: Record<string, unknown> = {
    accessPermissions: [...body.accessPermissions],
    applicationType: requireApplicationType(body.applicationType),
    deployApplicationId: requireId(body.deployApplicationId, "deployApplicationId"),
    displayName: body.displayName.trim(),
    environment: body.environment.trim(),
    instanceKey: body.instanceKey.trim(),
    organizationId: body.organizationId.trim(),
  };
  const primaryDomain = body.primaryDomain.trim();
  if (primaryDomain) {
    record.primaryDomain = primaryDomain;
  }
  if (body.runtimeConfig) {
    record.runtimeConfig = body.runtimeConfig;
  }
  const provisioningIdempotencyKey = (body.provisioningIdempotencyKey ?? "").trim();
  if (provisioningIdempotencyKey) {
    record.provisioningIdempotencyKey = provisioningIdempotencyKey;
  }
  return record;
}

function applicationUpdateDraftToRecord(body: SdkworkIamInstallationUpdateDraft): Record<string, unknown> {
  return {
    accessPermissions: body.accessPermissions,
    primaryDomain: body.primaryDomain.trim(),
  };
}

/**
 * Drawer-level validation. `deployApplicationId` and `applicationType` are the
 * two fields the retired template used to supply, so each failure names its
 * own field instead of degrading into a generic provisioning error.
 */
function validateApplicationDraft(body: SdkworkIamInstallationDraft) {
  requireId(body.deployApplicationId, "deployApplicationId");
  requireApplicationType(body.applicationType);
  requireId(body.displayName, "displayName");
  requireId(body.environment, "environment");
  requireId(body.instanceKey, "instanceKey");
  requireId(body.organizationId, "organizationId");
}

function requireApplicationType(value: string): SdkworkIamInstallationType {
  const normalized = value.trim().toLowerCase();
  const applicationType = SDKWORK_IAM_TENANT_APPLICATION_TYPES.find((candidate) => candidate === normalized);
  if (!applicationType) {
    throw new Error(
      normalized
        ? `SDKWork IAM tenant controller requires applicationType to be one of ${SDKWORK_IAM_TENANT_APPLICATION_TYPES.join(" | ")}`
        : "SDKWork IAM tenant controller requires applicationType",
    );
  }
  return applicationType;
}

function resolveInput(
  input: SdkworkIamService | CreateSdkworkIamTenantControllerInput,
): CreateSdkworkIamTenantControllerInput {
  if ("service" in input) {
    return input;
  }

  return { service: input };
}

function toTenant(value: unknown): SdkworkIamTenant | undefined {
  const record = toRecord(value);
  const tenantId = optionalString(record.tenantId) || optionalString(record.tenant_id) || optionalString(record.id);
  if (!tenantId) {
    return undefined;
  }

  return {
    address: optionalString(record.address),
    code: optionalString(record.code),
    contactEmail: optionalString(record.contactEmail) || optionalString(record.contact_email),
    contactPhone: optionalString(record.contactPhone) || optionalString(record.contact_phone),
    createdAt: optionalString(record.createdAt) || optionalString(record.created_at),
    description: optionalString(record.description),
    id: optionalString(record.id) || tenantId,
    industryCategory: optionalString(record.industryCategory) || optionalString(record.industry_category),
    logo: tenantLogoSnapshot(record.logo),
    logoUrl: optionalString(record.logoUrl) || tenantLogoSnapshotDeliveryUrl(record.logo),
    name: optionalString(record.name) || optionalString(record.tenantName) || tenantId,
    status: optionalString(record.status),
    tenantId,
    updatedAt: optionalString(record.updatedAt) || optionalString(record.updated_at),
  };
}

/**
 * The wire payload for tenants.create / tenants.update.
 *
 * Required identifiers always travel; nullable profile fields travel only when
 * they carry a value, and a key present with an empty value becomes an explicit
 * empty string so the backend can clear the column. Removing the stored logo is
 * an explicit `logo: null` patch — an omitted key means "leave the snapshot
 * unchanged" on the backend.
 */
function toTenantWirePayload(draft: Partial<SdkworkIamTenantDraft>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const text = (key: keyof SdkworkIamTenantDraft, value: string | undefined) => {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (normalized) {
      payload[key] = normalized;
    }
  };
  text("name", draft.name);
  text("code", draft.code);
  text("status", draft.status);
  text("industryCategory", draft.industryCategory);
  text("description", draft.description);
  text("contactPhone", draft.contactPhone);
  text("contactEmail", draft.contactEmail);
  text("address", draft.address);
  if (draft.logo) {
    payload.logo = draft.logo;
  }
  text("logoUrl", draft.logoUrl);
  if (!draft.logo && !(draft.logoUrl ?? "").trim() && "logo" in draft) {
    payload.logo = null;
  }
  for (const key of ["industryCategory", "description", "contactPhone", "contactEmail", "address"] as const) {
    if (key in draft && payload[key] === undefined) {
      payload[key] = "";
    }
  }
  return payload;
}

/** Parses the tenant logo snapshot the backend returns on `logo`. */
function tenantLogoSnapshot(value: unknown): SdkworkIamTenantLogoMediaResource | undefined {
  const record = toRecord(value);
  if (Object.keys(record).length === 0) {
    return undefined;
  }
  const metadata = toRecord(record.metadata);
  const drive = toRecord(metadata.drive);
  const resource: SdkworkIamTenantLogoMediaResource = {
    fileName: optionalString(record.fileName) || optionalString(record.file_name),
    id: optionalString(record.id),
    kind: optionalString(record.kind),
    metadata: Object.keys(drive).length > 0
      ? {
          drive: {
            nodeId: optionalString(drive.nodeId) || optionalString(drive.node_id),
            spaceId: optionalString(drive.spaceId) || optionalString(drive.space_id),
            spaceType: optionalString(drive.spaceType) || optionalString(drive.space_type),
          },
        }
      : undefined,
    mimeType: optionalString(record.mimeType) || optionalString(record.mime_type),
    publicUrl: optionalString(record.publicUrl) || optionalString(record.public_url),
    sizeBytes: optionalString(record.sizeBytes) || optionalString(record.size_bytes),
    source: optionalString(record.source),
    uri: optionalString(record.uri),
    url: optionalString(record.url),
  };
  if (!resource.uri && !resource.url && !resource.publicUrl && !resource.id) {
    return undefined;
  }
  return resource;
}

/**
 * Browser-usable delivery URL of the tenant logo snapshot. A `drive://` uri is
 * a Drive reference, not a URL: Drive-backed logos resolve through the injected
 * preview reader instead.
 */
function tenantLogoSnapshotDeliveryUrl(value: unknown): string | undefined {
  const record = toRecord(value);
  return optionalString(record.publicUrl) || optionalString(record.url);
}

function toTenantMember(value: unknown): SdkworkIamTenantMember | undefined {
  const record = toRecord(value);
  const userId = optionalString(record.userId) || optionalString(record.user_id) || optionalString(record.id);
  if (!userId) {
    return undefined;
  }

  return {
    displayName: optionalString(record.displayName) || optionalString(record.name) || optionalString(record.nickname),
    email: optionalString(record.email),
    id: optionalString(record.id) || userId,
    roleCode: optionalString(record.roleCode) || optionalString(record.role_code),
    status: optionalString(record.status),
    tenantId: optionalString(record.tenantId) || optionalString(record.tenant_id),
    userId,
    username: optionalString(record.username),
  };
}

function toInstallation(value: unknown): SdkworkIamInstallation | undefined {
  const record = toRecord(value);
  const installationId = optionalString(record.installationId)
    || optionalString(record.tenant_application_id)
    || optionalString(record.id);
  const appId = optionalString(record.appId) || optionalString(record.app_id);
  const tenantId = optionalString(record.tenantId) || optionalString(record.tenant_id);
  if (!installationId || !appId || !tenantId) {
    return undefined;
  }

  return {
    accessPermissions: toStringArray(record.accessPermissions ?? record.access_permissions),
    appId,
    applicationType: optionalString(record.applicationType) ?? optionalString(record.application_type) ?? "other",
    createdAt: optionalString(record.createdAt) || optionalString(record.created_at),
    deployApplicationId: optionalString(record.deployApplicationId) || optionalString(record.deploy_application_id),
    displayName: optionalString(record.displayName) || optionalString(record.display_name) || appId,
    environment: optionalString(record.environment) || "unknown",
    instanceKey: optionalString(record.instanceKey) || optionalString(record.instance_key) || appId,
    organizationId: optionalString(record.organizationId) || optionalString(record.organization_id) || "0",
    primaryDomain: optionalString(record.primaryDomain) || optionalString(record.primary_domain),
    status: optionalString(record.status) || "pending_config",
    installationId,
    tenantId,
    updatedAt: optionalString(record.updatedAt) || optionalString(record.updated_at),
  };
}

function toInstallationSummary(value: unknown): SdkworkIamInstallationSummary {
  const record = toRecord(value);
  return {
    disabled: toNonNegativeNumber(record.disabled),
    enabled: toNonNegativeNumber(record.enabled),
    pending: toNonNegativeNumber(record.pending),
    total: toNonNegativeNumber(record.total),
  };
}

function toNonNegativeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(optionalString).filter((item): item is string => Boolean(item));
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : value === undefined || value === null ? "" : String(value).trim();
  return normalized || undefined;
}

function requireId(value: unknown, name: string): string {
  const normalized = optionalString(value);
  if (!normalized) {
    throw new Error(`SDKWork IAM tenant controller requires ${name}`);
  }

  return normalized;
}
