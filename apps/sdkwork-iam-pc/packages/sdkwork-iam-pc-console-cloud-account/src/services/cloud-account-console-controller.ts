import {
  createSdkWorkPagedListSession,
  IAM_CLOUD_ACCOUNT_SCOPE_PLATFORM,
  IAM_CLOUD_ACCOUNT_SCOPE_USER,
  type IamCloudAccountScopeLevel,
} from "@sdkwork/iam-contracts";
import type { SdkworkIamService } from "@sdkwork/iam-service";

import type {
  CreateSdkworkIamConsoleCloudAccountControllerInput,
  SdkworkIamConsoleCloudAccountController,
  SdkworkIamConsoleCloudAccountCreateInput,
  SdkworkIamConsoleCloudAccountCredentialInput,
  SdkworkIamConsoleCloudAccountCredentialRecord,
  SdkworkIamConsoleCloudAccountPatch,
  SdkworkIamConsoleCloudAccountRecord,
  SdkworkIamConsoleCloudAccountResolution,
  SdkworkIamConsoleCloudAccountState,
} from "../types/cloud-account-console-types";

/**
 * The cloud account center controller.
 *
 * All remote calls flow through the injected `SdkworkIamService`; the controller
 * never constructs an HTTP client. The account resource is reached through the
 * service's **backend** route set because the account center is published once at
 * `/backend/v3/api/iam/provider_accounts` and declared `dual-token` — see the note
 * on `SdkworkIamService.iam.providerAccounts`.
 *
 * Which ownership level a call reaches is the server's decision, driven by the
 * rights the caller holds. The controller therefore never pre-filters by level to
 * "protect" the caller: it passes the level it was asked for and lets a refusal
 * come back as a refusal, because a client-side narrowing would make a permitted
 * request look impossible.
 */
export function createSdkworkIamConsoleCloudAccountController(
  input: SdkworkIamService | CreateSdkworkIamConsoleCloudAccountControllerInput,
): SdkworkIamConsoleCloudAccountController {
  const service = "service" in input ? input.service : input;
  let state: SdkworkIamConsoleCloudAccountState = {
    accounts: [],
    credentials: [],
    listPageInfo: undefined,
    scopeLevel: undefined,
    selectedAccount: undefined,
    status: "idle",
  };

  const accountsSession = createSdkWorkPagedListSession({
    fetchPage: (query) => service.iam.providerAccounts.list(query),
    mapItem: toAccount,
  });

  const setState = (patch: Partial<SdkworkIamConsoleCloudAccountState>) => {
    state = { ...state, ...patch };
  };

  const applyAccounts = (
    accounts: readonly SdkworkIamConsoleCloudAccountRecord[],
  ): readonly SdkworkIamConsoleCloudAccountRecord[] => {
    setState({
      accounts,
      listPageInfo: { ...state.listPageInfo, accounts: accountsSession.getPageInfo() },
      status: "ready",
    });
    return accounts;
  };

  const controller: SdkworkIamConsoleCloudAccountController = {
    getState: () => ({
      ...state,
      accounts: [...state.accounts],
      credentials: [...state.credentials],
      listPageInfo: state.listPageInfo
        ? {
            accounts: state.listPageInfo.accounts ? { ...state.listPageInfo.accounts } : undefined,
            credentials: state.listPageInfo.credentials ? { ...state.listPageInfo.credentials } : undefined,
          }
        : undefined,
      selectedAccount: state.selectedAccount ? { ...state.selectedAccount } : undefined,
    }),
    listAccounts: async (params) => {
      setState({ scopeLevel: readScopeLevel(params?.scopeType), status: "loading" });
      try {
        // `includePlatform` is a *request*, and asking for it is the only way to
        // reach the operator's global defaults — the server honours it for a
        // platform operator alone. It is not asked for by default: an unqualified
        // listing means "every account that is about the caller", so a caller that
        // wants the global row has to say so through `params`.
        return applyAccounts(
          (await accountsSession.list({
            ...params,
            includePlatform: params?.includePlatform ?? false,
          })) as SdkworkIamConsoleCloudAccountRecord[],
        );
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    listMyAccounts: async (params) => {
      // `mine=true` is the "my cloud accounts" tab: the server pins the walk to the
      // caller's own personal accounts, so no `scopeType`/`ownerUserId` is sent —
      // sending one alongside would be re-stating what `mine` already decides. It
      // implies the personal level as well, which is what the state records.
      const { scopeType: _scopeType, ownerUserId: _ownerUserId, ...rest } = params ?? {};
      setState({ scopeLevel: IAM_CLOUD_ACCOUNT_SCOPE_USER, status: "loading" });
      try {
        return applyAccounts(
          (await accountsSession.list({ ...rest, mine: true })) as SdkworkIamConsoleCloudAccountRecord[],
        );
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    listScopeAccounts: async (scopeLevel, params) => {
      if (scopeLevel === IAM_CLOUD_ACCOUNT_SCOPE_USER) {
        return controller.listMyAccounts(params);
      }
      setState({ scopeLevel, status: "loading" });
      try {
        // `platform` is the only level whose rows the `includePlatform` predicate
        // admits, so the flag is *derived* from the level rather than sent on every
        // shared tab. Asking for the operator's global accounts while browsing the
        // tenant tab would state a wider request than the one being made, and the
        // level filter cannot undo a predicate that was already told to admit them.
        return applyAccounts(
          (await accountsSession.list({
            ...params,
            includePlatform: params?.includePlatform
              ?? scopeLevel === IAM_CLOUD_ACCOUNT_SCOPE_PLATFORM,
            scopeType: scopeLevel,
          })) as SdkworkIamConsoleCloudAccountRecord[],
        );
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    loadMoreAccounts: async () => {
      setState({ status: "loading" });
      try {
        return applyAccounts(
          (await accountsSession.loadMore()) as SdkworkIamConsoleCloudAccountRecord[],
        );
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    refreshWorkspace: async (params) => {
      const accounts = await controller.listAccounts(params);
      const selectedAccountId = state.selectedAccount?.id ?? accounts[0]?.id;
      setState({
        selectedAccount: accounts.find((account) => account.id === selectedAccountId),
      });
      return accounts;
    },
    createAccount: async (createInput, credentialInput) => {
      setState({ status: "loading" });
      let created: SdkworkIamConsoleCloudAccountRecord | undefined;
      try {
        created = toAccount(
          await service.iam.providerAccounts.create(buildCreateBody(createInput)),
        );
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
      if (!created) {
        setState({ status: "error" });
        throw new Error("The cloud account center returned an unreadable account record");
      }
      const accounts = [...state.accounts.filter((account) => account.id !== created.id), created];
      setState({ accounts, status: "ready" });

      /*
       * The credential goes in with the account, as a second request.
       *
       * `providerAccounts.create` stores an account and nothing else — its body
       * carries no credential fields — while an account with no credential
       * resolves to nothing at all: it is listed, it is selectable, and no
       * consumer can use it. So a registration that stops after the first
       * request is the very state this change exists to remove, and the two
       * requests are therefore issued together here rather than left to whoever
       * remembers to reopen the account afterwards.
       *
       * They are not atomic, and that is stated rather than hidden: a refusal
       * between them throws `SdkworkIamCloudAccountCredentialWriteError`
       * carrying the account that *does* exist, so the caller can say which half
       * landed. Reporting it as "registration failed" would be wrong twice over
       * — the account is in the listing, and it will never resolve until a
       * credential is written. The server offers no single-transaction route for
       * this pair (`storageProviderAccounts.create`, which does take both, is
       * Drive's own route over the same domain and still writes the credential
       * as a second statement).
       */
      if (credentialInput) {
        try {
          await service.iam.providerAccounts.credentials.create(
            created.id,
            buildCredentialBody(credentialInput),
          );
        } catch (error) {
          setState({ status: "error" });
          throw new SdkworkIamCloudAccountCredentialWriteError(created, error);
        }
      }
      return created;
    },
    updateAccount: async (providerAccountId, patch) => {
      const accountId = requireId(providerAccountId, "providerAccountId");
      setState({ status: "loading" });
      try {
        const updated = toAccount(
          await service.iam.providerAccounts.update(accountId, buildPatchBody(patch)),
        );
        setState({
          accounts: state.accounts.map((account) => (account.id === accountId && updated ? updated : account)),
          selectedAccount: state.selectedAccount?.id === accountId ? updated : state.selectedAccount,
          status: "ready",
        });
        return updated;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    deleteAccount: async (providerAccountId) => {
      const accountId = requireId(providerAccountId, "providerAccountId");
      setState({ status: "loading" });
      try {
        await service.iam.providerAccounts.delete(accountId);
        setState({
          accounts: state.accounts.filter((account) => account.id !== accountId),
          credentials: state.selectedAccount?.id === accountId ? [] : state.credentials,
          selectedAccount: state.selectedAccount?.id === accountId ? undefined : state.selectedAccount,
          status: "ready",
        });
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    setDefaultAccount: async (providerAccountId) => {
      const accountId = requireId(providerAccountId, "providerAccountId");
      setState({ status: "loading" });
      try {
        // The server demotes the previous default in the same transaction, but the
        // listing this controller already holds still shows the old one, so the
        // local projection clears every sibling default of the same level, vendor,
        // and environment rather than only setting the new one.
        const promoted = toAccount(
          await service.iam.providerAccounts.setDefault(accountId, {}),
        );
        const accounts = state.accounts.map((account) => {
          if (account.id === accountId) {
            return promoted ?? account;
          }
          const sharesLevel =
            account.scopeType === (promoted?.scopeType ?? account.scopeType)
            && account.vendorCode === (promoted?.vendorCode ?? account.vendorCode)
            && account.environment === (promoted?.environment ?? account.environment);
          return sharesLevel && account.isDefault ? { ...account, isDefault: false } : account;
        });
        setState({
          accounts,
          selectedAccount: state.selectedAccount?.id === accountId ? promoted : state.selectedAccount,
          status: "ready",
        });
        return promoted;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    selectAccount: async (providerAccountId) => {
      const accountId = requireId(providerAccountId, "providerAccountId");
      const accounts =
        state.accounts.length > 0 ? state.accounts : await controller.listAccounts();
      const selectedAccount = accounts.find((account) => account.id === accountId);
      setState({ selectedAccount });
      if (selectedAccount) {
        await controller.listCredentials(accountId);
      }
      return selectedAccount;
    },
    listCredentials: async (providerAccountId) => {
      const accountId = requireId(providerAccountId, "providerAccountId");
      setState({ status: "loading" });
      try {
        const credentials = readCredentialItems(
          await service.iam.providerAccounts.credentials.list(accountId, { page_size: 100 }),
        );
        setState({ credentials, status: "ready" });
        return credentials;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    createCredential: async (providerAccountId, credentialInput) => {
      const accountId = requireId(providerAccountId, "providerAccountId");
      setState({ status: "loading" });
      try {
        const created = toCredential(
          await service.iam.providerAccounts.credentials.create(
            accountId,
            buildCredentialBody(credentialInput),
          ),
        );
        setState({ credentials: await controller.listCredentials(accountId), status: "ready" });
        return created;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    revokeCredential: async (providerAccountId, credentialId) => {
      const accountId = requireId(providerAccountId, "providerAccountId");
      const normalizedCredentialId = requireId(credentialId, "credentialId");
      setState({ status: "loading" });
      try {
        await service.iam.providerCredentials.revoke(normalizedCredentialId);
        setState({
          credentials: state.credentials.filter((credential) => credential.id !== normalizedCredentialId),
          status: "ready",
        });
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    resolveAccount: async (params) => {
      setState({ status: "loading" });
      try {
        const resolved = toResolution(await service.iam.providerAccounts.resolve(params));
        setState({ status: "ready" });
        return resolved;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
  };

  return controller;
}

/**
 * Half a registration: the account exists, its credential does not.
 *
 * The two writes are separate requests, so a refusal can land between them, and
 * the outcome is neither success nor failure — it is the exact state that makes an
 * account unusable while looking registered. A caller that treats this as a plain
 * failure would tell the operator the registration did not happen, which is false,
 * and leave the account sitting there with no credential and no explanation.
 *
 * The account is carried on the error so the caller can name it and hand it back
 * to the operator to finish, and the underlying failure is carried separately so
 * the reason survives: "the credential was refused" is only actionable together
 * with *why* (a missing sealing key, a slot the caller may not touch).
 */
export class SdkworkIamCloudAccountCredentialWriteError extends Error {
  /** The account that was created and now has no credential. */
  readonly account: SdkworkIamConsoleCloudAccountRecord;
  /** What the credential write itself failed with. */
  readonly credentialCause: unknown;

  constructor(account: SdkworkIamConsoleCloudAccountRecord, credentialCause: unknown) {
    super(
      `Cloud account ${account.id} was created, but its credential was not stored: ${
        credentialCause instanceof Error ? credentialCause.message : String(credentialCause)
      }`,
    );
    this.name = "SdkworkIamCloudAccountCredentialWriteError";
    this.account = account;
    this.credentialCause = credentialCause;
  }
}

function requireId(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field} is required`);
  }
  return normalized;
}

function readScopeLevel(value: unknown): IamCloudAccountScopeLevel | undefined {
  return typeof value === "string" && value.trim()
    ? (value.trim() as IamCloudAccountScopeLevel)
    : undefined;
}

/**
 * Build the create body.
 *
 * The server requires `vendorCode`, `accountCode`, and `displayName`; it derives
 * everything else. Blank optionals are omitted rather than sent empty, because an
 * empty string is a value the server would have to reject while an omitted key
 * falls back to the documented default.
 */
function buildCreateBody(input: SdkworkIamConsoleCloudAccountCreateInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    accountCode: requireId(input.accountCode, "accountCode"),
    displayName: requireId(input.displayName, "displayName"),
    vendorCode: requireId(input.vendorCode, "vendorCode"),
  };
  for (const [key, value] of Object.entries({
    accountType: input.accountType,
    capabilityCodes: input.capabilityCodes,
    environment: input.environment,
    externalAccountId: input.externalAccountId,
    isDefault: input.isDefault,
    organizationId: input.organizationId,
    ownerUserId: input.ownerUserId,
    regionCode: input.regionCode,
    scopeType: input.scopeType,
  })) {
    if (value === undefined) {
      continue;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        body[key] = trimmed;
      }
      continue;
    }
    if (Array.isArray(value)) {
      const codes = value.map((code) => code.trim()).filter(Boolean);
      if (codes.length > 0) {
        body[key] = codes;
      }
      continue;
    }
    body[key] = value;
  }
  return body;
}

/** Build the PATCH body. Absent keys stay absent so the server leaves them alone. */
function buildPatchBody(patch: SdkworkIamConsoleCloudAccountPatch): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        body[key] = trimmed;
      }
      continue;
    }
    if (Array.isArray(value)) {
      body[key] = value.map((code) => code.trim()).filter(Boolean);
      continue;
    }
    body[key] = value;
  }
  return body;
}

function buildCredentialBody(
  input: SdkworkIamConsoleCloudAccountCredentialInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed) {
      body[key] = trimmed;
    }
  }
  return body;
}

function readRecordList(value: unknown): readonly Record<string, unknown>[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  const items = (value as { items?: unknown }).items;
  return Array.isArray(items)
    ? items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
}

function readCredentialItems(value: unknown): readonly SdkworkIamConsoleCloudAccountCredentialRecord[] {
  return readRecordList(value)
    .map(toCredential)
    .filter((credential): credential is SdkworkIamConsoleCloudAccountCredentialRecord => credential !== undefined);
}

function toAccount(record: unknown): SdkworkIamConsoleCloudAccountRecord | undefined {
  if (!record || typeof record !== "object") {
    return undefined;
  }
  const item = record as Record<string, unknown>;
  const id = readString(item.id);
  const vendorCode = readString(item.vendorCode ?? item.vendor_code);
  const accountCode = readString(item.accountCode ?? item.account_code);
  const displayName = readString(item.displayName ?? item.display_name);
  if (!id || !vendorCode || !accountCode || !displayName) {
    return undefined;
  }
  return {
    accountCode,
    accountType: readString(item.accountType ?? item.account_type),
    capabilityCodes: readStringArray(item.capabilityCodes ?? item.capability_codes),
    createdAt: readString(item.createdAt ?? item.created_at),
    credentialConfigured: readBoolean(item.credentialConfigured ?? item.credential_configured) ?? false,
    credentialCount: readCount(item.credentialCount ?? item.credential_count),
    displayName,
    environment: readString(item.environment),
    externalAccountId: readString(item.externalAccountId ?? item.external_account_id),
    id,
    isDefault: readBoolean(item.isDefault ?? item.is_default) ?? false,
    organizationId: readString(item.organizationId ?? item.organization_id),
    ownerUserId: readString(item.ownerUserId ?? item.owner_user_id),
    regionCode: readString(item.regionCode ?? item.region_code),
    scopeType: readString(item.scopeType ?? item.scope_type) ?? "",
    status: readString(item.status),
    tenantId: readString(item.tenantId ?? item.tenant_id),
    updatedAt: readString(item.updatedAt ?? item.updated_at),
    vendorCode,
    version: readString(item.version),
  };
}

function toCredential(record: unknown): SdkworkIamConsoleCloudAccountCredentialRecord | undefined {
  if (!record || typeof record !== "object") {
    return undefined;
  }
  const item = record as Record<string, unknown>;
  const id = readString(item.id);
  const providerAccountId = readString(item.providerAccountId ?? item.provider_account_id);
  if (!id || !providerAccountId) {
    return undefined;
  }
  return {
    createdAt: readString(item.createdAt ?? item.created_at),
    credentialKind: readString(item.credentialKind ?? item.credential_kind),
    credentialName: readString(item.credentialName ?? item.credential_name),
    credentialVersion: readString(item.credentialVersion ?? item.credential_version),
    expiresAt: readString(item.expiresAt ?? item.expires_at),
    id,
    lastRotatedAt: readString(item.lastRotatedAt ?? item.last_rotated_at),
    lastVerifiedAt: readString(item.lastVerifiedAt ?? item.last_verified_at),
    maskedLabel: readString(item.maskedLabel ?? item.masked_label),
    providerAccountId,
    secretFingerprint: readString(item.secretFingerprint ?? item.secret_fingerprint),
    status: readString(item.status),
    updatedAt: readString(item.updatedAt ?? item.updated_at),
    uuid: readString(item.uuid),
  };
}

function toResolution(record: unknown): SdkworkIamConsoleCloudAccountResolution | undefined {
  if (!record || typeof record !== "object") {
    return undefined;
  }
  const item = record as Record<string, unknown>;
  const candidates = Array.isArray(item.candidatesByScope ?? item.candidates_by_scope)
    ? (item.candidatesByScope ?? item.candidates_by_scope) as unknown[]
    : [];
  return {
    account: toAccount(item.account),
    candidatesByScope: candidates
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
      .map((entry) => ({
        count: readCount(entry.count),
        scopeType: readString(entry.scopeType ?? entry.scope_type) ?? "",
      })),
    matchedByDefault: readBoolean(item.matchedByDefault ?? item.matched_by_default) ?? false,
    matchedScope: readString(item.matchedScope ?? item.matched_scope),
  };
}

function readString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return typeof value === "number" ? String(value) : undefined;
}

function readStringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }
  return undefined;
}

/**
 * Counts arrive as JSON strings: the route projects `credential_count` and the
 * resolution tallies through `to_string()` because `int64` is not a safe JSON
 * number (API_SPEC §13.6).
 */
function readCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
