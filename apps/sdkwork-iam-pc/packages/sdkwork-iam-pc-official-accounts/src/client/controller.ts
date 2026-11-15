/**
 * The single official-account state machine.
 *
 * One controller instance owns the list/query state and the commit points of
 * every mutation for both administration postures (`operator` and
 * `self-service`); the {@link OfficialAccountsCapabilities} flags only decide
 * which actions a host may invoke and which sections its panel renders. No
 * second controller, no per-host duplicate.
 *
 * The controller publishes only after an operation settles, so a failed
 * mutation never leaves a surface showing data the server rejected.
 */
import type {
  OfficialAccountsCapabilities,
  OfficialAccountsCustomMenuContext,
  OfficialAccountsCustomMenuPublishResult,
  OfficialAccountsFollowQrCode,
  OfficialAccountsMenu,
  OfficialAccountsPatch,
  OfficialAccountsProviderConfig,
  OfficialAccountsState,
  OfficialAccountsTransport,
  OfficialAccountsVerificationKind,
  OfficialAccount,
  OfficialAccountDraft,
} from "../types";

/** Default page size of the account list. */
export const DEFAULT_OFFICIAL_ACCOUNTS_PAGE_SIZE = 20;

/** Operator posture: the backend-admin / console surface. */
export const DEFAULT_OPERATOR_CAPABILITIES: OfficialAccountsCapabilities = {
  mode: "operator",
  editCredentials: true,
  publishMenu: true,
  manageQrLogin: true,
  manageDomains: true,
  manageNotify: true,
  deleteAccount: true,
  manageFollowQrCode: true,
  refreshMenu: true,
  rollbackMenu: true,
};

/** Self-service posture: the signed-in maintainer's own accounts. */
export const DEFAULT_SELF_SERVICE_CAPABILITIES: OfficialAccountsCapabilities = {
  mode: "self-service",
  editCredentials: true,
  publishMenu: false,
  manageQrLogin: false,
  manageDomains: true,
  manageNotify: true,
  deleteAccount: true,
  manageFollowQrCode: false,
  refreshMenu: false,
  rollbackMenu: false,
};

/** The host surface forbids the action (see {@link OfficialAccountsCapabilities}). */
export class OfficialAccountsCapabilityError extends Error {
  /** @param capability - the capability flag that disabled the action. */
  constructor(readonly capability: keyof Omit<OfficialAccountsCapabilities, "mode">) {
    super(`iam-pc-official-accounts: capability "${capability}" is disabled on this surface`);
    this.name = "OfficialAccountsCapabilityError";
  }
}

/** The injected transport does not implement the action. */
export class OfficialAccountsUnsupportedError extends Error {
  /** @param action - the transport member that is missing. */
  constructor(readonly action: string) {
    super(`iam-pc-official-accounts: the injected transport does not support "${action}"`);
    this.name = "OfficialAccountsUnsupportedError";
  }
}

/** State controller the panel renders from. */
export class OfficialAccountsController {
  private state: OfficialAccountsState = {
    status: "idle",
    accounts: [],
    totalItems: 0,
    page: 1,
    pageSize: DEFAULT_OFFICIAL_ACCOUNTS_PAGE_SIZE,
    query: "",
  };
  private readonly listeners = new Set<() => void>();

  /** @param transport - the injected transport port. @param capabilities - what the host allows. */
  constructor(
    private readonly transport: OfficialAccountsTransport,
    readonly capabilities: OfficialAccountsCapabilities,
  ) {}

  /** @returns the current immutable state snapshot. */
  getState = (): OfficialAccountsState => this.state;

  /**
   * Observe state changes.
   * @param listener - change listener.
   * @returns the disposer removing the listener.
   */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Load one page. A query change resets to page one.
   * @param options - page number and optional search text.
   */
  async load(options: { page?: number; q?: string } = {}): Promise<void> {
    const query = options.q ?? this.state.query;
    const page = options.page ?? (query === this.state.query ? this.state.page : 1);
    this.setState({ status: "loading", query, page, error: undefined });
    try {
      const result = await this.transport.list({ page, pageSize: this.state.pageSize, q: query });
      this.setState({
        status: "ready",
        accounts: result.items,
        totalItems: result.totalItems,
        page: result.page,
        pageSize: result.pageSize,
        error: undefined,
      });
    } catch (error) {
      this.setState({ status: "error", error: messageOf(error) });
    }
  }

  /**
   * Create an account and reload the first page.
   * @param draft - the new account.
   * @returns the created account.
   */
  async create(draft: OfficialAccountDraft): Promise<OfficialAccount> {
    const created = await this.transport.create(draft);
    await this.load({ page: 1 });
    return created;
  }

  /**
   * Update an account and reload the current page.
   * @param id - account id.
   * @param patch - fields (or field groups) to change.
   * @returns the stored account.
   */
  async update(id: string, patch: OfficialAccountsPatch): Promise<OfficialAccount> {
    const complete = this.withDisplayName(id, patch);
    const updated = await this.transport.update(id, complete);
    await this.load();
    return updated;
  }

  /**
   * Delete an account and reload the current page.
   * @param id - account id.
   */
  async remove(id: string): Promise<void> {
    if (!this.capabilities.deleteAccount) {
      throw new OfficialAccountsCapabilityError("deleteAccount");
    }
    await this.transport.delete(id);
    await this.load();
  }

  /**
   * Toggle an account's enabled flag.
   *
   * A self-service update is addressed by id but still carries the account's
   * display name; an operator update is a dedicated switch action, so it sends
   * only the flag.
   * @param target - the account row, or its id when it is already loaded.
   * @param enabled - target value.
   */
  async setEnabled(target: OfficialAccount | string, enabled: boolean): Promise<void> {
    const account = this.resolveTarget(target);
    await this.update(idOf(target), {
      ...(account === undefined || this.capabilities.mode === "operator"
        ? {}
        : { displayName: account.displayName }),
      enabled,
    });
  }

  /**
   * Toggle whether the account is the scan-login default (`D4`).
   * @param target - the account row, or its id.
   * @param enabled - target value.
   */
  async setQrLogin(target: OfficialAccount | string, enabled: boolean): Promise<void> {
    if (!this.capabilities.manageQrLogin) {
      throw new OfficialAccountsCapabilityError("manageQrLogin");
    }
    const setQrLogin = this.transport.setQrLogin;
    if (setQrLogin === undefined) {
      throw new OfficialAccountsUnsupportedError("setQrLogin");
    }
    await setQrLogin.call(this.transport, idOf(target), enabled);
    await this.load();
  }

  /**
   * Save the custom-menu draft for one account.
   *
   * On an operator surface the draft belongs to the account's provider
   * configuration, so only the draft is sent; the self-service wire is one
   * account update and therefore also carries the display name.
   * @param target - the account row, or its id.
   * @param menu - the complete menu draft.
   */
  async saveMenu(target: OfficialAccount | string, menu: OfficialAccountsMenu): Promise<void> {
    const account = this.resolveTarget(target);
    await this.update(idOf(target), {
      ...(account === undefined || this.capabilities.mode === "operator"
        ? {}
        : { displayName: account.displayName }),
      customMenu: menu,
    });
  }

  /**
   * Push the custom-menu draft to the WeChat console (operator only).
   * @param target - the account row, or its id.
   * @param menu - the complete menu draft.
   * @returns the channel's publication result.
   */
  async publishMenu(
    target: OfficialAccount | string,
    menu: OfficialAccountsMenu,
  ): Promise<OfficialAccountsCustomMenuPublishResult> {
    if (!this.capabilities.publishMenu) {
      throw new OfficialAccountsCapabilityError("publishMenu");
    }
    const publish = this.transport.publishCustomMenu;
    if (publish === undefined) {
      throw new OfficialAccountsUnsupportedError("publishCustomMenu");
    }
    const result = await publish.call(this.transport, idOf(target), menu);
    await this.load();
    return result;
  }

  /**
   * Read the stored custom-menu draft of one account.
   * @param id - account id.
   * @returns the draft the channel currently holds.
   */
  async loadMenu(id: string): Promise<OfficialAccountsCustomMenuContext> {
    return this.transport.loadCustomMenu(id);
  }

  /**
   * Pull the live WeChat menu into the stored draft as a new version.
   * @param target - the account row, or its id.
   * @param baseVersion - the version the caller last saw; a mismatch is a conflict.
   * @returns the refreshed menu context.
   */
  async syncMenu(
    target: OfficialAccount | string,
    baseVersion?: number,
  ): Promise<OfficialAccountsCustomMenuContext> {
    if (this.capabilities.refreshMenu !== true) {
      throw new OfficialAccountsCapabilityError("refreshMenu");
    }
    const sync = this.transport.syncCustomMenu;
    if (sync === undefined) {
      throw new OfficialAccountsUnsupportedError("syncCustomMenu");
    }
    const context = await sync.call(this.transport, idOf(target), baseVersion);
    await this.load();
    return context;
  }

  /**
   * Restore an older stored menu revision as the new live draft.
   * @param target - the account row, or its id.
   * @param version - the revision to restore.
   * @param baseVersion - the version the caller last saw; a mismatch is a conflict.
   * @returns the restored menu context.
   */
  async rollbackMenu(
    target: OfficialAccount | string,
    version: number,
    baseVersion?: number,
  ): Promise<OfficialAccountsCustomMenuContext> {
    if (this.capabilities.rollbackMenu !== true) {
      throw new OfficialAccountsCapabilityError("rollbackMenu");
    }
    const rollback = this.transport.rollbackCustomMenu;
    if (rollback === undefined) {
      throw new OfficialAccountsUnsupportedError("rollbackCustomMenu");
    }
    const context = await rollback.call(this.transport, idOf(target), version, baseVersion);
    await this.load();
    return context;
  }

  /**
   * Persist one account's provider configuration document (`D5`).
   * @param target - the account row, or its id.
   * @param config - the complete configuration document.
   * @returns the stored account.
   */
  async updateConfig(
    target: OfficialAccount | string,
    config: OfficialAccountsProviderConfig,
  ): Promise<OfficialAccount> {
    const updated = await this.transport.updateConfig(idOf(target), config);
    await this.load();
    return updated;
  }

  /**
   * Create the WeChat follow (parameterized) QR of one account.
   * @param target - the account row, or its id.
   * @returns the QR the channel issued.
   */
  async createFollowQrCode(target: OfficialAccount | string): Promise<OfficialAccountsFollowQrCode> {
    if (!this.capabilities.manageQrLogin) {
      throw new OfficialAccountsCapabilityError("manageQrLogin");
    }
    const create = this.transport.createFollowQrCode;
    if (create === undefined) {
      throw new OfficialAccountsUnsupportedError("createFollowQrCode");
    }
    return create.call(this.transport, idOf(target));
  }

  /**
   * Queue a verification run of one account.
   * @param target - the account row, or its id.
   * @param kind - what to verify (`domain`, `webhook`, or `authorization`).
   */
  async runVerification(
    target: OfficialAccount | string,
    kind: OfficialAccountsVerificationKind,
  ): Promise<void> {
    if (kind === "domain" && !this.capabilities.manageDomains) {
      throw new OfficialAccountsCapabilityError("manageDomains");
    }
    if (kind === "webhook" && !this.capabilities.manageNotify) {
      throw new OfficialAccountsCapabilityError("manageNotify");
    }
    const run = this.transport.runVerification;
    if (run === undefined) {
      throw new OfficialAccountsUnsupportedError("runVerification");
    }
    await run.call(this.transport, idOf(target), kind);
    await this.load();
  }

  /**
   * Resolve the loaded row behind a target so display-name-addressed actions
   * keep working when the caller only holds an id.
   * @param target - the account row or id.
   * @returns the loaded row, when the list holds it.
   */
  private resolveTarget(target: OfficialAccount | string): OfficialAccount | undefined {
    if (typeof target !== "string") return target;
    return this.state.accounts.find((account) => account.id === target);
  }

  /**
   * The self-service wire addresses an account by id but still requires its
   * display name, so an update that carries none inherits the loaded row's.
   * @param id - account id.
   * @param patch - the caller's patch.
   * @returns the patch to hand to the transport.
   */
  private withDisplayName(id: string, patch: OfficialAccountsPatch): OfficialAccountsPatch {
    if (patch.displayName !== undefined || patch.profile?.displayName !== undefined) {
      return patch;
    }
    if (this.capabilities.mode !== "self-service") {
      return patch;
    }
    const account = this.resolveTarget(id);
    if (account === undefined) {
      throw new OfficialAccountsUnsupportedError("update without a display name");
    }
    return { ...patch, displayName: account.displayName };
  }

  private setState(patch: Partial<OfficialAccountsState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of [...this.listeners]) listener();
  }
}

/**
 * Build the shared official-account controller.
 * @param transport - the host-injected transport.
 * @param capabilities - what the host allows and how it administers accounts.
 * @returns the controller the panel renders from.
 */
export function createOfficialAccountsController(
  transport: OfficialAccountsTransport,
  capabilities: OfficialAccountsCapabilities,
): OfficialAccountsController {
  return new OfficialAccountsController(transport, capabilities);
}

function idOf(target: OfficialAccount | string): string {
  return typeof target === "string" ? target : target.id;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
