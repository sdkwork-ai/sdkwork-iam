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

/**
 * The product-semantic application types the backend accepts when an
 * installation is provisioned.
 *
 * The value names the endpoint the installation serves, not its rendering
 * technology. Application templates are retired, so this list is the only
 * source of `applicationType`: nothing else can infer it.
 */
export const SDKWORK_IAM_TENANT_APPLICATION_TYPES = [
  "api",
  "h5",
  "pc",
  "flutter",
  "miniprogram",
  "ios",
  "android",
  "harmonyos",
  "desktop",
  "other",
] as const;

/** One product-semantic application type; the backend rejects anything else. */
export type SdkworkIamInstallationType = (typeof SDKWORK_IAM_TENANT_APPLICATION_TYPES)[number];

export interface SdkworkIamInstallation {
  accessPermissions: readonly string[];
  appId: string;
  applicationType: string;
  createdAt?: string;
  /**
   * Deploy application this installation serves. It is the identity every
   * access token carries, and the installation/service relation is one-to-one.
   */
  deployApplicationId?: string;
  displayName: string;
  environment: string;
  instanceKey: string;
  organizationId: string;
  primaryDomain?: string;
  status: string;
  installationId: string;
  tenantId: string;
  updatedAt?: string;
}

/**
 * The operator draft behind the provision drawer.
 *
 * `applicationType` is `""` until the operator picks one: with templates
 * retired nothing supplies a default, so the empty string is the explicit
 * "not chosen yet" state the drawer validates against.
 */
export interface SdkworkIamInstallationDraft {
  accessPermissions: string[];
  applicationType: SdkworkIamInstallationType | "";
  /** Deploy application this installation serves (`deployApplicationId`); required. */
  deployApplicationId: string;
  displayName: string;
  environment: string;
  instanceKey: string;
  organizationId: string;
  primaryDomain: string;
  /** Explicit runtime config (`oauth.relyingParty`, ...); absent sends none. */
  runtimeConfig?: Record<string, unknown>;
  /** Replay-safe key for the cross-module provisioning call. */
  provisioningIdempotencyKey?: string;
}

export interface SdkworkIamInstallationUpdateDraft {
  accessPermissions: string[];
  primaryDomain: string;
}

/** Short-lived delegated access credential issued for one tenant application. */
export interface SdkworkIamInstallationAccessToken {
  accessToken: string;
  appId?: string;
  expiresAt?: string;
  organizationId?: string;
  sessionId?: string;
  installationId?: string;
  tenantId?: string;
}

export interface SdkworkIamInstallationSummary {
  disabled: number;
  enabled: number;
  pending: number;
  total: number;
}

export interface SdkworkIamInstallationCapabilities {
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
  applications: readonly SdkworkIamInstallation[];
  applicationSummary: SdkworkIamInstallationSummary;
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
  createInstallationAccessToken(
    tenantId: string,
    installationId: string,
  ): Promise<SdkworkIamInstallationAccessToken>;
  createTenantMember(tenantId: string, body: SdkworkIamTenantMemberDraft): Promise<SdkworkIamTenantMember>;
  deleteTenant(tenantId: string): Promise<void>;
  getApplicationCapabilities(): SdkworkIamInstallationCapabilities;
  getSelectedTenant(): SdkworkIamTenant | undefined;
  getState(): SdkworkIamTenantState;
  listTenantMembers(tenantId: string, params?: Record<string, unknown>): Promise<readonly SdkworkIamTenantMember[]>;
  listInstallations(tenantId: string, params?: Record<string, unknown>): Promise<readonly SdkworkIamInstallation[]>;
  loadMoreInstallations(tenantId: string): Promise<readonly SdkworkIamInstallation[]>;
  listTenants(params?: Record<string, unknown>): Promise<readonly SdkworkIamTenant[]>;
  loadMoreTenantMembers(tenantId: string): Promise<readonly SdkworkIamTenantMember[]>;
  loadMoreTenants(): Promise<readonly SdkworkIamTenant[]>;
  removeTenantMember(tenantId: string, userId: string): Promise<void>;
  provisionInstallation(tenantId: string, body: SdkworkIamInstallationDraft): Promise<SdkworkIamInstallation>;
  retrieveInstallationSummary(tenantId: string): Promise<SdkworkIamInstallationSummary>;
  setInstallationEnabled(tenantId: string, installationId: string, enabled: boolean): Promise<SdkworkIamInstallation>;
  selectTenant(tenantId: string, params?: Record<string, unknown>): Promise<SdkworkIamTenant | undefined>;
  updateTenant(tenantId: string, body: Partial<SdkworkIamTenantDraft>): Promise<SdkworkIamTenant>;
  updateInstallation(tenantId: string, installationId: string, body: SdkworkIamInstallationUpdateDraft): Promise<SdkworkIamInstallation>;
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

export interface SdkworkIamInstallationsAdminWorkspaceProps {
  controller: SdkworkIamTenantController;
}
