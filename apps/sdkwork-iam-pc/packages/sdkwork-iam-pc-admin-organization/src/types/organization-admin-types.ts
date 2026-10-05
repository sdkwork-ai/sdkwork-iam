import type { DriveUploadImageService } from "@sdkwork/drive-upload-image-core";
import type { SdkWorkPageInfo } from "@sdkwork/iam-contracts";
import type { SdkworkIamService } from "@sdkwork/iam-service";

/**
 * The organization logo media-resource snapshot (`iam_organization.logo_resource_snapshot`).
 *
 * Mirrors the user avatar resource contract: a Drive-backed resource carries
 * `source: "drive"`, the `drive://` uri, and the `metadata.drive` identity
 * block, while a plain external delivery URL is wrapped by the backend into
 * the same object shape.
 */
export interface SdkworkIamOrganizationLogoMediaResource {
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

export interface SdkworkIamOrganizationDraft {
  address?: string;
  code?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  industryCategory?: string;
  /** Drive-backed logo media resource uploaded through the shared component. */
  logo?: SdkworkIamOrganizationLogoMediaResource;
  logoUrl?: string;
  name: string;
  organizationCategory?: string;
  organizationKind?: string;
  parentId?: string;
  status?: string;
  tenantId?: string;
}

export interface SdkworkIamDepartmentDraft {
  code?: string;
  name: string;
  organizationId: string;
  parentDepartmentId?: string;
  status?: string;
}

export interface SdkworkIamOrganizationMembershipDraft {
  membershipKind?: string;
  roleCode?: string;
  status?: string;
  userId: string;
}

export interface SdkworkIamDepartmentAssignmentDraft {
  departmentId: string;
  isPrimary?: boolean;
  organizationMembershipId: string;
}

export interface SdkworkIamDepartmentAssignmentUpdateDraft {
  isPrimary: boolean;
}

export interface SdkworkIamOrganization {
  address?: string;
  code?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  id: string;
  industryCategory?: string;
  /** Raw logo media-resource snapshot the backend returns on `logo`. */
  logo?: SdkworkIamOrganizationLogoMediaResource;
  /** Delivery/display URL resolved from the snapshot (or the plain `logoUrl`). */
  logoUrl?: string;
  name: string;
  organizationCategory?: string;
  organizationId: string;
  organizationKind?: string;
  parentId?: string;
  path?: string;
  status?: string;
  tenantId?: string;
}

export interface SdkworkIamOrganizationMembership {
  displayName?: string;
  email?: string;
  id: string;
  membershipId?: string;
  membershipKind?: string;
  organizationId?: string;
  roleCode?: string;
  status?: string;
  userId: string;
  username?: string;
}

export interface SdkworkIamDepartment {
  code?: string;
  departmentId: string;
  id: string;
  name: string;
  organizationId: string;
  parentDepartmentId?: string;
  path?: string;
  status?: string;
  tenantId?: string;
}

export interface SdkworkIamDepartmentNode extends SdkworkIamDepartment {
  children: SdkworkIamDepartmentNode[];
  depth: number;
}

export interface SdkworkIamDepartmentAssignment {
  assignmentId: string;
  departmentId: string;
  displayName?: string;
  id: string;
  isPrimary?: boolean;
  organizationId?: string;
  organizationMembershipId?: string;
  positionName?: string;
  status?: string;
  userId: string;
}

export interface SdkworkIamPosition {
  departmentId?: string;
  id: string;
  name: string;
  organizationId?: string;
  positionId: string;
  status?: string;
}

export interface SdkworkIamRoleBinding {
  id: string;
  principalId?: string;
  principalKind?: string;
  roleBindingId?: string;
  roleId?: string;
  scopeId?: string;
  scopeKind?: string;
  status?: string;
}

export interface SdkworkIamOrganizationNode extends SdkworkIamOrganization {
  children: SdkworkIamOrganizationNode[];
  depth: number;
}

export interface SdkworkIamOrganizationState {
  departmentAssignmentListPageInfo?: SdkWorkPageInfo;
  departmentAssignments: readonly SdkworkIamDepartmentAssignment[];
  departments: readonly SdkworkIamDepartment[];
  departmentListPageInfo?: SdkWorkPageInfo;
  departmentTree: readonly SdkworkIamDepartmentNode[];
  lastError?: string;
  memberships: readonly SdkworkIamOrganizationMembership[];
  membershipListPageInfo?: SdkWorkPageInfo;
  organizations: readonly SdkworkIamOrganization[];
  organizationListPageInfo?: SdkWorkPageInfo;
  positions: readonly SdkworkIamPosition[];
  positionListPageInfo?: SdkWorkPageInfo;
  roleBindings: readonly SdkworkIamRoleBinding[];
  roleBindingListPageInfo?: SdkWorkPageInfo;
  selectedOrganization?: SdkworkIamOrganization;
  status: "idle" | "loading" | "ready" | "error";
  tree: readonly SdkworkIamOrganizationNode[];
}

export interface CreateSdkworkIamOrganizationControllerInput {
  selectedOrganizationId?: string;
  service: SdkworkIamService;
}

export interface SdkworkIamOrganizationController {
  addMembership(organizationId: string, body: SdkworkIamOrganizationMembershipDraft | Record<string, unknown>): Promise<SdkworkIamOrganizationMembership>;
  buildDepartmentTree(departments?: readonly SdkworkIamDepartment[]): readonly SdkworkIamDepartmentNode[];
  buildOrganizationTree(organizations?: readonly SdkworkIamOrganization[]): readonly SdkworkIamOrganizationNode[];
  createDepartment(body: SdkworkIamDepartmentDraft): Promise<SdkworkIamDepartment>;
  createDepartmentAssignment(body: SdkworkIamDepartmentAssignmentDraft): Promise<SdkworkIamDepartmentAssignment>;
  createOrganization(body: SdkworkIamOrganizationDraft): Promise<SdkworkIamOrganization>;
  deleteDepartment(departmentId: string): Promise<void>;
  deleteOrganization(organizationId: string): Promise<void>;
  getState(): SdkworkIamOrganizationState;
  listDepartmentAssignments(departmentId: string, params?: Record<string, unknown>): Promise<readonly SdkworkIamDepartmentAssignment[]>;
  loadMoreDepartmentAssignments(departmentId: string): Promise<readonly SdkworkIamDepartmentAssignment[]>;
  listOrganizations(params?: Record<string, unknown>): Promise<readonly SdkworkIamOrganization[]>;
  loadMoreOrganizations(): Promise<readonly SdkworkIamOrganization[]>;
  listPositions(params?: Record<string, unknown>): Promise<readonly SdkworkIamPosition[]>;
  loadMorePositions(): Promise<readonly SdkworkIamPosition[]>;
  listRoleBindings(params?: Record<string, unknown>): Promise<readonly SdkworkIamRoleBinding[]>;
  loadMoreRoleBindings(): Promise<readonly SdkworkIamRoleBinding[]>;
  listDepartments(organizationId: string, params?: Record<string, unknown>): Promise<readonly SdkworkIamDepartment[]>;
  loadMoreDepartments(organizationId: string): Promise<readonly SdkworkIamDepartment[]>;
  listMemberships(organizationId: string, params?: Record<string, unknown>): Promise<readonly SdkworkIamOrganizationMembership[]>;
  loadMoreMemberships(organizationId: string): Promise<readonly SdkworkIamOrganizationMembership[]>;
  selectOrganization(organizationId: string, params?: Record<string, unknown>): Promise<SdkworkIamOrganization | undefined>;
  updateDepartment(departmentId: string, body: Partial<SdkworkIamDepartmentDraft>): Promise<SdkworkIamDepartment>;
  updateDepartmentAssignment(
    assignmentId: string,
    body: SdkworkIamDepartmentAssignmentUpdateDraft,
  ): Promise<SdkworkIamDepartmentAssignment>;
  updateMembership(membershipId: string, body: Partial<SdkworkIamOrganizationMembershipDraft>): Promise<SdkworkIamOrganizationMembership>;
  updateOrganization(organizationId: string, body: Partial<SdkworkIamOrganizationDraft>): Promise<SdkworkIamOrganization>;
}

/**
 * Host-injected organization logo capability for the admin workspace.
 *
 * The workspace never touches the drive SDK or upload declarations itself:
 * the host (for example the webserver console) composes both and injects this
 * service. `attachLogo` receives the existing organization's id because the
 * Drive upload contract attributes uploads to an existing entity
 * (`DRIVE_SPEC.md` section 18.3) — the create flow persists the organization
 * first and uploads second.
 */
export interface SdkworkIamOrganizationLogoService {
  /** Transient display URL for a stored logo snapshot (bounded Drive preview). */
  resolveLogoUrl(logo: SdkworkIamOrganizationLogoMediaResource): Promise<string | undefined>;
  /** Uploads the picked image against the existing organization and returns the snapshot resource. */
  attachLogo(organizationId: string, file: File): Promise<SdkworkIamOrganizationLogoMediaResource>;
}

export interface SdkworkIamOrganizationAdminWorkspaceProps {
  controller: SdkworkIamOrganizationController;
  /**
   * Host-injected Drive image-upload capability (`createDriveUploadImageService`).
   *
   * Present: the logo drawer renders the shared `DriveUploadImage` component
   * and uploads land in Drive through the host's declared intent. Absent: the
   * drawer degrades to the plain external-URL field and offers no file picker
   * — there is no local data-URL fallback, because persisting a base64 payload
   * would be a fake upload (`DRIVE_SPEC.md` section 18).
   */
  driveUploadImageService?: DriveUploadImageService;
  /**
   * Host-injected logo attach/resolve capability. Present: the create drawer
   * accepts a file and the detail header resolves Drive-backed snapshots.
   * Absent: create mode offers the external-URL field only.
   */
  logoService?: SdkworkIamOrganizationLogoService;
  permissions?: {
    departments: {
      create: boolean;
      delete: boolean;
      read: boolean;
      update: boolean;
    };
    memberships: {
      create: boolean;
      read: boolean;
      update: boolean;
    };
    organizations: {
      create: boolean;
      delete: boolean;
      update: boolean;
    };
    positions: {
      read: boolean;
    };
    roleBindings: {
      read: boolean;
    };
  };
  onOpenStructure?: (organization: SdkworkIamOrganization) => void;
}

export interface SdkworkIamOrganizationStructureWorkspaceProps {
  controller: SdkworkIamOrganizationController;
  onBack?: () => void;
  organizationId: string;
  permissions?: {
    assignments: {
      create: boolean;
      read: boolean;
      update: boolean;
    };
    departments: {
      create: boolean;
      delete: boolean;
      update: boolean;
    };
    memberships: {
      read: boolean;
    };
  };
}
