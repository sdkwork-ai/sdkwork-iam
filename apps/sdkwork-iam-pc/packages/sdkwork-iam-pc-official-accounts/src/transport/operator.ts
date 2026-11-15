/**
 * Operator transport adapter.
 *
 * Wraps the generated IAM **backend** SDK slice
 * (`iam.oauth.resourceAccounts.*`, i.e. the unified
 * `iam_oauth_resource_account` aggregate) or any structurally equivalent host
 * slice (a backend-admin controller that already holds the SDK). The wire
 * contract is unchanged: this adapter only decides which action each field
 * group belongs to.
 *
 * A grouped {@link OfficialAccountsPatch} is applied in dependency order —
 * profile, credentials, provider configuration, enable switch — so a partial
 * failure never stores half an edit. Ungrouped panel-shaped patches are grouped
 * here, so a host that renders the shared panel does not need to know the
 * operator's action granularity.
 */
import type {
  OfficialAccountsCustomMenuContext,
  OfficialAccountsCustomMenuPublishResult,
  OfficialAccountsFollowQrCode,
  OfficialAccountsMenu,
  OfficialAccountsPage,
  OfficialAccountsPatch,
  OfficialAccountsProviderConfig,
  OfficialAccountsQuery,
  OfficialAccountsTransport,
  OfficialAccountsVerificationKind,
  OfficialAccount,
  OfficialAccountDraft,
} from "../types";
import { toOfficialAccount } from "./normalize";

/**
 * The host operations an operator transport delegates to.
 *
 * Every member is the host's own action on the unified aggregate; the transport
 * never re-implements them. `create` is the one-click setup (integration →
 * client → resource account) the backend-admin surface exposes.
 */
export interface OfficialAccountsOperatorOperations {
  /** List one page of resource accounts (already normalized or raw). */
  list(query: OfficialAccountsQuery): Promise<OfficialAccountsPage>
  /** One-click setup: create (or reuse) the login integration and its account. */
  create(draft: OfficialAccountDraft): Promise<unknown>
  /** Persist display name / account type / original id. */
  updateProfile?(id: string, profile: {
    displayName?: string
    accountType?: string
    originalId?: string
  }): Promise<unknown>
  /** Persist AppID / AppSecret (an empty secret keeps the stored one). */
  updateCredentials?(id: string, credentials: { appId?: string; appSecret?: string }): Promise<unknown>
  /** Persist the `provider_config_json` document. */
  updateConfig(id: string, config: OfficialAccountsProviderConfig): Promise<unknown>
  /** Delete the resource account (shared integration/client stay). */
  remove(id: string): Promise<void>
  /** Enable or disable the account (and its login integration). */
  setEnabled(id: string, enabled: boolean): Promise<void>
  /** Mark the account as the scan-login default (or clear it). */
  setQrLogin?(id: string, enabled: boolean): Promise<void>
  /** Create the WeChat follow (parameterized) QR. */
  createFollowQrCode?(id: string): Promise<OfficialAccountsFollowQrCode>
  /** Queue a verification run. */
  runVerification?(id: string, kind: OfficialAccountsVerificationKind): Promise<void>
  /** Read the stored custom-menu draft. */
  loadCustomMenu?(id: string): Promise<OfficialAccountsCustomMenuContext>
  /** Persist the custom-menu draft. */
  saveCustomMenu?(id: string, menu: OfficialAccountsMenu): Promise<OfficialAccountsCustomMenuContext>
  /** Push the custom-menu draft to the WeChat console. */
  publishCustomMenu?(
    id: string,
    menu: OfficialAccountsMenu,
  ): Promise<OfficialAccountsCustomMenuPublishResult>
  /** Override the record normalizer; defaults to the shared one. */
  toAccount?(record: unknown): OfficialAccount | undefined
}

/** Fields that make up the provider configuration document. */
const CONFIG_FIELDS = [
  "logoUrl",
  "customMenu",
  "jsSecureDomains",
  "webAuthDomains",
  "businessDomains",
] as const;

/**
 * Build the operator transport.
 *
 * @param operations - the host's resource-account actions.
 * @returns the transport the shared controller consumes.
 */
export function createOperatorTransport(
  operations: OfficialAccountsOperatorOperations,
): OfficialAccountsTransport {
  /**
   * Normalizes a host record, tolerating a host that returns no usable record
   * after a write (the mutation still succeeded).
   * @param record - the host's return value.
   * @returns the account, when it can be read.
   */
  const accountOf = (record: unknown): OfficialAccount | undefined => {
    if (record === undefined || record === null) return undefined;
    if (operations.toAccount !== undefined) return operations.toAccount(record);
    if (typeof record !== "object") return undefined;
    try {
      return toOfficialAccount(record as Record<string, unknown>);
    } catch {
      return undefined;
    }
  };

  /**
   * Groups a panel-shaped patch and builds the provider configuration document.
   * @param patch - the caller's patch.
   * @returns the profile, credentials, configuration, and switch members.
   */
  const groupsOf = (patch: OfficialAccountsPatch): {
    profile?: { displayName?: string; accountType?: string; originalId?: string }
    credentials?: { appId?: string; appSecret?: string }
    config?: OfficialAccountsProviderConfig
    enabled?: boolean
    qrDefaultEnabled?: boolean
    changed: boolean
  } => {
    const profile = patch.profile ?? (
      patch.displayName !== undefined
        || patch.accountType !== undefined
        || patch.originalId !== undefined
        ? {
          displayName: patch.displayName,
          accountType: patch.accountType,
          originalId: patch.originalId,
        }
        : undefined
    );
    const credentials = patch.credentials ?? (
      patch.appId !== undefined || patch.appSecret !== undefined
        ? { appId: patch.appId, appSecret: patch.appSecret }
        : undefined
    );
    let config = patch.config;
    if (config === undefined) {
      const hasConfigField = CONFIG_FIELDS.some((field) => patch[field] !== undefined)
        || patch.notifyUrl !== undefined
        || patch.notifyToken !== undefined
        || patch.notifyEncodingAesKey !== undefined
        || patch.notifyEncryptMode !== undefined;
      if (hasConfigField) {
        config = {};
        if (patch.logoUrl !== undefined) config.logoUrl = patch.logoUrl;
        if (patch.customMenu !== undefined) config.customMenu = patch.customMenu;
        if (patch.jsSecureDomains !== undefined) config.jsSecureDomains = [...patch.jsSecureDomains];
        if (patch.webAuthDomains !== undefined) config.webAuthDomains = [...patch.webAuthDomains];
        if (patch.businessDomains !== undefined) config.businessDomains = [...patch.businessDomains];
        if (
          patch.notifyUrl !== undefined
          || patch.notifyToken !== undefined
          || patch.notifyEncodingAesKey !== undefined
          || patch.notifyEncryptMode !== undefined
        ) {
          config.notify = {
            ...(patch.notifyUrl === undefined ? {} : { url: patch.notifyUrl }),
            ...(patch.notifyToken === undefined ? {} : { token: patch.notifyToken }),
            ...(patch.notifyEncodingAesKey === undefined
              ? {}
              : { encodingAesKey: patch.notifyEncodingAesKey }),
            ...(patch.notifyEncryptMode === undefined
              ? {}
              : { encryptMode: patch.notifyEncryptMode }),
          };
        }
      }
    }
    return {
      ...(profile === undefined ? {} : { profile }),
      ...(credentials === undefined ? {} : { credentials }),
      ...(config === undefined ? {} : { config }),
      ...(patch.enabled === undefined ? {} : { enabled: patch.enabled }),
      ...(patch.qrDefaultEnabled === undefined ? {} : { qrDefaultEnabled: patch.qrDefaultEnabled }),
      changed: profile !== undefined
        || credentials !== undefined
        || config !== undefined
        || patch.enabled !== undefined
        || patch.qrDefaultEnabled !== undefined,
    };
  };

  /**
   * Builds an account from the patch when the host's write returns no record.
   * @param id - account id.
   * @param patch - the applied patch.
   * @returns the account the caller sees.
   */
  const synthesize = (id: string, patch: OfficialAccountsPatch): OfficialAccount => ({
    id,
    appId: patch.credentials?.appId ?? patch.appId ?? "",
    displayName: patch.profile?.displayName ?? patch.displayName ?? "",
    ...((patch.profile?.accountType ?? patch.accountType) === undefined
      ? {}
      : { accountType: patch.profile?.accountType ?? patch.accountType }),
    ...((patch.profile?.originalId ?? patch.originalId) === undefined
      ? {}
      : { originalId: patch.profile?.originalId ?? patch.originalId }),
    ...((patch.config?.logoUrl ?? patch.logoUrl) === undefined
      ? {}
      : { logoUrl: patch.config?.logoUrl ?? patch.logoUrl }),
    hasAppSecret: (patch.credentials?.appSecret ?? patch.appSecret ?? "").trim() !== "",
    hasNotifyToken: (patch.notifyToken ?? "").trim() !== "",
    hasEncodingAesKey: (patch.notifyEncodingAesKey ?? "").trim() !== "",
    notifyEncryptMode: patch.notifyEncryptMode ?? "plaintext",
    jsSecureDomains: [...(patch.jsSecureDomains ?? patch.config?.jsSecureDomains ?? [])],
    webAuthDomains: [...(patch.webAuthDomains ?? patch.config?.webAuthDomains ?? [])],
    businessDomains: [...(patch.businessDomains ?? patch.config?.businessDomains ?? [])],
    customMenu: patch.customMenu
      ?? patch.config?.customMenu
      ?? { buttons: [] },
    enabled: patch.enabled ?? true,
    status: "active",
    ...(patch.config === undefined ? {} : { providerConfig: patch.config }),
  });

  return {
    async list(query?: OfficialAccountsQuery): Promise<OfficialAccountsPage> {
      return operations.list(query ?? {});
    },
    async create(draft: OfficialAccountDraft): Promise<OfficialAccount> {
      const created = await operations.create(draft);
      return accountOf(created) ?? {
        id: "",
        appId: draft.appId ?? "",
        displayName: draft.displayName,
        ...(draft.accountType === undefined ? {} : { accountType: draft.accountType }),
        ...(draft.originalId === undefined ? {} : { originalId: draft.originalId }),
        hasAppSecret: (draft.appSecret ?? "").trim() !== "",
        hasNotifyToken: (draft.notifyToken ?? "").trim() !== "",
        hasEncodingAesKey: (draft.notifyEncodingAesKey ?? "").trim() !== "",
        notifyEncryptMode: draft.notifyEncryptMode ?? "plaintext",
        jsSecureDomains: [...(draft.jsSecureDomains ?? [])],
        webAuthDomains: [...(draft.webAuthDomains ?? [])],
        businessDomains: [...(draft.businessDomains ?? [])],
        customMenu: draft.customMenu ?? { buttons: [] },
        enabled: draft.enabled ?? true,
        status: "active",
        ...(draft.resourceAccountKind === undefined
          ? {}
          : { resourceAccountKind: draft.resourceAccountKind }),
      };
    },
    async update(id: string, patch: OfficialAccountsPatch): Promise<OfficialAccount> {
      const groups = groupsOf(patch);
      if (!groups.changed) {
        return synthesize(id, patch);
      }
      let last: unknown;
      if (groups.profile !== undefined && operations.updateProfile !== undefined) {
        last = await operations.updateProfile(id, groups.profile) ?? last;
      }
      if (groups.credentials !== undefined && operations.updateCredentials !== undefined) {
        last = await operations.updateCredentials(id, groups.credentials) ?? last;
      }
      if (groups.config !== undefined) {
        last = await operations.updateConfig(id, groups.config) ?? last;
      }
      if (groups.enabled !== undefined) {
        await operations.setEnabled(id, groups.enabled);
      }
      if (groups.qrDefaultEnabled !== undefined && operations.setQrLogin !== undefined) {
        await operations.setQrLogin(id, groups.qrDefaultEnabled);
      }
      return accountOf(last) ?? synthesize(id, patch);
    },
    async delete(id: string): Promise<void> {
      await operations.remove(id);
    },
    async updateConfig(
      id: string,
      config: OfficialAccountsProviderConfig,
    ): Promise<OfficialAccount> {
      return accountOf(await operations.updateConfig(id, config))
        ?? synthesize(id, { config });
    },
    async loadCustomMenu(id: string): Promise<OfficialAccountsCustomMenuContext> {
      if (operations.loadCustomMenu === undefined) {
        throw new Error("iam-pc-official-accounts: the operator host cannot load a custom menu");
      }
      return operations.loadCustomMenu(id);
    },
    async saveCustomMenu(
      id: string,
      menu: OfficialAccountsMenu,
    ): Promise<OfficialAccountsCustomMenuContext> {
      if (operations.saveCustomMenu === undefined) {
        return { accountId: id, menu };
      }
      return operations.saveCustomMenu(id, menu);
    },
    ...(operations.publishCustomMenu === undefined
      ? {}
      : {
        async publishCustomMenu(
          id: string,
          menu: OfficialAccountsMenu,
        ): Promise<OfficialAccountsCustomMenuPublishResult> {
          return operations.publishCustomMenu!(id, menu);
        },
      }),
    async setEnabled(id: string, enabled: boolean): Promise<void> {
      await operations.setEnabled(id, enabled);
    },
    ...(operations.setQrLogin === undefined
      ? {}
      : {
        async setQrLogin(id: string, enabled: boolean): Promise<void> {
          await operations.setQrLogin!(id, enabled);
        },
      }),
    ...(operations.createFollowQrCode === undefined
      ? {}
      : {
        async createFollowQrCode(id: string): Promise<OfficialAccountsFollowQrCode> {
          return operations.createFollowQrCode!(id);
        },
      }),
    ...(operations.runVerification === undefined
      ? {}
      : {
        async runVerification(id: string, kind: OfficialAccountsVerificationKind): Promise<void> {
          await operations.runVerification!(id, kind);
        },
      }),
  };
}
