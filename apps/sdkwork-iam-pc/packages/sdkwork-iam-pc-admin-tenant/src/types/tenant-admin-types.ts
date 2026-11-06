import type { DriveUploadImageService } from "@sdkwork/drive-upload-image-core";
import type { SdkWorkPageInfo } from "@sdkwork/iam-contracts";
import type { SdkworkIamService } from "@sdkwork/iam-service";

/**
 * The tenant logo media-resource snapshot (`iam_tenant.logo_resource_snapshot`).
 *
 * Mirrors the user avatar and organization logo resource contract: a
 * Drive-backed resource carries `source: "drive"`, the `drive://` uri, and the
 * `metadata.drive` identity block, while a legacy external delivery URL is
 * wrapped by the backend into the same object shape.
 */
export interface SdkworkIamTenantLogoMediaResource {
  access?: { expiresAt?: string; visibility?: string };
  fileName?: string;
  id?: string;
  kind?: string;
  metadata?: { drive?: { nodeId?: string; spaceId?: string; spaceType?: string } };
  mimeType?: string;
  publicUrl?: string;
  sizeBytes?: string;
  source?: string;
  uri?: string;
  url?: string;
}

export interface SdkworkIamTenant {
  address?: string;
  code?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt?: string;
  description?: string;
  id: string;
  industryCategory?: string;
  /** Raw logo media-resource snapshot the backend returns on `logo`. */
  logo?: SdkworkIamTenantLogoMediaResource;
  /** Browser-usable logo delivery URL resolved from the snapshot. */
  logoUrl?: string;
  name: string;
  status?: string;
  tenantId: string;
  updatedAt?: string;
}

export interface SdkworkIamTenantMember {
  displayName?: string;
  email?: string;
  id: string;
  roleCode?: string;
  status?: string;
  tenantId?: string;
  userId: string;
  username?: string;
}

export interface SdkworkIamTenantDraft {
  address?: string;
  code?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  industryCategory?: string;
  /** Drive-backed logo media resource uploaded through the shared component. */
  logo?: SdkworkIamTenantLogoMediaResource;
  /**
   * Legacy external delivery URL. Read-only: legacy records keep their value,
   * but the drawer only mutates the logo through the shared upload component.
   */
  logoUrl?: string;
  name: string;
  status?: string;
}

export interface SdkworkIamTenantMemberDraft {
  roleCode?: string;
  userId: string;
}

export interface SdkworkIamTenantApplication {
  accessPermissions: readonly string[];
  appId: string;
  applicationType: string;
  createdAt?: string;
  displayName: string;
  environment: string;
  instanceKey: string;
  organizationId: string;
  primaryDomain?: string;
  status: string;
  templateId: string;
  templateVersion?: string;
  tenantApplicationId: string;
  tenantId: string;
  updatedAt?: string;
}

export interface SdkworkIamTenantApplicationDraft {
  accessPermissions: string[];
  appKey: string;
  applicationType: string;
  displayName: string;
  environment: string;
  instanceKey: string;
  organizationId: string;
  primaryDomain: string;
}

export interface SdkworkIamTenantApplicationUpdateDraft {
  accessPermissions: string[];
  primaryDomain: string;
}

/** Short-lived delegated access credential issued for one tenant application. */
export interface SdkworkIamTenantApplicationAccessToken {
  accessToken: string;
  appId?: string;
  expiresAt?: string;
  organizationId?: string;
  sessionId?: string;
  tenantApplicationId?: string;
  tenantId?: string;
}

export interface SdkworkIamTenantApplicationSummary {
  disabled: number;
  enabled: number;
  pending: number;
  total: number;
}

export interface SdkworkIamTenantApplicationCapabilities {
  canEnable: boolean;
  canProvision: boolean;
  canUpdate: boolean;
}

export interface SdkworkIamTenantState {
  listPageInfo?: {
    applications?: SdkWorkPageInfo;
    members?: SdkWorkPageInfo;
    tenants?: SdkWorkPageInfo;
  };
  applications: readonly SdkworkIamTenantApplication[];
  applicationSummary: SdkworkIamTenantApplicationSummary;
  members: readonly SdkworkIamTenantMember[];
  selectedTenant?: SdkworkIamTenant;
  status: "idle" | "loading" | "ready" | "error";
  tenants: readonly SdkworkIamTenant[];
}

export interface CreateSdkworkIamTenantControllerInput {
  permissionScope?: readonly string[];
  selectedTenantId?: string;
  service: SdkworkIamService;
}

export interface SdkworkIamTenantController {
  createTenant(body: SdkworkIamTenantDraft): Promise<SdkworkIamTenant>;
  createTenantApplicationAccessToken(
    tenantId: string,
    tenantApplicationId: string,
  ): Promise<SdkworkIamTenantApplicationAccessToken>;
  createTenantMember(tenantId: string, body: SdkworkIamTenantMemberDraft): Promise<SdkworkIamTenantMember>;
  deleteTenant(tenantId: string): Promise<void>;
  getApplicationCapabilities(): SdkworkIamTenantApplicationCapabilities;
  getSelectedTenant(): SdkworkIamTenant | undefined;
  getState(): SdkworkIamTenantState;
  listTenantMembers(tenantId: string, params?: Record<string, unknown>): Promise<readonly SdkworkIamTenantMember[]>;
  listTenantApplications(tenantId: string, params?: Record<string, unknown>): Promise<readonly SdkworkIamTenantApplication[]>;
  loadMoreTenantApplications(tenantId: string): Promise<readonly SdkworkIamTenantApplication[]>;
  listTenants(params?: Record<string, unknown>): Promise<readonly SdkworkIamTenant[]>;
  loadMoreTenantMembers(tenantId: string): Promise<readonly SdkworkIamTenantMember[]>;
  loadMoreTenants(): Promise<readonly SdkworkIamTenant[]>;
  removeTenantMember(tenantId: string, userId: string): Promise<void>;
  provisionTenantApplication(tenantId: string, body: SdkworkIamTenantApplicationDraft): Promise<SdkworkIamTenantApplication>;
  retrieveTenantApplicationSummary(tenantId: string): Promise<SdkworkIamTenantApplicationSummary>;
  setTenantApplicationEnabled(tenantId: string, tenantApplicationId: string, enabled: boolean): Promise<SdkworkIamTenantApplication>;
  selectTenant(tenantId: string, params?: Record<string, unknown>): Promise<SdkworkIamTenant | undefined>;
  updateTenant(tenantId: string, body: Partial<SdkworkIamTenantDraft>): Promise<SdkworkIamTenant>;
  updateTenantApplication(tenantId: string, tenantApplicationId: string, body: SdkworkIamTenantApplicationUpdateDraft): Promise<SdkworkIamTenantApplication>;
  updateTenantMember(
    tenantId: string,
    userId: string,
    body: Partial<SdkworkIamTenantMemberDraft>,
  ): Promise<SdkworkIamTenantMember>;
}

export interface SdkworkIamTenantAdminWorkspaceProps {
  controller: SdkworkIamTenantController;
  /**
   * Host-injected Drive image-upload capability (`createDriveUploadImageService`).
   *
   * The tenant drawer and the selected-tenant header render the shared
   * `DriveUploadImage` component and its bounded preview reader: picking
   * uploads against the tenant id through the host's declared upload intent.
   * There is no image-URL field and no local data-URL fallback
   * (`DRIVE_SPEC.md` section 18). Absent: the drawer renders a disabled upload
   * placeholder with an explanatory hint.
   */
  driveUploadImageService?: DriveUploadImageService;
  /**
   * Opens the tenant's unified application management page (IAM, Deploy, and
   * App Store). Present: the tenant table exposes an "应用管理" row action.
   */
  onOpenApplications?: (tenant: SdkworkIamTenant) => void;
  permissions?: {
    members: {
      create: boolean;
      delete: boolean;
      read: boolean;
      update: boolean;
    };
    tenants: {
      create: boolean;
      delete: boolean;
      update: boolean;
    };
  };
}

export interface SdkworkIamTenantApplicationsAdminWorkspaceProps {
  controller: SdkworkIamTenantController;
}
