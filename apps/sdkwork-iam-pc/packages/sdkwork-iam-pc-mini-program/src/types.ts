/**
 * Mini-program account domain model.
 *
 * Mini programs are the second resource-account kind of the unified IAM OAuth
 * aggregate (`iam_oauth_resource_account` with `resource_account_kind =
 * 'mini_program'`). The aggregate, its management mode (`access_mode`), its
 * ownership scope (`owner_scope`) and its provider identity/credentials are the
 * same design as official accounts; the fields below are the mini-program
 * specific projection of that same row, so the two features never grow two
 * identity models.
 */

/** How the channel is administered. Mirrors the aggregate's `access_mode`. */
export type MiniProgramAccessMode = "self_managed_account" | "operator_authorized_account";

/** Who owns the channel: a user, an organization, or the tenant. */
export type MiniProgramOwnerScope = "user" | "organization" | "tenant";

/** WeChat mini-program target environment carried on the surface row. */
export type MiniProgramEnvironment = "development" | "trial" | "release";

/** How the mini-program is published. */
export type MiniProgramReleaseChannel = "stable" | "gray" | "rollback";

/** Outcome of the last credential/login diagnostic for this account. */
export type MiniProgramLoginCheckStatus = "unknown" | "passed" | "failed" | "skipped";

/** Non-identity settings. Identity and credentials never live here. */
export interface MiniProgramProviderConfig {
  /** Business category or free-form note shown to operators. */
  category?: string;
  /** Operator-facing remark. */
  note?: string;
  /** Last contact address recorded by an operator. */
  contact?: string;
  /**
   * Target environment mirrored from the surface row (`mini_program_environment`)
   * when a host stores it in this document instead of reading the surface.
   */
  environment?: MiniProgramEnvironment;
  /**
   * Release channel mirrored from the surface row
   * (`mini_program_release_channel`) when a host stores it here.
   */
  releaseChannel?: MiniProgramReleaseChannel;
}

/** One mini-program account row (a `iam_oauth_resource_account` projection). */
export interface MiniProgramAccount {
  /** Aggregate row id (`iam_oauth_resource_account.id`). */
  miniProgramId: string;
  /** Tenant that owns the row. */
  tenantId: string;
  /** Organization the row belongs to; `"0"` means tenant-owned. */
  organizationId: string;
  /** WeChat mini-program AppID (`provider_account_id`). */
  appId: string;
  /** Display name shown in the account list. */
  displayName: string;
  /** WeChat original id (`gh_*`), when the provider reports one. */
  originalId?: string;
  /** Provider account type (personal, enterprise, ...). */
  accountType?: string;
  /** Surface environment of the login entry. */
  environment?: MiniProgramEnvironment;
  /** Release channel of the login entry. */
  releaseChannel?: MiniProgramReleaseChannel;
  /** Management mode of the aggregate row. */
  accessMode: MiniProgramAccessMode;
  /** Ownership scope of the aggregate row. */
  ownerScope: MiniProgramOwnerScope;
  /** Login integration the account is filed under. */
  integrationId: string;
  /** OAuth client that carries the AppSecret secret ref. */
  oauthClientId?: string;
  /** Whether an AppSecret secret ref is stored. */
  hasAppSecret: boolean;
  /** Whether the account is enabled for login. */
  enabled: boolean;
  /** Row lifecycle status. */
  status: string;
  /** Last login-check outcome. */
  loginCheckStatus: MiniProgramLoginCheckStatus;
  /** Last login-check timestamp (ISO-8601), when one ran. */
  lastLoginCheckedAt?: string;
  /** Non-identity settings. */
  providerConfig: MiniProgramProviderConfig;
  /** Row creation timestamp (ISO-8601). */
  createdAt?: string;
  /** Row update timestamp (ISO-8601). */
  updatedAt?: string;
}

/** Create payload for one mini-program account. */
export interface MiniProgramDraft {
  appId: string;
  displayName: string;
  /** Write-only AppSecret; an empty value keeps the stored secret on update. */
  appSecret?: string;
  originalId?: string;
  accountType?: string;
  environment?: MiniProgramEnvironment;
  releaseChannel?: MiniProgramReleaseChannel;
  providerConfig?: MiniProgramProviderConfig;
}

/** Partial update: omitted fields stay unchanged, an empty AppSecret keeps the stored one. */
export interface MiniProgramPatch {
  displayName?: string;
  appSecret?: string;
  originalId?: string;
  accountType?: string;
  environment?: MiniProgramEnvironment;
  releaseChannel?: MiniProgramReleaseChannel;
  providerConfig?: MiniProgramProviderConfig;
  enabled?: boolean;
}

/** List query. */
export interface MiniProgramQuery {
  page?: number;
  pageSize?: number;
  /** Case-insensitive search over display name and AppID. */
  q?: string;
}

/** One page of mini-program accounts. */
export interface MiniProgramPage {
  items: MiniProgramAccount[];
  totalItems: number;
  page: number;
  pageSize: number;
}

/** Default page size used by the shared list surfaces. */
export const DEFAULT_MINI_PROGRAM_PAGE_SIZE = 20;

/** Login-check result returned by the diagnostic endpoint. */
export interface MiniProgramLoginCheckResult {
  accountId: string;
  status: MiniProgramLoginCheckStatus;
  message?: string;
  checkedAt?: string;
}
