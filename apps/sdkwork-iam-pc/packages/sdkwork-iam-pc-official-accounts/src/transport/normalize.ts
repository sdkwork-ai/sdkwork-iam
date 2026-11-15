/**
 * Record normalization shared by every transport adapter.
 *
 * The IAM app API, the IAM backend API, and product hosts return overlapping
 * record shapes for the same unified aggregate (camelCase over the backend DTO,
 * snake_case over a raw projection, `officialAccountId` on the legacy app
 * surface, `id` on the unified resource-account surface). These helpers turn
 * any of them into the package model exactly once, so no adapter grows its own
 * copy of the mapping.
 */
import type {
  OfficialAccountsAccessMode,
  OfficialAccountsEncryptMode,
  OfficialAccountsMenu,
  OfficialAccountsMenuVersion,
  OfficialAccountsMenuButton,
  OfficialAccountsProviderConfig,
  OfficialAccountsResourceAccountKind,
  OfficialAccount,
  OfficialAccountDraft,
} from "../types";

/** Reads one non-blank string member. */
export function readRecordString(
  record: Record<string, unknown>,
  ...keys: readonly string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }
  return undefined;
}

/** Reads one boolean flag. */
export function readRecordBoolean(record: Record<string, unknown>, ...keys: readonly string[]): boolean {
  return keys.some((key) => record[key] === true);
}

/** Reads a stored domain array, ignoring non-string entries and blank values. */
export function readRecordDomains(
  record: Record<string, unknown>,
  ...keys: readonly string[]
): string[] {
  for (const key of keys) {
    const value = record[key];
    if (!Array.isArray(value)) continue;
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry !== "");
  }
  return [];
}

/** Reads the message-push encryption mode, defaulting to plaintext. */
function readEncryptMode(
  record: Record<string, unknown>,
  ...keys: readonly string[]
): OfficialAccountsEncryptMode {
  const value = readRecordString(record, ...keys);
  return value === "compatible" || value === "safe" ? value : "plaintext";
}

/**
 * Parses one menu button from a stored menu document.
 *
 * Stored drafts carry the editor's stable id under `key` and the WeChat
 * EventKey under `message`. Drafts written by the earlier single-purpose
 * editor put the EventKey in `key`; those migrate to `message` plus a generated
 * stable id. Imported provider actions keep their original payload so the
 * editor can show them and refuse to publish losslessly.
 * @param value - the stored button document.
 * @param path - the button's position in the tree, used for a stable fallback id.
 * @returns the normalized button, or undefined when it has no name.
 */
function readMenuButton(value: unknown, path: string): OfficialAccountsMenuButton | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  const name = readRecordString(record, "name");
  if (name === undefined) return undefined;
  const type = readRecordString(record, "type");
  const knownType = type === "view" || type === "click" || type === "miniprogram";
  const message = readRecordString(record, "message");
  const storedKey = readRecordString(record, "key");
  // The legacy editor wrote a click's EventKey into `key`; a draft with an
  // explicit `message` already separates the stable id from the EventKey.
  const legacyEventKey = message === undefined && type === "click" ? storedKey : undefined;
  const stableKey = message === undefined && legacyEventKey !== undefined ? undefined : storedKey;
  const eventKey = message ?? legacyEventKey;
  const url = readRecordString(record, "url");
  const appId = readRecordString(record, "appId");
  const pagePath = readRecordString(record, "pagePath");
  const providerAction = typeof record.providerAction === "object" && record.providerAction !== null
    ? record.providerAction as Record<string, unknown>
    : undefined;
  const subButtons = Array.isArray(record.subButtons)
    ? record.subButtons
      .map((entry, index) => readMenuButton(entry, `${path}.${String(index)}`))
      .filter((button): button is OfficialAccountsMenuButton => button !== undefined)
    : undefined;
  return {
    key: stableKey ?? `menu-${path}`,
    name,
    ...(knownType ? { type } : {}),
    ...(type !== undefined && !knownType ? { unsupportedType: type } : {}),
    ...(url === undefined ? {} : { url }),
    ...(appId === undefined ? {} : { appId }),
    ...(pagePath === undefined ? {} : { pagePath }),
    ...(eventKey === undefined ? {} : { message: eventKey }),
    ...(providerAction === undefined ? {} : { providerAction }),
    ...(subButtons === undefined || subButtons.length === 0 ? {} : { subButtons }),
  };
}

/** Parses a stored custom-menu document. */
export function readOfficialAccountMenu(value: unknown): OfficialAccountsMenu {
  if (typeof value !== "object" || value === null) return { buttons: [] };
  const record = value as Record<string, unknown>;
  const raw = Array.isArray(record.buttons) ? record.buttons : [];
  const updatedAt = readRecordString(record, "updatedAt") ?? readRecordString(record, "updated_at");
  const publishedAt = readRecordString(record, "publishedAt") ?? readRecordString(record, "published_at");
  const source = record.source === "database" || record.source === "wechat" ? record.source : undefined;
  const version = typeof record.version === "number" ? record.version : undefined;
  const history = Array.isArray(record.history)
    ? record.history
      .map((entry, index) => readMenuVersion(entry, String(index)))
      .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    : undefined;
  return {
    buttons: raw
      .map((entry, index) => readMenuButton(entry, String(index)))
      .filter((button): button is OfficialAccountsMenuButton => button !== undefined),
    ...(updatedAt === undefined ? {} : { updatedAt }),
    ...(publishedAt === undefined ? {} : { publishedAt }),
    ...(source === undefined ? {} : { source }),
    ...(version === undefined ? {} : { version }),
    ...(history === undefined ? {} : { history }),
  };
}

/** Parses one retained menu revision. */
function readMenuVersion(value: unknown, path: string): OfficialAccountsMenuVersion | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.version !== "number" || !Array.isArray(record.buttons)) return undefined;
  const savedAt = readRecordString(record, "savedAt");
  const publishedAt = readRecordString(record, "publishedAt");
  const source = record.source === "database" || record.source === "wechat" ? record.source : undefined;
  return {
    version: record.version,
    buttons: record.buttons
      .map((entry, index) => readMenuButton(entry, `${path}.${String(index)}`))
      .filter((button): button is OfficialAccountsMenuButton => button !== undefined),
    ...(savedAt === undefined ? {} : { savedAt }),
    ...(publishedAt === undefined ? {} : { publishedAt }),
    ...(source === undefined ? {} : { source }),
  };
}

/** Reads the `provider_config_json` document, whether it travels parsed or serialized. */
export function readProviderConfig(record: Record<string, unknown>): OfficialAccountsProviderConfig | undefined {
  const raw = record.providerConfigJson ?? record.provider_config_json ?? record.providerConfig;
  if (typeof raw === "string") {
    if (raw.trim() === "") return undefined;
    try {
      const parsed: unknown = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null
        ? parsed as OfficialAccountsProviderConfig
        : undefined;
    } catch {
      return undefined;
    }
  }
  return typeof raw === "object" && raw !== null ? raw as OfficialAccountsProviderConfig : undefined;
}

/** Reads the administration mode, normalizing the retired `operator_managed` value. */
function readAccessMode(record: Record<string, unknown>): OfficialAccountsAccessMode | undefined {
  const value = readRecordString(record, "accessMode", "access_mode");
  if (value === "self_managed_account") return "self_managed_account";
  // `D1`: the retired `operator_managed` spelling reads as the authorized mode.
  if (value === "operator_authorized_account" || value === "operator_managed") {
    return "operator_authorized_account";
  }
  return undefined;
}

/** Reads the channel kind, defaulting to an official account. */
function readKind(record: Record<string, unknown>): OfficialAccountsResourceAccountKind | undefined {
  const value = readRecordString(record, "resourceAccountKind", "resource_account_kind");
  return value === "mini_program" || value === "official_account" ? value : undefined;
}

/**
 * Normalize one API record into the package model.
 *
 * @param value - one account record from the API.
 * @returns the account the panel renders.
 * @throws {Error} when the record carries no account id.
 */
export function toOfficialAccount(value: Record<string, unknown>): OfficialAccount {
  const id = readRecordString(value, "officialAccountId", "id", "resourceAccountId", "resource_account_id");
  if (id === undefined) {
    throw new Error("iam-pc-official-accounts: official account record is missing its id");
  }
  const appId = readRecordString(
    value,
    "appId",
    "providerClientId",
    "provider_client_id",
    "providerAccountId",
    "provider_account_id",
  );
  if (appId === undefined) {
    throw new Error("iam-pc-official-accounts: official account record is missing its AppID");
  }
  const providerConfig = readProviderConfig(value);
  const configDomains = (key: string): readonly string[] | undefined => {
    const raw = providerConfig?.[key];
    return Array.isArray(raw) ? raw.filter((entry): entry is string => typeof entry === "string") : undefined;
  };
  const displayName = readRecordString(value, "displayName", "display_name") ?? appId;
  const accessMode = readAccessMode(value);
  const maintainerUserId = readRecordString(value, "maintainerUserId", "maintainer_user_id");
  const qrDefaultRaw = value.qrDefaultEnabled ?? value.qr_default_enabled;
  const kind = readKind(value);
  const authorizationStatus = readRecordString(value, "authorizationStatus", "authorization_status");
  return {
    id,
    appId,
    displayName,
    ...(readRecordString(value, "accountType", "providerAccountType", "provider_account_type") === undefined
      ? {}
      : { accountType: readRecordString(value, "accountType", "providerAccountType", "provider_account_type") }),
    ...(readRecordString(value, "originalId", "providerAccountOriginalId", "provider_account_original_id") === undefined
      ? {}
      : {
        originalId: readRecordString(
          value,
          "originalId",
          "providerAccountOriginalId",
          "provider_account_original_id",
        ),
      }),
    ...((readRecordString(value, "logoUrl") ?? providerConfig?.logoUrl) === undefined
      ? {}
      : { logoUrl: readRecordString(value, "logoUrl") ?? providerConfig?.logoUrl }),
    hasAppSecret: readRecordBoolean(value, "hasAppSecret", "has_app_secret"),
    ...(readRecordString(value, "notifyUrl") === undefined ? {} : { notifyUrl: readRecordString(value, "notifyUrl") }),
    hasNotifyToken: readRecordBoolean(value, "hasNotifyToken", "has_notify_token"),
    hasEncodingAesKey: readRecordBoolean(value, "hasEncodingAesKey", "has_encoding_aes_key"),
    notifyEncryptMode: readEncryptMode(value, "notifyEncryptMode", "notify_encrypt_mode"),
    jsSecureDomains: readRecordDomains(value, "jsSecureDomains", "js_secure_domains").length > 0
      ? readRecordDomains(value, "jsSecureDomains", "js_secure_domains")
      : configDomains("jsSecureDomains") ?? [],
    webAuthDomains: readRecordDomains(value, "webAuthDomains", "web_auth_domains").length > 0
      ? readRecordDomains(value, "webAuthDomains", "web_auth_domains")
      : configDomains("webAuthDomains") ?? [],
    businessDomains: readRecordDomains(value, "businessDomains", "business_domains").length > 0
      ? readRecordDomains(value, "businessDomains", "business_domains")
      : configDomains("businessDomains") ?? [],
    customMenu: readOfficialAccountMenu(
      value.customMenu
        ?? value.custom_menu
        ?? providerConfig?.customMenu,
    ),
    enabled: value.enabled !== false,
    status: readRecordString(value, "status") ?? "active",
    ...(accessMode === undefined ? {} : { accessMode }),
    ...(maintainerUserId === undefined ? {} : { maintainerUserId }),
    ...(readRecordString(
      value,
      "maintainerDisplayName",
      "maintainer_display_name",
    ) === undefined
      ? {}
      : {
        maintainerDisplayName: readRecordString(
          value,
          "maintainerDisplayName",
          "maintainer_display_name",
        ),
      }),
    ...(readRecordString(value, "maintainerUsername", "maintainer_username") === undefined
      ? {}
      : { maintainerUsername: readRecordString(value, "maintainerUsername", "maintainer_username") }),
    ...(readRecordString(value, "organizationId", "organization_id") === undefined
      ? {}
      : { organizationId: readRecordString(value, "organizationId", "organization_id") }),
    ...(readRecordString(value, "organizationName", "organization_name") === undefined
      ? {}
      : { organizationName: readRecordString(value, "organizationName", "organization_name") }),
    ...(typeof qrDefaultRaw === "boolean"
      ? { qrDefaultEnabled: qrDefaultRaw }
      : qrDefaultRaw === "1" || qrDefaultRaw === 1
        ? { qrDefaultEnabled: true }
        : qrDefaultRaw === "0" || qrDefaultRaw === 0
          ? { qrDefaultEnabled: false }
          : {}),
    ...(kind === undefined ? {} : { resourceAccountKind: kind }),
    ...(authorizationStatus === undefined ? {} : { authorizationStatus }),
    ...(providerConfig === undefined ? {} : { providerConfig }),
    ...(readRecordString(value, "createdAt", "created_at") === undefined
      ? {}
      : { createdAt: readRecordString(value, "createdAt", "created_at") }),
    ...(readRecordString(value, "updatedAt", "updated_at") === undefined
      ? {}
      : { updatedAt: readRecordString(value, "updatedAt", "updated_at") }),
  };
}

/**
 * Builds the generic app-API update body: empty secrets are omitted so the
 * stored value is kept.
 *
 * The WeChat AppID is not an update field on the self-service wire: the row is
 * addressed by its account id and the app API keeps the AppID immutable after
 * create.
 *
 * @param draft - the fields to change.
 * @returns the request body for `update`.
 */
export function toOfficialAccountCommand(draft: OfficialAccountsDraftInput): Record<string, unknown> {
  const command: Record<string, unknown> = {
    displayName: (draft.displayName ?? "").trim(),
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

/** Draft shape the command builders read (create and update accept the same members). */
export type OfficialAccountsDraftInput = Partial<OfficialAccountDraft>

/**
 * Builds the create body: the update body plus the WeChat AppID.
 *
 * The AppID travels as `wechatAppId`. The app API reserves a top-level `appId`
 * key as an ambient tenant/app/subject context selector and rejects any request
 * body that carries it, while this value is the channel's own WeChat
 * identifier; the provider-qualified name is what the create command binds.
 *
 * @param draft - the new account.
 * @returns the create request body.
 */
export function toOfficialAccountCreateCommand(draft: OfficialAccountsDraftInput): Record<string, unknown> {
  const command = toOfficialAccountCommand(draft);
  if (draft.appId !== undefined && draft.appId.trim() !== "") {
    command.wechatAppId = draft.appId.trim();
  }
  return command;
}
