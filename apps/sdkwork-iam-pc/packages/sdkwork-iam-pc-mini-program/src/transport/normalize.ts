/**
 * Record normalization for the mini-program account model.
 *
 * Every host reads the same unified aggregate (`iam_oauth_resource_account` with
 * `resource_account_kind = 'mini_program'`) but receives it in one of several
 * spellings: the generated backend SDK echoes camelCase DTO fields, a raw
 * projection keeps snake_case columns, and the surface row carries the
 * `mini_program_*` fields an operator host may join in. These helpers turn any
 * of those shapes into {@link MiniProgramAccount} exactly once, so no transport
 * adapter grows its own copy of the mapping.
 */
import type {
  MiniProgramAccessMode,
  MiniProgramAccount,
  MiniProgramEnvironment,
  MiniProgramLoginCheckResult,
  MiniProgramLoginCheckStatus,
  MiniProgramOwnerScope,
  MiniProgramPage,
  MiniProgramProviderConfig,
  MiniProgramReleaseChannel,
} from "../types";
import { DEFAULT_MINI_PROGRAM_PAGE_SIZE } from "../types";

/** `resource_account_kind` value of a mini-program resource account. */
export const MINI_PROGRAM_ACCOUNT_KIND = "mini_program";

/** Provider code of the WeChat mini-program login integration. */
export const MINI_PROGRAM_PROVIDER_CODE = "wechat_mini_program";

/** Upper bound of the bounded resource-account read the generated backend offers. */
export const MINI_PROGRAM_BACKEND_SCAN_PAGE_SIZE = 200;

/** Reads one non-blank string member. */
export function readRecordString(
  record: Record<string, unknown>,
  ...keys: readonly string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return undefined;
}

/** Reads one boolean flag, tolerating the PostgreSQL INTEGER spelling. */
export function readRecordBoolean(
  record: Record<string, unknown>,
  ...keys: readonly string[]
): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (value === 0 || value === 1) return value === 1;
    if (value === "0" || value === "1") return value === "1";
  }
  return undefined;
}

/** Reads a numeric page member that the backend may serialize as a string. */
export function readRecordNumber(
  record: Record<string, unknown>,
  ...keys: readonly string[]
): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

/** Reads the `provider_config_json` document, whether it travels parsed or serialized. */
export function readProviderConfig(
  record: Record<string, unknown>,
): MiniProgramProviderConfig | undefined {
  const raw = record.providerConfigJson ?? record.provider_config_json ?? record.providerConfig
    ?? record.provider_config;
  if (typeof raw === "string") {
    if (raw.trim() === "") return undefined;
    try {
      const parsed: unknown = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null
        ? parsed as MiniProgramProviderConfig
        : undefined;
    } catch {
      return undefined;
    }
  }
  return typeof raw === "object" && raw !== null
    ? raw as MiniProgramProviderConfig
    : undefined;
}

/** Reads the administration mode. */
function readAccessMode(record: Record<string, unknown>): MiniProgramAccessMode {
  const value = readRecordString(record, "accessMode", "access_mode");
  // The retired `operator_managed` spelling is the authorized mode.
  if (value === "self_managed_account") return "self_managed_account";
  return "operator_authorized_account";
}

/** Reads the ownership scope, inferring it from the organization when absent. */
function readOwnerScope(
  record: Record<string, unknown>,
  organizationId: string,
): MiniProgramOwnerScope {
  const value = readRecordString(record, "ownerScope", "owner_scope");
  if (value === "user" || value === "organization" || value === "tenant") return value;
  return organizationId !== "" && organizationId !== "0" ? "organization" : "tenant";
}

/** Reads the WeChat target environment of the surface row. */
function readEnvironment(
  record: Record<string, unknown>,
  providerConfig: MiniProgramProviderConfig | undefined,
): MiniProgramEnvironment | undefined {
  const value = readRecordString(
    record,
    "miniProgramEnvironment",
    "mini_program_environment",
    "environment",
  ) ?? providerConfig?.environment;
  return value === "development" || value === "trial" || value === "release"
    ? value
    : undefined;
}

/** Reads the published release channel of the surface row. */
function readReleaseChannel(
  record: Record<string, unknown>,
  providerConfig: MiniProgramProviderConfig | undefined,
): MiniProgramReleaseChannel | undefined {
  const value = readRecordString(
    record,
    "miniProgramReleaseChannel",
    "mini_program_release_channel",
    "releaseChannel",
  ) ?? providerConfig?.releaseChannel;
  return value === "stable" || value === "gray" || value === "rollback"
    ? value
    : undefined;
}

/** Reads the last login-check outcome. */
export function readLoginCheckStatus(
  record: Record<string, unknown>,
  ...keys: readonly string[]
): MiniProgramLoginCheckStatus {
  const value = readRecordString(record, ...keys);
  return value === "passed" || value === "failed" || value === "skipped"
    ? value
    : "unknown";
}

/** Whether one raw record belongs to the mini-program channel. */
export function isMiniProgramAccountRecord(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const kind = readRecordString(record, "resourceAccountKind", "resource_account_kind");
  if (kind !== undefined) return kind === MINI_PROGRAM_ACCOUNT_KIND;
  const providerCode = readRecordString(record, "providerCode", "provider_code");
  return providerCode === MINI_PROGRAM_PROVIDER_CODE;
}

/**
 * Normalize one API record into the package model.
 *
 * @param value - one resource-account record from the host.
 * @returns the account the panel renders.
 * @throws {Error} when the record carries no account id.
 */
export function toMiniProgramAccount(value: unknown): MiniProgramAccount {
  if (typeof value !== "object" || value === null) {
    throw new Error("iam-pc-mini-program: mini-program account record is not an object");
  }
  const record = value as Record<string, unknown>;
  const miniProgramId = readRecordString(
    record,
    "miniProgramId",
    "id",
    "resourceAccountId",
    "resource_account_id",
  );
  if (miniProgramId === undefined) {
    throw new Error("iam-pc-mini-program: mini-program account record is missing its id");
  }
  const providerConfig = readProviderConfig(record);
  const appId = readRecordString(
    record,
    "providerAccountId",
    "provider_account_id",
    "appId",
    "app_id",
    "providerClientId",
    "provider_client_id",
  ) ?? "";
  const displayName = readRecordString(record, "displayName", "display_name") ?? appId;
  const organizationId = readRecordString(record, "organizationId", "organization_id") ?? "0";
  const environment = readEnvironment(record, providerConfig);
  const releaseChannel = readReleaseChannel(record, providerConfig);
  const loginCheckStatus = readLoginCheckStatus(
    record,
    "loginCheckStatus",
    "login_check_status",
    "miniProgramLoginCheckStatus",
    "mini_program_login_check_status",
  );
  const lastLoginCheckedAt = readRecordString(
    record,
    "lastLoginCheckedAt",
    "last_login_checked_at",
    "lastLoginCheckAt",
    "last_login_check_at",
  );
  const hasAppSecret = readRecordBoolean(record, "hasAppSecret", "has_app_secret")
    ?? readRecordString(record, "providerClientSecret", "provider_client_secret") !== undefined;
  const enabled = readRecordBoolean(record, "enabled", "isEnabled", "is_enabled")
    ?? readRecordString(record, "status") !== "inactive";
  const status = readRecordString(record, "status") ?? (enabled ? "active" : "inactive");
  const originalId = readRecordString(
    record,
    "providerAccountOriginalId",
    "provider_account_original_id",
    "originalId",
    "original_id",
  );
  const accountType = readRecordString(
    record,
    "providerAccountType",
    "provider_account_type",
    "accountType",
    "account_type",
  );
  const oauthClientId = readRecordString(record, "oauthClientId", "oauth_client_id");
  const createdAt = readRecordString(record, "createdAt", "created_at");
  const updatedAt = readRecordString(record, "updatedAt", "updated_at");
  return {
    miniProgramId,
    tenantId: readRecordString(record, "tenantId", "tenant_id") ?? "",
    organizationId,
    appId,
    displayName,
    ...(originalId === undefined ? {} : { originalId }),
    ...(accountType === undefined ? {} : { accountType }),
    ...(environment === undefined ? {} : { environment }),
    ...(releaseChannel === undefined ? {} : { releaseChannel }),
    accessMode: readAccessMode(record),
    ownerScope: readOwnerScope(record, organizationId),
    integrationId: readRecordString(record, "integrationId", "integration_id") ?? "",
    ...(oauthClientId === undefined ? {} : { oauthClientId }),
    hasAppSecret,
    enabled,
    status,
    loginCheckStatus,
    ...(lastLoginCheckedAt === undefined ? {} : { lastLoginCheckedAt }),
    providerConfig: providerConfig ?? {},
    ...(createdAt === undefined ? {} : { createdAt }),
    ...(updatedAt === undefined ? {} : { updatedAt }),
  };
}

/**
 * Project one host list response into one page of mini-program accounts.
 *
 * Records of another kind are dropped, and a record this package cannot read
 * (for example one without an id) is skipped instead of failing the whole page.
 *
 * @param items - the host page's rows.
 * @param pageInfo - the host page's counters, when reported.
 * @param fallbackPage - the page number requested by the caller.
 * @param fallbackPageSize - the page size requested by the caller.
 * @returns the normalized page.
 */
export function toMiniProgramPage(
  items: readonly unknown[],
  pageInfo: Record<string, unknown> | undefined,
  fallbackPage = 1,
  fallbackPageSize = DEFAULT_MINI_PROGRAM_PAGE_SIZE,
): MiniProgramPage {
  const accounts: MiniProgramAccount[] = [];
  for (const item of items) {
    if (!isMiniProgramAccountRecord(item)) continue;
    try {
      accounts.push(toMiniProgramAccount(item));
    } catch {
      // A malformed row is skipped: the visible list must not vanish because
      // one unrelated projection is incomplete.
    }
  }
  return {
    items: accounts,
    totalItems: pageInfo === undefined
      ? accounts.length
      : readRecordNumber(pageInfo, "totalItems", "total_items") ?? accounts.length,
    page: pageInfo === undefined
      ? fallbackPage
      : readRecordNumber(pageInfo, "page") ?? fallbackPage,
    pageSize: pageInfo === undefined
      ? fallbackPageSize
      : readRecordNumber(pageInfo, "pageSize", "page_size") ?? fallbackPageSize,
  };
}

/**
 * Normalize the diagnostic endpoint's response into a login-check result.
 * @param accountId - the account the check ran for.
 * @param value - the endpoint's return value (the queued diagnostic run).
 * @returns the result the panel reports.
 */
export function toMiniProgramLoginCheckResult(
  accountId: string,
  value: unknown,
): MiniProgramLoginCheckResult {
  const record = typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : {};
  const status = readLoginCheckStatus(record, "status", "loginCheckStatus", "login_check_status");
  const message = readRecordString(record, "message", "detail", "summary");
  const checkedAt = readRecordString(record, "checkedAt", "checked_at", "createdAt", "created_at");
  return {
    accountId,
    status,
    ...(message === undefined ? {} : { message }),
    ...(checkedAt === undefined ? {} : { checkedAt }),
  };
}
