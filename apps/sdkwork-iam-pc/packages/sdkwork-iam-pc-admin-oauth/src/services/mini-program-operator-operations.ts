/**
 * Operator transport wiring for mini-program accounts.
 *
 * The CRUD implementation lives in `@sdkwork/iam-pc-mini-program`; this module
 * only maps the backend-admin controller's own resource-account actions onto the
 * shared operator operations. Every action keeps its existing wire shape:
 *
 * - `createAccountSetup` still performs the one-click setup
 *   (integration → client → resource account) for the requested channel kind;
 * - profile, credentials, provider configuration, and the enable switch stay
 *   separate writes, so the drawer's dependency order and dirty checks keep
 *   working unchanged;
 * - the enable switch still updates the account and its login integration;
 * - the login diagnostic stays the backend's `miniProgramLoginChecks.create`.
 *
 * The backend resource-account list has no channel filter, so one bounded page
 * is read and the mini-program rows are paginated client-side; the shared
 * package documents the same bound for its direct backend adapter.
 */
import {
  DEFAULT_OPERATOR_CAPABILITIES,
  MINI_PROGRAM_BACKEND_SCAN_PAGE_SIZE,
  MiniProgramUnsupportedError,
  createMiniProgramController,
  createMiniProgramOperatorTransport,
  isMiniProgramAccountRecord,
  toMiniProgramAccount,
} from "@sdkwork/iam-pc-mini-program";
import type {
  MiniProgramAccount,
  MiniProgramCapabilities,
  MiniProgramController,
  MiniProgramOperatorOperations,
  MiniProgramPage,
  MiniProgramQuery,
} from "@sdkwork/iam-pc-mini-program";

import type {
  SdkworkIamOauthAccountConfig,
  SdkworkIamOauthAdminController,
  SdkworkIamOauthPagePermissions,
} from "../types/oauth-admin-types";
import {
  readAccountIntegrationId,
  readDisplayName,
  readResourceAccountId,
} from "../utils/oauth-admin-utils";

/** Default page size when a caller does not ask for one. */
const DEFAULT_PAGE_SIZE = 20;

/**
 * Projects one backend record, tolerating a record this package cannot read.
 * @param record - the controller's resource-account record.
 * @returns the shared account model, when readable.
 */
function toAccount(record: unknown): MiniProgramAccount | undefined {
  if (!isMiniProgramAccountRecord(record)) return undefined;
  try {
    return toMiniProgramAccount(record);
  } catch {
    return undefined;
  }
}

/**
 * Maps the backend-admin controller onto the shared operator operations.
 * @param controller - the OAuth admin controller that owns the backend SDK.
 * @returns the operations `createMiniProgramOperatorTransport` consumes.
 */
export function createMiniProgramOperatorOperations(
  controller: SdkworkIamOauthAdminController,
): MiniProgramOperatorOperations {
  /**
   * Resolves the login integration behind a resource account. The shared
   * transport addresses accounts by id; the backend actions that also touch the
   * integration still need its id.
   * @param resourceAccountId - the resource account id.
   * @returns the linked integration id, or an empty string when unlinked.
   */
  const integrationIdOf = (resourceAccountId: string): string => {
    const record = controller.getState().resourceAccounts.find(
      (candidate) => readResourceAccountId(candidate) === resourceAccountId,
    );
    return readAccountIntegrationId(record);
  };

  /**
   * Reads the stored record of one resource account.
   * @param resourceAccountId - the resource account id.
   * @returns the raw record, when the snapshot holds it.
   */
  const recordOf = (resourceAccountId: string): unknown => controller.getState().resourceAccounts.find(
    (candidate) => readResourceAccountId(candidate) === resourceAccountId,
  );

  return {
    async list(query: MiniProgramQuery): Promise<MiniProgramPage> {
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
      const params: Record<string, unknown> = {
        page: 1,
        page_size: MINI_PROGRAM_BACKEND_SCAN_PAGE_SIZE,
      };
      const search = query.q?.trim();
      if (search !== undefined && search !== "") params.q = search;
      // The shared controller refreshes its list after a mutation. The visible
      // list of this page owns its own paged session, so the transport reads a
      // page without disturbing that session's page, filters, or status.
      const readPage = controller.listResourceAccountPage;
      if (typeof readPage !== "function") {
        return { items: [], totalItems: 0, page, pageSize };
      }
      const listPage = await readPage.call(controller, params);
      const accounts: MiniProgramAccount[] = [];
      for (const item of listPage.items) {
        const account = toAccount(item);
        if (account !== undefined) accounts.push(account);
      }
      const offset = (page - 1) * pageSize;
      return {
        items: accounts.slice(offset, offset + pageSize),
        totalItems: accounts.length,
        page,
        pageSize,
      };
    },

    async create(draft) {
      if (draft.environment !== undefined || draft.releaseChannel !== undefined) {
        // The quick-setup route does not carry the surface row's environment or
        // release channel; fail instead of dropping them silently.
        throw new MiniProgramUnsupportedError("surface environment and release channel");
      }
      return controller.createAccountSetup("mini_program", {
        appId: draft.appId,
        appSecret: draft.appSecret ?? "",
        displayName: draft.displayName,
        enabled: true,
        redirectUri: "",
        ...(draft.accountType === undefined ? {} : { accountType: draft.accountType }),
        ...(draft.originalId === undefined ? {} : { originalId: draft.originalId }),
        ...(draft.providerConfig === undefined
          ? {}
          : { config: draft.providerConfig as unknown as SdkworkIamOauthAccountConfig }),
      });
    },

    async updateProfile(id, profile) {
      // The backend profile action addresses the row by its display name as
      // well, so a group that omits it inherits the stored one.
      const displayName = profile.displayName ?? readDisplayName(recordOf(id));
      if (displayName === "") {
        throw new Error("iam-pc-mini-program: the mini-program display name is required");
      }
      await controller.updateAccountProfile(id, integrationIdOf(id), {
        displayName,
        ...(profile.accountType === undefined ? {} : { accountType: profile.accountType }),
        ...(profile.originalId === undefined ? {} : { originalId: profile.originalId }),
      });
    },

    async updateCredentials(id, credentials) {
      await controller.updateAccountCredentials(id, credentials);
    },

    async updateConfig(id, config) {
      // Both models describe the same `provider_config_json` document; the
      // shared model keeps provider-owned keys open, the backend model names
      // the ones it interprets.
      await controller.updateAccountConfig(id, config as unknown as SdkworkIamOauthAccountConfig);
    },

    async remove(id) {
      await controller.deleteResourceAccount(id);
    },

    async setEnabled(id, enabled) {
      await controller.setResourceAccountEnabled(id, integrationIdOf(id), enabled);
    },

    async runLoginCheck(id) {
      return controller.runResourceAccountMiniProgramLoginCheck(id);
    },

    toAccount,
  };
}

/**
 * Derives the panel capability set from the server-side mutation permissions.
 *
 * The permission model has three flags; the panel's credential capability gates
 * both the create action and the AppSecret field, so it stays on when either
 * create or update is allowed. A call the server refuses still surfaces its
 * error, so this never turns a denial into a silent no-op.
 * @param permissions - the page-level permission discovery; every member defaults to true.
 * @returns the capability set the panel renders with.
 */
export function miniProgramCapabilitiesOf(
  permissions?: SdkworkIamOauthPagePermissions,
): MiniProgramCapabilities {
  const canCreate = permissions?.create ?? true;
  const canUpdate = permissions?.update ?? true;
  return {
    ...DEFAULT_OPERATOR_CAPABILITIES,
    editCredentials: canCreate || canUpdate,
    runLoginCheck: canUpdate,
    setEnabled: canUpdate,
    deleteAccount: permissions?.delete ?? true,
  };
}

/**
 * Builds the operator-mode mini-program controller over a backend-admin
 * controller.
 *
 * @param controller - the OAuth admin controller that owns the backend SDK.
 * @param capabilities - the capability set the mounting surface allows.
 * @returns the shared controller the panel renders from.
 */
export function createIamOauthMiniProgramController(
  controller: SdkworkIamOauthAdminController,
  capabilities: MiniProgramCapabilities,
): MiniProgramController {
  return createMiniProgramController(
    createMiniProgramOperatorTransport(createMiniProgramOperatorOperations(controller)),
    capabilities,
  );
}
