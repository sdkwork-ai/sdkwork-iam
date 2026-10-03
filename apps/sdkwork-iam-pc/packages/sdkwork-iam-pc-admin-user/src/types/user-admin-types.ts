import type { SdkWorkPageInfo } from "@sdkwork/iam-contracts";
import type { SdkworkIamService } from "@sdkwork/iam-service";

/**
 * Avatar media reference stored on a user directory record.
 *
 * Declared locally because the drive app SDK intentionally does not export a
 * `MediaResource` type; the shape follows `DRIVE_SPEC.md` section 10
 * (drive-backed profile: `id`, `kind`, `source: "drive"`, `uri`, and the
 * `metadata.drive` block) while still accepting the plain external-URL shape
 * the iam backend wraps from `avatarUrl`.
 */
export interface SdkworkIamAdminUserAvatarResource {
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

/**
 * Host-injected avatar capability for the user admin workspace.
 *
 * The workspace never touches the drive SDK or upload declarations itself:
 * the host (for example the webserver console) composes both and injects this
 * service. `uploadAvatar` receives the existing user's id because the Drive
 * upload contract attributes uploads to an existing entity
 * (`DRIVE_SPEC.md` section 18.3) — the create flow persists the user first
 * and uploads second.
 */
export interface SdkworkIamAdminUserAvatarService {
  /** Resolves a stored avatar resource to a transient display URL. */
  resolveAvatarUrl(avatar: SdkworkIamAdminUserAvatarResource): Promise<string | undefined>;
  /** Uploads the picked image for an existing user and returns the stored resource. */
  uploadAvatar(userId: string, file: File): Promise<SdkworkIamAdminUserAvatarResource>;
}

export interface SdkworkIamAdminUser {
  avatar?: SdkworkIamAdminUserAvatarResource;
  avatarUrl?: string;
  birthDate?: string;
  country?: string;
  createdAt?: string;
  displayName?: string;
  email?: string;
  gender?: string;
  id: string;
  lastLoginAt?: string;
  phone?: string;
  status?: string;
  userId: string;
  username?: string;
}

export interface SdkworkIamAdminUserDraft {
  avatar?: SdkworkIamAdminUserAvatarResource;
  avatarUrl?: string;
  birthDate?: string;
  country?: string;
  displayName?: string;
  email?: string;
  gender?: string;
  initialPassword?: string;
  phone?: string;
  status?: string;
  username?: string;
}

export interface SdkworkIamAdminUserState {
  lastError?: string;
  listPageInfo?: SdkWorkPageInfo;
  selectedUser?: SdkworkIamAdminUser;
  status: "idle" | "loading" | "ready" | "error";
  users: readonly SdkworkIamAdminUser[];
}

export interface CreateSdkworkIamUserAdminControllerInput {
  selectedUserId?: string;
  service: SdkworkIamService;
}

export interface SdkworkIamUserAdminController {
  banUser(userId: string): Promise<SdkworkIamAdminUser>;
  createUser(body: SdkworkIamAdminUserDraft): Promise<SdkworkIamAdminUser>;
  deleteUser(userId: string): Promise<void>;
  getSelectedUser(): SdkworkIamAdminUser | undefined;
  getState(): SdkworkIamAdminUserState;
  listUsers(params?: Record<string, unknown>): Promise<readonly SdkworkIamAdminUser[]>;
  loadMoreUsers(): Promise<readonly SdkworkIamAdminUser[]>;
  retrieveUser(userId: string): Promise<SdkworkIamAdminUser | undefined>;
  selectUser(userId: string): Promise<SdkworkIamAdminUser | undefined>;
  unbanUser(userId: string): Promise<SdkworkIamAdminUser>;
  updateUser(userId: string, body: Partial<SdkworkIamAdminUserDraft>): Promise<SdkworkIamAdminUser>;
}

export interface SdkworkIamUserAdminWorkspaceProps {
  avatarService?: SdkworkIamAdminUserAvatarService;
  controller: SdkworkIamUserAdminController;
  locale?: string | null;
  permissions?: {
    create: boolean;
    delete: boolean;
    update: boolean;
  };
}

export const IAM_PC_ADMIN_USER_ROUTES = {
  basePath: "/admin/iam/users",
  defaultPath: "/admin/iam/users",
  moduleId: "iam-user",
  permissionPrefix: "iam.users",
} as const;
