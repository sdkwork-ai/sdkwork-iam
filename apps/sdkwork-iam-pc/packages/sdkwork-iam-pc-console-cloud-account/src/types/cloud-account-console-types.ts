import type { SdkWorkPageInfo, IamCloudAccountScopeLevel } from "@sdkwork/iam-contracts";
import type { SdkworkIamService } from "@sdkwork/iam-service";

/**
 * One cloud account as the console reads it.
 *
 * Field names follow the route projection in
 * `crates/sdkwork-routes-iam-backend-api/src/provider_accounts.rs`
 * (`account_to_json`), which serves camelCase and deliberately carries no secret
 * bytes: `credentialConfigured` / `credentialCount` are the only credential facts
 * a listing exposes, and the ciphertext stays server-side.
 */
export interface SdkworkIamConsoleCloudAccountRecord {
  id: string;
  uuid?: string;
  tenantId?: string;
  organizationId?: string;
  scopeType: IamCloudAccountScopeLevel | string;
  ownerUserId?: string;
  vendorCode: string;
  accountCode: string;
  displayName: string;
  accountType?: string;
  environment?: string;
  externalAccountId?: string;
  capabilityCodes: readonly string[];
  regionCode?: string;
  isDefault: boolean;
  status?: string;
  version?: string;
  credentialConfigured: boolean;
  credentialCount: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * A credential envelope.
 *
 * Never carries `secretCiphertext`: the route's `credential_to_json` omits it, so
 * a console may show `maskedLabel` and `secretFingerprint` for recognition but can
 * never read a secret back out.
 */
export interface SdkworkIamConsoleCloudAccountCredentialRecord {
  id: string;
  uuid?: string;
  providerAccountId: string;
  credentialKind?: string;
  credentialName?: string;
  maskedLabel?: string;
  secretFingerprint?: string;
  credentialVersion?: string;
  status?: string;
  expiresAt?: string;
  lastRotatedAt?: string;
  lastVerifiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** What a create call sends. `vendorCode`, `accountCode`, and `displayName` are required. */
export interface SdkworkIamConsoleCloudAccountCreateInput {
  vendorCode: string;
  accountCode: string;
  displayName: string;
  /**
   * Ownership level. Omit for a personal account, or pass `user` explicitly.
   * `organization` / `tenant` require `iam.provider_accounts.manage_shared`; the
   * server refuses rather than silently narrowing, so the console may offer the
   * level and let the answer arrive.
   */
  scopeType?: IamCloudAccountScopeLevel;
  organizationId?: string;
  ownerUserId?: string;
  accountType?: string;
  environment?: string;
  externalAccountId?: string;
  capabilityCodes?: readonly string[];
  regionCode?: string;
  isDefault?: boolean;
}

/** A partial update. Absent keys are omitted from the PATCH body, not sent as null. */
export interface SdkworkIamConsoleCloudAccountPatch {
  displayName?: string;
  accountType?: string;
  environment?: string;
  externalAccountId?: string;
  regionCode?: string;
  capabilityCodes?: readonly string[];
  status?: string;
  isDefault?: boolean;
}

/**
 * Body for creating (or rotating) the active credential of a slot.
 *
 * Sending this again for the same slot rotates it: the previously active row is
 * superseded, so consumers referencing the account pick up the new value with no
 * configuration change of their own.
 */
export interface SdkworkIamConsoleCloudAccountCredentialInput {
  credentialKind?: string;
  credentialName?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  secretText?: string;
  expiresAt?: string;
}

/**
 * Which account a requirement lands on, and why.
 *
 * `candidatesByScope` is what lets a console explain the walk instead of only
 * naming a winner: the levels present, and how many accounts each holds.
 */
export interface SdkworkIamConsoleCloudAccountResolution {
  account?: SdkworkIamConsoleCloudAccountRecord;
  matchedScope?: string;
  matchedByDefault: boolean;
  candidatesByScope: readonly {
    scopeType: string;
    count: number;
  }[];
}

export interface SdkworkIamConsoleCloudAccountListPageInfo {
  accounts?: SdkWorkPageInfo;
  credentials?: SdkWorkPageInfo;
}

export interface SdkworkIamConsoleCloudAccountState {
  accounts: readonly SdkworkIamConsoleCloudAccountRecord[];
  credentials: readonly SdkworkIamConsoleCloudAccountCredentialRecord[];
  listPageInfo?: SdkworkIamConsoleCloudAccountListPageInfo;
  /** Which ownership levels the last listing was pinned to; `undefined` means all visible levels. */
  scopeLevel?: IamCloudAccountScopeLevel;
  selectedAccount?: SdkworkIamConsoleCloudAccountRecord;
  status: "idle" | "loading" | "ready" | "error";
}

export interface CreateSdkworkIamConsoleCloudAccountControllerInput {
  service: SdkworkIamService;
}

export interface SdkworkIamConsoleCloudAccountController {
  getState(): SdkworkIamConsoleCloudAccountState;  /**
   * List every level the caller can see.
   *
   * `includePlatform` is a request, not a grant: the server honours it only for a
   * caller holding `manage_shared`, so a member asking for the global defaults
   * simply does not receive them.
   */
  listAccounts(params?: Record<string, unknown>): Promise<readonly SdkworkIamConsoleCloudAccountRecord[]>;
  /** The "my cloud accounts" tab: pins the walk to the caller's own personal accounts. */
  listMyAccounts(params?: Record<string, unknown>): Promise<readonly SdkworkIamConsoleCloudAccountRecord[]>;
  listScopeAccounts(
    scopeLevel: IamCloudAccountScopeLevel,
    params?: Record<string, unknown>,
  ): Promise<readonly SdkworkIamConsoleCloudAccountRecord[]>;
  loadMoreAccounts(): Promise<readonly SdkworkIamConsoleCloudAccountRecord[]>;
  refreshWorkspace(params?: Record<string, unknown>): Promise<readonly SdkworkIamConsoleCloudAccountRecord[]>;
  /**
   * Register an account, and optionally the credential that makes it usable.
   *
   * The credential is a second request, because the account route stores an
   * account and nothing else. Passing one here is what keeps a registration from
   * producing an account that resolves to nothing; the caller is told which half
   * landed through `SdkworkIamCloudAccountCredentialWriteError` when they split.
   */
  createAccount(
    input: SdkworkIamConsoleCloudAccountCreateInput,
    credential?: SdkworkIamConsoleCloudAccountCredentialInput,
  ): Promise<SdkworkIamConsoleCloudAccountRecord>;
  updateAccount(
    providerAccountId: string,
    patch: SdkworkIamConsoleCloudAccountPatch,
  ): Promise<SdkworkIamConsoleCloudAccountRecord | undefined>;
  deleteAccount(providerAccountId: string): Promise<void>;
  /** Promote to the default of the account's own scope level; the server demotes the previous one. */
  setDefaultAccount(providerAccountId: string): Promise<SdkworkIamConsoleCloudAccountRecord | undefined>;
  selectAccount(providerAccountId: string): Promise<SdkworkIamConsoleCloudAccountRecord | undefined>;
  listCredentials(providerAccountId: string): Promise<readonly SdkworkIamConsoleCloudAccountCredentialRecord[]>;
  createCredential(
    providerAccountId: string,
    input: SdkworkIamConsoleCloudAccountCredentialInput,
  ): Promise<SdkworkIamConsoleCloudAccountCredentialRecord | undefined>;
  revokeCredential(
    providerAccountId: string,
    credentialId: string,
  ): Promise<void>;
  /** Preview which account a requirement resolves to, scoped to one vendor. */
  resolveAccount(params: Record<string, unknown>): Promise<SdkworkIamConsoleCloudAccountResolution | undefined>;
}

export interface SdkworkIamConsoleCloudAccountWorkspaceProps {
  controller: SdkworkIamConsoleCloudAccountController;
  description?: string;
  title?: string;
  /**
   * Ownership levels the signed-in caller may act on, projected by
   * `resolveIamCloudAccountManageableScopeLevels`. The host does not compute this
   * itself; passing a narrower list is what pins the page to fewer levels, and the
   * default keeps the safest reading — personal accounts only.
   *
   * `platform` may appear here, and only for a caller that is both in the platform
   * tenant and holding `manage_shared`: the console never offers it, which is why
   * the page filters this list through the full four-level vocabulary rather than
   * through the self-service subset.
   */
  manageableScopeLevels?: readonly IamCloudAccountScopeLevel[];
  /**
   * Which surface is rendering the page. It selects the descriptive copy and the
   * width of the offered levels; every *authorization* decision stays on the
   * server.
   */
  surface?: "admin" | "console";
}
