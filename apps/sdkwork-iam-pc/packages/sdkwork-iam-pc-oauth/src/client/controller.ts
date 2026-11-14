/**
 * Transport adapter and state controller for the user-facing official-account
 * surface.
 *
 * `createSdkworkIamOfficialAccountsClient` adapts the generated IAM app SDK
 * slice (`client.iam.oauth.officialAccounts`) or any equivalent host transport
 * to the panel's narrow port. `SdkworkIamOfficialAccountsController` owns the
 * list/query state and publishes only after an operation settles, so a failed
 * mutation never leaves the panel showing data the server rejected.
 */
import type {
  SdkworkIamOfficialAccount,
  SdkworkIamOfficialAccountDraft,
  SdkworkIamOfficialAccountEncryptMode,
  SdkworkIamOfficialAccountMenu,
  SdkworkIamOfficialAccountMenuButton,
  SdkworkIamOfficialAccountsClient,
  SdkworkIamOfficialAccountsListPage,
  SdkworkIamOfficialAccountsQuery,
  SdkworkIamOfficialAccountsState,
} from "../types";

/** Default page size of the account list. */
export const DEFAULT_OFFICIAL_ACCOUNTS_PAGE_SIZE = 20;

/** The generated app-SDK face this adapter consumes. */
export interface SdkworkIamOfficialAccountsApi {
  list(params?: SdkworkIamOfficialAccountsQuery): Promise<{
    items: Record<string, unknown>[];
    pageInfo: { page?: number; pageSize?: number; totalItems?: string | number };
  }>;
  create(body: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(officialAccountId: string, body?: Record<string, unknown>): Promise<Record<string, unknown>>;
  delete(officialAccountId: string): Promise<void>;
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
}

/** Reads a stored domain array, ignoring non-string entries and blank values. */
function readDomains(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

/** Reads the message-push encryption mode, defaulting to plaintext. */
function readEncryptMode(
  record: Record<string, unknown>,
  key: string,
): SdkworkIamOfficialAccountEncryptMode {
  const value = readString(record, key);
  return value === "compatible" || value === "safe" ? value : "plaintext";
}

/** Parses one menu button from a stored menu document. */
function readMenuButton(value: unknown): SdkworkIamOfficialAccountMenuButton | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  const name = readString(record, "name");
  if (name === undefined) return undefined;
  const type = readString(record, "type");
  const subButtons = Array.isArray(record.subButtons)
    ? record.subButtons
      .map(readMenuButton)
      .filter((button): button is SdkworkIamOfficialAccountMenuButton => button !== undefined)
    : undefined;
  return {
    name,
    ...(type === "view" || type === "click" ? { type } : {}),
    ...(readString(record, "url") === undefined ? {} : { url: readString(record, "url") }),
    ...(readString(record, "key") === undefined ? {} : { key: readString(record, "key") }),
    ...(subButtons === undefined || subButtons.length === 0 ? {} : { subButtons }),
  };
}

/** Parses a stored custom-menu document. */
export function readOfficialAccountMenu(value: unknown): SdkworkIamOfficialAccountMenu {
  if (typeof value !== "object" || value === null) return { buttons: [] };
  const record = value as Record<string, unknown>;
  const raw = Array.isArray(record.buttons) ? record.buttons : [];
  return {
    buttons: raw
      .map(readMenuButton)
      .filter((button): button is SdkworkIamOfficialAccountMenuButton => button !== undefined),
  };
}

/**
 * Normalize one API record into the panel model.
 * @param value - one account record from the API.
 * @returns the account the panel renders.
 * @throws {Error} when the record carries no account id.
 */
export function toOfficialAccount(value: Record<string, unknown>): SdkworkIamOfficialAccount {
  const id = readString(value, "officialAccountId") ?? readString(value, "id");
  if (id === undefined) {
    throw new Error("iam-pc-oauth: official account record is missing its id");
  }
  const appId = readString(value, "appId");
  if (appId === undefined) {
    throw new Error("iam-pc-oauth: official account record is missing its AppID");
  }
  const displayName = readString(value, "displayName") ?? appId;
  return {
    id,
    appId,
    displayName,
    ...(readString(value, "accountType") === undefined
      ? {}
      : { accountType: readString(value, "accountType") }),
    ...(readString(value, "originalId") === undefined
      ? {}
      : { originalId: readString(value, "originalId") }),
    ...(readString(value, "logoUrl") === undefined ? {} : { logoUrl: readString(value, "logoUrl") }),
    hasAppSecret: readBoolean(value, "hasAppSecret"),
    ...(readString(value, "notifyUrl") === undefined
      ? {}
      : { notifyUrl: readString(value, "notifyUrl") }),
    hasNotifyToken: readBoolean(value, "hasNotifyToken"),
    hasEncodingAesKey: readBoolean(value, "hasEncodingAesKey"),
    notifyEncryptMode: readEncryptMode(value, "notifyEncryptMode"),
    jsSecureDomains: readDomains(value, "jsSecureDomains"),
    webAuthDomains: readDomains(value, "webAuthDomains"),
    businessDomains: readDomains(value, "businessDomains"),
    customMenu: readOfficialAccountMenu(value.customMenu),
    enabled: value.enabled !== false,
    status: readString(value, "status") ?? "active",
    ...(readString(value, "createdAt") === undefined
      ? {}
      : { createdAt: readString(value, "createdAt") }),
    ...(readString(value, "updatedAt") === undefined
      ? {}
      : { updatedAt: readString(value, "updatedAt") }),
  };
}

/**
 * Builds the update body; empty secrets are omitted so they are kept.
 *
 * The WeChat AppID is not an update field: the row is addressed by
 * `officialAccountId` and the app API keeps the AppID immutable after create.
 */
export function toOfficialAccountCommand(
  draft: SdkworkIamOfficialAccountDraft,
): Record<string, unknown> {
  const command: Record<string, unknown> = {
    displayName: draft.displayName.trim(),
  };
  if (draft.accountType !== undefined) command.accountType = draft.accountType;
  if (draft.originalId !== undefined) command.originalId = draft.originalId;
  if (draft.logoUrl !== undefined) command.logoUrl = draft.logoUrl;
  if (draft.appSecret !== undefined && draft.appSecret.trim() !== "") {
    command.appSecret = draft.appSecret.trim();
  }
  if (draft.notifyUrl !== undefined) command.notifyUrl = draft.notifyUrl;
  if (draft.notifyToken !== undefined && draft.notifyToken.trim() !== "") {
    command.notifyToken = draft.notifyToken.trim();
  }
  if (draft.notifyEncodingAesKey !== undefined && draft.notifyEncodingAesKey.trim() !== "") {
    command.notifyEncodingAesKey = draft.notifyEncodingAesKey.trim();
  }
  if (draft.notifyEncryptMode !== undefined) {
    command.notifyEncryptMode = draft.notifyEncryptMode;
  }
  if (draft.jsSecureDomains !== undefined) {
    command.jsSecureDomains = [...draft.jsSecureDomains];
  }
  if (draft.webAuthDomains !== undefined) {
    command.webAuthDomains = [...draft.webAuthDomains];
  }
  if (draft.businessDomains !== undefined) {
    command.businessDomains = [...draft.businessDomains];
  }
  if (draft.customMenu !== undefined) command.customMenu = draft.customMenu;
  if (draft.enabled !== undefined) command.enabled = draft.enabled;
  return command;
}

/**
 * Builds the create body: the update body plus the WeChat AppID.
 *
 * The AppID travels as `wechatAppId`. The app API reserves a top-level `appId`
 * key as an ambient tenant/app/subject context selector and rejects any request
 * body that carries it, while this value is the channel's own WeChat identifier;
 * the provider-qualified name is what the create command binds.
 * @param draft - the new account.
 * @returns the create request body.
 */
export function toOfficialAccountCreateCommand(
  draft: SdkworkIamOfficialAccountDraft,
): Record<string, unknown> {
  const command = toOfficialAccountCommand(draft);
  if (draft.appId !== undefined && draft.appId.trim() !== "") {
    command.wechatAppId = draft.appId.trim();
  }
  return command;
}

/**
 * Adapt a generated app-SDK slice to the panel port.
 * @param api - `client.iam.oauth.officialAccounts` or an equivalent transport.
 * @returns the port the panel and controller consume.
 */
export function createSdkworkIamOfficialAccountsClient(
  api: SdkworkIamOfficialAccountsApi,
): SdkworkIamOfficialAccountsClient {
  return {
    async list(query?: SdkworkIamOfficialAccountsQuery): Promise<SdkworkIamOfficialAccountsListPage> {
      const page = await api.list({
        page: query?.page ?? 1,
        pageSize: query?.pageSize ?? DEFAULT_OFFICIAL_ACCOUNTS_PAGE_SIZE,
        ...(query?.q === undefined || query.q.trim() === "" ? {} : { q: query.q.trim() }),
      });
      const total = page.pageInfo.totalItems;
      return {
        items: page.items.map(toOfficialAccount),
        totalItems: typeof total === "number" ? total : Number(total ?? page.items.length),
        page: page.pageInfo.page ?? query?.page ?? 1,
        pageSize: page.pageInfo.pageSize ?? query?.pageSize ?? DEFAULT_OFFICIAL_ACCOUNTS_PAGE_SIZE,
      };
    },
    async create(draft: SdkworkIamOfficialAccountDraft): Promise<SdkworkIamOfficialAccount> {
      return toOfficialAccount(await api.create(toOfficialAccountCreateCommand(draft)));
    },
    async update(
      officialAccountId: string,
      patch: SdkworkIamOfficialAccountDraft,
    ): Promise<SdkworkIamOfficialAccount> {
      return toOfficialAccount(
        await api.update(officialAccountId, toOfficialAccountCommand(patch)),
      );
    },
    async delete(officialAccountId: string): Promise<void> {
      await api.delete(officialAccountId);
    },
  };
}

/** State controller the panel renders from. */
export class SdkworkIamOfficialAccountsController {
  private state: SdkworkIamOfficialAccountsState = {
    status: "idle",
    accounts: [],
    totalItems: 0,
    page: 1,
    pageSize: DEFAULT_OFFICIAL_ACCOUNTS_PAGE_SIZE,
    query: "",
  };
  private readonly listeners = new Set<() => void>();

  /** @param client - the transport port. */
  constructor(private readonly client: SdkworkIamOfficialAccountsClient) {}

  /** @returns the current immutable state snapshot. */
  getState = (): SdkworkIamOfficialAccountsState => this.state;

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
      const result = await this.client.list({ page, pageSize: this.state.pageSize, q: query });
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
   * Create an account and reload the current page.
   * @param draft - the new account.
   * @returns the created account.
   */
  async create(draft: SdkworkIamOfficialAccountDraft): Promise<SdkworkIamOfficialAccount> {
    const created = await this.client.create(draft);
    await this.load({ page: 1 });
    return created;
  }

  /**
   * Update an account and reload the current page.
   * @param officialAccountId - account id.
   * @param patch - fields to change.
   * @returns the stored account.
   */
  async update(
    officialAccountId: string,
    patch: SdkworkIamOfficialAccountDraft,
  ): Promise<SdkworkIamOfficialAccount> {
    const updated = await this.client.update(officialAccountId, patch);
    await this.load();
    return updated;
  }

  /**
   * Delete an account and reload the current page.
   * @param officialAccountId - account id.
   */
  async remove(officialAccountId: string): Promise<void> {
    await this.client.delete(officialAccountId);
    await this.load();
  }

  /**
   * Toggle an account's enabled flag.
   * @param account - the current account row.
   * @param enabled - target value.
   */
  async setEnabled(account: SdkworkIamOfficialAccount, enabled: boolean): Promise<void> {
    await this.update(account.id, {
      appId: account.appId,
      displayName: account.displayName,
      enabled,
    });
  }

  /**
   * Save the custom-menu draft for one account.
   * @param account - the current account row.
   * @param menu - the complete menu draft.
   */
  async saveMenu(
    account: SdkworkIamOfficialAccount,
    menu: SdkworkIamOfficialAccountMenu,
  ): Promise<void> {
    await this.update(account.id, {
      appId: account.appId,
      displayName: account.displayName,
      customMenu: menu,
    });
  }

  private setState(patch: Partial<SdkworkIamOfficialAccountsState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of [...this.listeners]) listener();
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
