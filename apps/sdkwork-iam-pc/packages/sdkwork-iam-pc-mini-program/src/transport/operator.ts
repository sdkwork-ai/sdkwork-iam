/**
 * Operator transport adapter: the backend-admin face of the unified aggregate.
 *
 * Two adapters live here and both implement the same {@link MiniProgramTransport}
 * port the controller consumes:
 *
 * - {@link createMiniProgramOperatorTransport} takes the host's own
 *   resource-account actions. The IAM backend-admin controller (and every
 *   product host that already owns one) adapts its actions onto
 *   {@link MiniProgramOperatorOperations}; the transport then groups a
 *   panel-shaped patch into the writes the host can perform and applies them in
 *   dependency order — profile, credentials, provider configuration, enable
 *   switch — so a partial failure never stores half an edit.
 * - {@link createMiniProgramBackendOperations} adapts the generated backend SDK
 *   slice directly (`iam.oauth.resourceAccounts.*` plus `iam.oauth.integrations.*`)
 *   for hosts that build the generated client themselves. Creating an account
 *   is the one-click setup the IAM admin surfaces perform: reuse or create the
 *   `wechat_mini_program` login integration (which also owns the AppSecret
 *   secret row), then create the resource account. The AppSecret is never
 *   stored on the resource account; it travels as the integration's
 *   `providerClientSecret`, which the backend encodes into
 *   `iam_oauth_client` → `iam_oauth_secret`.
 *
 * Neither adapter performs raw HTTP, assembles authentication headers, or
 * redefines a wire contract.
 */
import { MiniProgramUnsupportedError, type MiniProgramTransport } from "../controller";
import {
  DEFAULT_MINI_PROGRAM_PAGE_SIZE,
  type MiniProgramAccount,
  type MiniProgramDraft,
  type MiniProgramLoginCheckResult,
  type MiniProgramPage,
  type MiniProgramPatch,
  type MiniProgramProviderConfig,
  type MiniProgramQuery,
} from "../types";
import {
  MINI_PROGRAM_ACCOUNT_KIND,
  MINI_PROGRAM_BACKEND_SCAN_PAGE_SIZE,
  MINI_PROGRAM_PROVIDER_CODE,
  isMiniProgramAccountRecord,
  readRecordString,
  toMiniProgramAccount,
  toMiniProgramLoginCheckResult,
} from "./normalize";

/**
 * The host actions an operator transport delegates to.
 *
 * Every member is the host's own action on the unified aggregate; the transport
 * never re-implements them. `create` is the one-click setup (integration →
 * client → resource account) the backend-admin surface exposes.
 */
export interface MiniProgramOperatorOperations {
  /** List one page of resource accounts, already projected to the mini-program channel. */
  list(query: MiniProgramQuery): Promise<MiniProgramPage>;
  /** One-click setup: create (or reuse) the login integration and its account. */
  create(draft: MiniProgramDraft): Promise<unknown>;
  /** Persist display name / account type / original id. */
  updateProfile?(id: string, profile: {
    displayName?: string;
    accountType?: string;
    originalId?: string;
  }): Promise<unknown>;
  /** Persist the AppID / AppSecret (an empty secret keeps the stored one). */
  updateCredentials?(id: string, credentials: { appId?: string; appSecret?: string }): Promise<unknown>;
  /** Persist the `provider_config_json` document. */
  updateConfig?(id: string, config: MiniProgramProviderConfig): Promise<unknown>;
  /** Delete the resource account (the shared integration/client stay). */
  remove(id: string): Promise<void>;
  /** Enable or disable the account (and its login integration). */
  setEnabled(id: string, enabled: boolean): Promise<void>;
  /** Queue the mini-program login/credential diagnostic. */
  runLoginCheck?(id: string): Promise<unknown>;
  /** Override the record normalizer; defaults to the shared one. */
  toAccount?(record: unknown): MiniProgramAccount | undefined;
}

/** Fields of the payload each write group addresses. */
const EMPTY_ACCOUNT: MiniProgramAccount = {
  miniProgramId: "",
  tenantId: "",
  organizationId: "0",
  appId: "",
  displayName: "",
  accessMode: "operator_authorized_account",
  ownerScope: "tenant",
  integrationId: "",
  hasAppSecret: false,
  enabled: true,
  status: "active",
  loginCheckStatus: "unknown",
  providerConfig: {},
};

/**
 * Build the operator transport over a host's own actions.
 *
 * @param operations - the host's resource-account actions.
 * @returns the transport the shared controller consumes.
 */
export function createMiniProgramOperatorTransport(
  operations: MiniProgramOperatorOperations,
): MiniProgramTransport {
  /**
   * Normalizes a host record, tolerating a host that returns no usable record
   * after a write (the mutation still succeeded).
   * @param record - the host's return value.
   * @returns the account, when it can be read.
   */
  const accountOf = (record: unknown): MiniProgramAccount | undefined => {
    if (record === undefined || record === null) return undefined;
    if (operations.toAccount !== undefined) return operations.toAccount(record);
    try {
      return toMiniProgramAccount(record);
    } catch {
      return undefined;
    }
  };

  /**
   * Applies a panel-shaped patch in dependency order.
   * @param id - account id.
   * @param patch - the caller's patch.
   * @returns the account the caller sees.
   */
  const applyPatch = async (id: string, patch: MiniProgramPatch): Promise<MiniProgramAccount> => {
    const profile = patch.displayName !== undefined
      || patch.accountType !== undefined
      || patch.originalId !== undefined
      ? {
        ...(patch.displayName === undefined ? {} : { displayName: patch.displayName }),
        ...(patch.accountType === undefined ? {} : { accountType: patch.accountType }),
        ...(patch.originalId === undefined ? {} : { originalId: patch.originalId }),
      }
      : undefined;
    const credentials = patch.appSecret !== undefined
      ? { appSecret: patch.appSecret }
      : undefined;
    let last: MiniProgramAccount | undefined;
    if (profile !== undefined) {
      if (operations.updateProfile === undefined) {
        throw new MiniProgramUnsupportedError("updateProfile");
      }
      last = accountOf(await operations.updateProfile(id, profile)) ?? last;
    }
    if (credentials !== undefined) {
      if (operations.updateCredentials === undefined) {
        throw new MiniProgramUnsupportedError("updateCredentials");
      }
      last = accountOf(await operations.updateCredentials(id, credentials)) ?? last;
    }
    if (patch.providerConfig !== undefined) {
      if (operations.updateConfig === undefined) {
        throw new MiniProgramUnsupportedError("updateConfig");
      }
      last = accountOf(await operations.updateConfig(id, patch.providerConfig)) ?? last;
    }
    if (patch.enabled !== undefined) {
      await operations.setEnabled(id, patch.enabled);
    }
    return last ?? synthesize(id, patch);
  };

  return {
    async list(query: MiniProgramQuery = {}): Promise<MiniProgramPage> {
      return operations.list(query);
    },
    async create(draft: MiniProgramDraft): Promise<MiniProgramAccount> {
      const created = await operations.create(draft);
      return accountOf(created) ?? synthesize("", {
        displayName: draft.displayName,
        appSecret: draft.appSecret,
        accountType: draft.accountType,
        originalId: draft.originalId,
        providerConfig: draft.providerConfig,
      }, draft);
    },
    async update(id: string, patch: MiniProgramPatch): Promise<MiniProgramAccount> {
      return applyPatch(id, patch);
    },
    async delete(id: string): Promise<void> {
      await operations.remove(id);
    },
    async setEnabled(id: string, enabled: boolean): Promise<void> {
      await operations.setEnabled(id, enabled);
    },
    ...(operations.runLoginCheck === undefined
      ? {}
      : {
        async runLoginCheck(id: string): Promise<MiniProgramLoginCheckResult> {
          return toMiniProgramLoginCheckResult(id, await operations.runLoginCheck!(id));
        },
      }),
  };
}

/**
 * Builds the account a caller sees when the host's write returns no record.
 * @param id - account id.
 * @param patch - the applied patch.
 * @param draft - the create draft, when this follows a create.
 * @returns the synthesized account.
 */
function synthesize(
  id: string,
  patch: MiniProgramPatch,
  draft?: MiniProgramDraft,
): MiniProgramAccount {
  const accountType = patch.accountType ?? draft?.accountType;
  const originalId = patch.originalId ?? draft?.originalId;
  return {
    ...EMPTY_ACCOUNT,
    miniProgramId: id,
    appId: draft?.appId ?? "",
    displayName: patch.displayName ?? draft?.displayName ?? "",
    ...(accountType === undefined ? {} : { accountType }),
    ...(originalId === undefined ? {} : { originalId }),
    ...(draft?.environment === undefined ? {} : { environment: draft.environment }),
    ...(draft?.releaseChannel === undefined ? {} : { releaseChannel: draft.releaseChannel }),
    hasAppSecret: patch.appSecret !== undefined && patch.appSecret.trim() !== "",
    enabled: patch.enabled ?? true,
    providerConfig: patch.providerConfig ?? draft?.providerConfig ?? {},
  };
}

/**
 * The page counters of a generated list response.
 *
 * Declared structurally instead of as `Record<string, unknown>` so the
 * generated `PageInfo` (which carries no index signature) stays assignable.
 */
export interface MiniProgramBackendPageInfo {
  page?: number;
  pageSize?: number;
  totalItems?: string | number;
}

/**
 * The generated backend SDK slice the direct adapter consumes.
 *
 * Structurally identical to
 * `client.iamOauth.iam.oauth.{resourceAccounts,integrations}` of
 * `@sdkwork/iam-backend-sdk`; it is declared here so this package stays free of
 * a generated-SDK import while still matching the real wire shapes.
 */
export interface MiniProgramOperatorBackendPort {
  resourceAccounts: {
    list(params?: { page?: number; pageSize?: number; q?: string }): Promise<{
      items?: readonly unknown[];
      pageInfo?: MiniProgramBackendPageInfo;
    }>;
    create(body: Record<string, unknown>): Promise<Record<string, unknown>>;
    update(id: string, body?: Record<string, unknown>): Promise<Record<string, unknown>>;
    delete(id: string): Promise<void>;
    miniProgramLoginChecks: {
      create(id: string, body: Record<string, unknown>): Promise<unknown>;
    };
  };
  integrations: {
    list(params?: { page?: number; pageSize?: number; q?: string }): Promise<{
      items?: readonly unknown[];
    }>;
    create(body: Record<string, unknown>): Promise<Record<string, unknown>>;
    update(id: string, body?: Record<string, unknown>): Promise<Record<string, unknown>>;
  };
}

/**
 * Adapt the generated backend SDK slice to the operator operations.
 *
 * The list read is bounded: the backend resource-account list has no channel
 * filter, so one 200-row page is read, projected to mini-program rows, and
 * paginated client-side. A tenant with more resource accounts than that bound
 * needs the generated cursor page; the dialog's README records the limit.
 *
 * @param port - the generated `iam.oauth` backend slice.
 * @returns the operations `createMiniProgramOperatorTransport` consumes.
 */
export function createMiniProgramBackendOperations(
  port: MiniProgramOperatorBackendPort,
): MiniProgramOperatorOperations {
  /** Integration id per account id, filled by list/create so enable and profile syncs can reach it. */
  const integrationIds = new Map<string, string>();

  const accountOf = (record: unknown): MiniProgramAccount | undefined => {
    try {
      return toMiniProgramAccount(record);
    } catch {
      return undefined;
    }
  };

  const remember = (account: MiniProgramAccount): MiniProgramAccount => {
    if (account.integrationId !== "") integrationIds.set(account.miniProgramId, account.integrationId);
    return account;
  };

  return {
    async list(query: MiniProgramQuery): Promise<MiniProgramPage> {
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? DEFAULT_MINI_PROGRAM_PAGE_SIZE;
      const params: { page?: number; pageSize?: number; q?: string } = {
        page: 1,
        pageSize: MINI_PROGRAM_BACKEND_SCAN_PAGE_SIZE,
      };
      const search = query.q?.trim();
      if (search !== undefined && search !== "") params.q = search;
      const response = await port.resourceAccounts.list(params);
      const accounts: MiniProgramAccount[] = [];
      for (const item of response.items ?? []) {
        if (!isMiniProgramAccountRecord(item)) continue;
        const account = accountOf(item);
        if (account !== undefined) accounts.push(remember(account));
      }
      const offset = (page - 1) * pageSize;
      return {
        items: accounts.slice(offset, offset + pageSize),
        totalItems: accounts.length,
        page,
        pageSize,
      };
    },

    async create(draft: MiniProgramDraft): Promise<unknown> {
      if (draft.environment !== undefined || draft.releaseChannel !== undefined) {
        // The generated one-click setup does not carry the surface row's
        // environment/release channel; a host that needs them writes the
        // surface itself instead of having them dropped silently here.
        throw new MiniProgramUnsupportedError("surface environment and release channel");
      }
      const appId = draft.appId.trim();
      const appSecret = (draft.appSecret ?? "").trim();
      const displayName = draft.displayName.trim();
      if (appId === "") throw new Error("iam-pc-mini-program: the mini-program AppID is required");
      if (displayName === "") {
        throw new Error("iam-pc-mini-program: the mini-program display name is required");
      }

      const integrations = await port.integrations.list({
        pageSize: MINI_PROGRAM_BACKEND_SCAN_PAGE_SIZE,
        q: MINI_PROGRAM_PROVIDER_CODE,
      });
      const existingIntegration = (integrations.items ?? []).find((row) => {
        const record = row as Record<string, unknown>;
        return readRecordString(record, "providerCode", "provider_code") === MINI_PROGRAM_PROVIDER_CODE
          && readRecordString(record, "providerClientId", "provider_client_id") === appId;
      });
      let integrationId = existingIntegration === undefined
        ? undefined
        : readRecordString(
          existingIntegration as Record<string, unknown>,
          "id",
          "integrationId",
          "integration_id",
        );
      if (integrationId === undefined) {
        const created = await port.integrations.create({
          integrationCode: `mini-program-${appId}`,
          displayName,
          providerCode: MINI_PROGRAM_PROVIDER_CODE,
          providerClientId: appId,
          providerClientSecret: appSecret,
          redirectUri: "",
          surfaceKind: MINI_PROGRAM_ACCOUNT_KIND,
          enabled: true,
        });
        integrationId = readRecordString(created, "id", "integrationId", "integration_id");
        if (integrationId === undefined) {
          throw new Error("iam-pc-mini-program: the created login integration carried no id");
        }
      } else {
        // The integration may have been created by another surface; make its
        // enabled state follow this account.
        await port.integrations.update(integrationId, { enabled: true });
      }

      const existingAccounts = await port.resourceAccounts.list({
        pageSize: MINI_PROGRAM_BACKEND_SCAN_PAGE_SIZE,
        q: appId,
      });
      const duplicate = (existingAccounts.items ?? []).find((row) => {
        const record = row as Record<string, unknown>;
        return readRecordString(record, "providerCode", "provider_code") === MINI_PROGRAM_PROVIDER_CODE
          && readRecordString(
            record,
            "providerAccountId",
            "provider_account_id",
          ) === appId;
      });
      if (duplicate !== undefined) {
        throw new Error(`A mini program with AppID ${appId} already exists`);
      }

      const created = await port.resourceAccounts.create({
        integrationId,
        providerCode: MINI_PROGRAM_PROVIDER_CODE,
        resourceAccountCode: `mini-${appId}`,
        resourceAccountKind: MINI_PROGRAM_ACCOUNT_KIND,
        displayName,
        providerAccountId: appId,
        ...(draft.accountType === undefined ? {} : { providerAccountType: draft.accountType }),
        ...(draft.originalId === undefined || draft.originalId.trim() === ""
          ? {}
          : { providerAccountOriginalId: draft.originalId.trim() }),
        accessMode: "operator_managed",
        ...(draft.providerConfig === undefined ? {} : { config: draft.providerConfig }),
        enabled: true,
      });
      const account = accountOf({ ...created, integrationId });
      if (account === undefined) {
        throw new Error("iam-pc-mini-program: the created account carried no id");
      }
      return remember(account);
    },

    async updateProfile(id, profile) {
      const patch: Record<string, unknown> = {};
      if (profile.displayName !== undefined) patch.displayName = profile.displayName;
      if (profile.accountType !== undefined) patch.providerAccountType = profile.accountType;
      if (profile.originalId !== undefined) patch.providerAccountOriginalId = profile.originalId;
      const updated = await port.resourceAccounts.update(id, patch);
      const integrationId = integrationIds.get(id);
      if (profile.displayName !== undefined && integrationId !== undefined) {
        await port.integrations.update(integrationId, { displayName: profile.displayName });
      }
      const account = accountOf(updated);
      if (account !== undefined) remember(account);
      return updated;
    },

    async updateCredentials(id, credentials) {
      const patch: Record<string, unknown> = {};
      if (credentials.appId !== undefined && credentials.appId.trim() !== "") {
        patch.providerAccountId = credentials.appId.trim();
      }
      if (credentials.appSecret !== undefined && credentials.appSecret.trim() !== "") {
        patch.providerClientSecret = credentials.appSecret.trim();
      }
      const updated = await port.resourceAccounts.update(id, patch);
      const account = accountOf(updated);
      if (account !== undefined) remember(account);
      return updated;
    },

    async updateConfig(id, config) {
      const updated = await port.resourceAccounts.update(id, { config });
      const account = accountOf(updated);
      if (account !== undefined) remember(account);
      return updated;
    },

    async remove(id) {
      await port.resourceAccounts.delete(id);
      integrationIds.delete(id);
    },

    async setEnabled(id, enabled) {
      await port.resourceAccounts.update(id, { enabled });
      const integrationId = integrationIds.get(id);
      if (integrationId !== undefined) {
        await port.integrations.update(integrationId, { enabled });
      }
    },

    async runLoginCheck(id) {
      return port.resourceAccounts.miniProgramLoginChecks.create(id, {});
    },

    toAccount(record): MiniProgramAccount | undefined {
      const account = accountOf(record);
      return account === undefined ? undefined : remember(account);
    },
  };
}

/**
 * Builds the operator transport directly over the generated backend SDK slice.
 * @param port - the generated `iam.oauth` backend slice.
 * @returns the transport the shared controller consumes.
 */
export function createMiniProgramBackendTransport(
  port: MiniProgramOperatorBackendPort,
): MiniProgramTransport {
  return createMiniProgramOperatorTransport(createMiniProgramBackendOperations(port));
}
