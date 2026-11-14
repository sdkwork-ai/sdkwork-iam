/**
 * Public contract of the user-facing IAM OAuth surface.
 *
 * An "official account" here is the signed-in account's own WeChat 公众号
 * channel configuration: AppID, display name, account type, original id, logo,
 * message-push endpoint and encryption mode, the three protected-domain sets
 * the WeChat console manages, and the custom-menu draft that publishing will
 * later push. It is the caller's own data — scoped by the IAM app API to the
 * session's tenant and user — and never a tenant login resource.
 */

/** WeChat message-push encryption mode (`明文` / `兼容` / `安全`). */
export type SdkworkIamOfficialAccountEncryptMode = "plaintext" | "compatible" | "safe"

/** One custom-menu button (WeChat `button` / `sub_button` shape). */
export interface SdkworkIamOfficialAccountMenuButton {
  /** Button label as displayed in the WeChat official-account menu. */
  name: string
  /** `view` opens `url`; `click` reports `key`; omitted for a parent button. */
  type?: "view" | "click"
  /** Target URL for `type: "view"`. */
  url?: string
  /** Event key for `type: "click"`. */
  key?: string
  /** Second-level buttons; a parent button with sub-buttons has no type. */
  subButtons?: readonly SdkworkIamOfficialAccountMenuButton[]
}

/** The editable custom-menu draft. */
export interface SdkworkIamOfficialAccountMenu {
  buttons: readonly SdkworkIamOfficialAccountMenuButton[]
}

/** One official account as the panel renders it. Secrets are never present. */
export interface SdkworkIamOfficialAccount {
  /** Stable account id used by retrieve/update/delete. */
  id: string
  /** WeChat 公众号 AppID. */
  appId: string
  /** Account display name. */
  displayName: string
  /** WeChat account type (`service` / `subscription`), when recorded. */
  accountType?: string
  /** WeChat account original id, when recorded. */
  originalId?: string
  /** Logo URL (a Drive `drive://` reference or a legacy delivery URL). */
  logoUrl?: string
  /** Whether an AppSecret is stored (the value itself is write-only). */
  hasAppSecret: boolean
  /** Message-push endpoint, when configured. */
  notifyUrl?: string
  /** Whether a message-push verification token is stored. */
  hasNotifyToken: boolean
  /** Whether a message-push EncodingAESKey is stored. */
  hasEncodingAesKey: boolean
  /** Message-push encryption mode. */
  notifyEncryptMode: SdkworkIamOfficialAccountEncryptMode
  /** WeChat JS interface security domains (parent domains cover subdomains). */
  jsSecureDomains: readonly string[]
  /** WeChat web-authorization callback domains. */
  webAuthDomains: readonly string[]
  /** WeChat business domains. */
  businessDomains: readonly string[]
  /** Current custom-menu draft. */
  customMenu: SdkworkIamOfficialAccountMenu
  /** Whether the account is enabled for publishing. */
  enabled: boolean
  /** Lifecycle status reported by the API (`active`). */
  status: string
  /** Creation timestamp, when reported. */
  createdAt?: string
  /** Last update timestamp, when reported. */
  updatedAt?: string
}

/** Write payload of create / update. Empty secrets keep the stored value. */
export interface SdkworkIamOfficialAccountDraft {
  /** WeChat 公众号 AppID; required on create, immutable on update. */
  appId?: string
  /** Account display name. */
  displayName: string
  /** WeChat account type. */
  accountType?: string
  /** WeChat original id. */
  originalId?: string
  /** Logo URL (a Drive `drive://` reference or a legacy delivery URL). */
  logoUrl?: string
  /** AppSecret, write-only. */
  appSecret?: string
  /** Message-push endpoint. */
  notifyUrl?: string
  /** Message-push verification token, write-only. */
  notifyToken?: string
  /** Message-push EncodingAESKey, write-only. */
  notifyEncodingAesKey?: string
  /** Message-push encryption mode. */
  notifyEncryptMode?: SdkworkIamOfficialAccountEncryptMode
  /** WeChat JS interface security domains. */
  jsSecureDomains?: readonly string[]
  /** WeChat web-authorization callback domains. */
  webAuthDomains?: readonly string[]
  /** WeChat business domains. */
  businessDomains?: readonly string[]
  /** Custom-menu draft. */
  customMenu?: SdkworkIamOfficialAccountMenu
  /** Whether the account is enabled. */
  enabled?: boolean
}

/** List query the panel issues. */
export interface SdkworkIamOfficialAccountsQuery {
  /** One-based page number. */
  page?: number
  /** Page size. */
  pageSize?: number
  /** Case-insensitive search over display name and AppID. */
  q?: string
}

/** One page of the caller's official accounts. */
export interface SdkworkIamOfficialAccountsListPage {
  /** Accounts on this page. */
  items: readonly SdkworkIamOfficialAccount[]
  /** Total accounts matching the query. */
  totalItems: number
  /** One-based page number. */
  page: number
  /** Page size. */
  pageSize: number
}

/**
 * Transport port the panel consumes.
 *
 * The IAM app SDK (`@sdkwork/iam-app-sdk` → `iam.oauth.officialAccounts`) and
 * any product host implement this narrow face, so the panel never creates an
 * HTTP client or reads auth headers itself.
 */
export interface SdkworkIamOfficialAccountsClient {
  /** @param query - page, page size, and optional search text. */
  list(query?: SdkworkIamOfficialAccountsQuery): Promise<SdkworkIamOfficialAccountsListPage>
  /** @param draft - the new account; AppID is required. */
  create(draft: SdkworkIamOfficialAccountDraft): Promise<SdkworkIamOfficialAccount>
  /** @param officialAccountId - account id. @param patch - fields to change. */
  update(
    officialAccountId: string,
    patch: SdkworkIamOfficialAccountDraft,
  ): Promise<SdkworkIamOfficialAccount>
  /** @param officialAccountId - account id. */
  delete(officialAccountId: string): Promise<void>
}

/** Panel/controller state. */
export interface SdkworkIamOfficialAccountsState {
  /** Load phase. */
  status: "idle" | "loading" | "ready" | "error"
  /** Loaded accounts. */
  accounts: readonly SdkworkIamOfficialAccount[]
  /** Total accounts matching the query. */
  totalItems: number
  /** One-based page number. */
  page: number
  /** Page size. */
  pageSize: number
  /** Active search text. */
  query: string
  /** Latest failure message, cleared by the next successful load. */
  error?: string
}
