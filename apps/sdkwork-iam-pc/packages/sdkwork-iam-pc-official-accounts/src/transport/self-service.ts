/**
 * Self-service transport adapter.
 *
 * Wraps the generated IAM **app** SDK slice
 * (`client.iam.oauth.officialAccounts`, `/app/v3/api/iam/oauth/official_accounts`)
 * or any structurally equivalent host slice. The wire contract is unchanged:
 * the create body carries the WeChat AppID as `wechatAppId`, blank secrets are
 * omitted so the stored value is kept, and the row is addressed by its account
 * id on update.
 *
 * The API object is injected by the host; this package never imports the SDK,
 * never performs raw HTTP, and never assembles authentication headers.
 */
import type {
  OfficialAccountsCustomMenuContext,
  OfficialAccountsCustomMenuPublishResult,
  OfficialAccountsMenu,
  OfficialAccountsPatch,
  OfficialAccountsProviderConfig,
  OfficialAccountsQuery,
  OfficialAccountsTransport,
  OfficialAccount,
  OfficialAccountDraft,
} from "../types";
import { OfficialAccountsUnsupportedError } from "../client/controller";
import {
  readOfficialAccountMenu,
  toOfficialAccount,
  toOfficialAccountCommand,
  toOfficialAccountCreateCommand,
} from "./normalize";

/** Default page size of the account list. */
const DEFAULT_PAGE_SIZE = 20;

/** The generated app-SDK face this adapter consumes. */
export interface OfficialAccountsSelfServiceApi {
  /** @param params - page, page size, and search text. */
  list(params?: {
    page?: number;
    pageSize?: number;
    q?: string;
  }): Promise<{
    items: Record<string, unknown>[];
    pageInfo: { page?: number; pageSize?: number; totalItems?: string | number };
  }>;
  /** @param body - the create command (`wechatAppId` carries the AppID). */
  create(body: Record<string, unknown>): Promise<Record<string, unknown>>;
  /** @param id - account id. @param body - the update command. */
  update(id: string, body?: Record<string, unknown>): Promise<Record<string, unknown>>;
  /** @param id - account id. */
  delete(id: string): Promise<void>;
  /** Optional single-record read; improves partial updates and menu reads. */
  retrieve?(id: string): Promise<Record<string, unknown>>;
  /**
   * Optional menu maintenance actions the app API exposes for the caller's own
   * account. Present from the menu-versioned app API onward; absent on older
   * SDK slices, in which case the controller reports the action unsupported.
   */
  customMenus?: {
    /** Pull the live WeChat menu into the stored draft. */
    sync?(id: string, body?: Record<string, unknown>): Promise<Record<string, unknown>>;
    /** Publish the stored draft to the WeChat console. */
    publish?(id: string, body?: Record<string, unknown>): Promise<Record<string, unknown>>;
    /** Restore a retained revision and publish it. */
    rollback?(id: string, body?: Record<string, unknown>): Promise<Record<string, unknown>>;
  };
}

/**
 * Build the self-service transport.
 *
 * @param api - `client.iam.oauth.officialAccounts` or an equivalent host slice.
 * @returns the transport the shared controller consumes.
 */
export function createSelfServiceTransport(
  api: OfficialAccountsSelfServiceApi,
): OfficialAccountsTransport {
  const readAccount = async (id: string): Promise<OfficialAccount | undefined> => {
    if (api.retrieve === undefined) return undefined;
    try {
      return toOfficialAccount(await api.retrieve(id));
    } catch {
      return undefined;
    }
  };
  /**
   * Builds the update body, inheriting the stored display name when the patch
   * omits it, so a partial action never blanks the account name.
   * @param id - account id.
   * @param patch - the caller's fields.
   * @returns the request body.
   */
  const commandFor = async (
    id: string,
    patch: Partial<OfficialAccountDraft>,
  ): Promise<Record<string, unknown>> => {
    const command = toOfficialAccountCommand(patch);
    if (patch.displayName === undefined) {
      const current = await readAccount(id);
      if (current !== undefined) {
        command.displayName = current.displayName;
      } else {
        delete command.displayName;
      }
    }
    return command;
  };
  /** Normalizes one menu-maintenance response into the shared context. */
  const menuContext = (id: string, record: Record<string, unknown>): OfficialAccountsCustomMenuContext => {
    const source = record.source === "database" || record.source === "wechat" ? record.source : undefined;
    const displayName = typeof record.displayName === "string" ? record.displayName : undefined;
    const version = typeof record.version === "number" ? record.version : undefined;
    const menu = readOfficialAccountMenu(record.menu);
    return {
      accountId: id,
      menu,
      ...(displayName === undefined ? {} : { displayName }),
      ...(source === undefined ? {} : { source }),
      ...(version === undefined && menu.version === undefined ? {} : { version: version ?? menu.version }),
    };
  };

  return {
    async list(query?: OfficialAccountsQuery) {
      const page = await api.list({
        page: query?.page ?? 1,
        pageSize: query?.pageSize ?? DEFAULT_PAGE_SIZE,
        ...(query?.q === undefined || query.q.trim() === "" ? {} : { q: query.q.trim() }),
      });
      const total = page.pageInfo.totalItems;
      return {
        items: page.items.map(toOfficialAccount),
        totalItems: typeof total === "number" ? total : Number(total ?? page.items.length),
        page: page.pageInfo.page ?? query?.page ?? 1,
        pageSize: page.pageInfo.pageSize ?? query?.pageSize ?? DEFAULT_PAGE_SIZE,
      };
    },
    async create(draft: OfficialAccountDraft): Promise<OfficialAccount> {
      return toOfficialAccount(await api.create(toOfficialAccountCreateCommand(draft)));
    },
    async update(id: string, patch: OfficialAccountsPatch): Promise<OfficialAccount> {
      return toOfficialAccount(await api.update(id, await commandFor(id, patch)));
    },
    async delete(id: string): Promise<void> {
      await api.delete(id);
    },
    async updateConfig(id: string, config: OfficialAccountsProviderConfig): Promise<OfficialAccount> {
      const body = await commandFor(id, {});
      if (config.logoUrl !== undefined) body.logoUrl = config.logoUrl;
      if (config.jsSecureDomains !== undefined) body.jsSecureDomains = [...config.jsSecureDomains];
      if (config.webAuthDomains !== undefined) body.webAuthDomains = [...config.webAuthDomains];
      if (config.businessDomains !== undefined) body.businessDomains = [...config.businessDomains];
      if (config.customMenu !== undefined) body.customMenu = config.customMenu;
      if (config.notify?.url !== undefined) body.notifyUrl = config.notify.url;
      if (config.notify?.token !== undefined) body.notifyToken = config.notify.token;
      if (config.notify?.encodingAesKey !== undefined) {
        body.notifyEncodingAesKey = config.notify.encodingAesKey;
      }
      const encryptMode = config.notify?.encryptMode;
      if (encryptMode === "plaintext" || encryptMode === "compatible" || encryptMode === "safe") {
        body.notifyEncryptMode = encryptMode;
      }
      return toOfficialAccount(await api.update(id, body));
    },
    async loadCustomMenu(id: string) {
      const account = await readAccount(id);
      if (account === undefined) {
        throw new OfficialAccountsUnsupportedError("loadCustomMenu");
      }
      return { accountId: id, menu: account.customMenu };
    },
    async saveCustomMenu(id: string, menu: OfficialAccountsMenu) {
      await api.update(id, await commandFor(id, { customMenu: menu }));
      return { accountId: id, menu };
    },
    async setEnabled(id: string, enabled: boolean): Promise<void> {
      await api.update(id, await commandFor(id, { enabled }));
    },
    ...(api.customMenus?.sync === undefined
      ? {}
      : {
        async syncCustomMenu(id: string, baseVersion?: number): Promise<OfficialAccountsCustomMenuContext> {
          const record = await api.customMenus!.sync!(id, {
            ...(baseVersion === undefined ? {} : { baseVersion }),
          });
          return menuContext(id, record);
        },
      }),
    ...(api.customMenus?.publish === undefined
      ? {}
      : {
        async publishCustomMenu(
          id: string,
          menu: OfficialAccountsMenu,
        ): Promise<OfficialAccountsCustomMenuPublishResult> {
          const record = await api.customMenus!.publish!(id, { buttons: menu.buttons });
          return {
            accountId: id,
            published: true,
            saved: true,
            context: menuContext(id, record),
          };
        },
      }),
    ...(api.customMenus?.rollback === undefined
      ? {}
      : {
        async rollbackCustomMenu(
          id: string,
          version: number,
          baseVersion?: number,
        ): Promise<OfficialAccountsCustomMenuContext> {
          const record = await api.customMenus!.rollback!(id, {
            version,
            ...(baseVersion === undefined ? {} : { baseVersion }),
          });
          return menuContext(id, record);
        },
      }),
  };
}
