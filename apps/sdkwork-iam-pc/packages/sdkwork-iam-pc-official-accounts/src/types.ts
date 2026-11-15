/**
 * Public contract of the shared official-account surface.
 *
 * One "official account" is a `wechat` row of the unified IAM OAuth aggregate
 * (`iam_oauth_resource_account`, `resource_account_kind = 'official_account'`).
 * It is administered either by an operator (`operator_authorized_account`,
 * backend-admin / console hosts) or by the account's own maintainer
 * (`self_managed_account`, app hosts); the administration mode travels in the
 * existing `access_mode` column and is never a second state machine.
 *
 * Everything in this module is transport-agnostic: a host injects an
 * {@link OfficialAccountsTransport} built from its own SDK slice through
 * `createOperatorTransport` / `createSelfServiceTransport` (or a host-specific
 * adapter), so the package never performs raw HTTP, never assembles
 * authentication headers, and never imports a host SDK.
 */

/** WeChat message-push encryption mode (`明文` / `兼容` / `安全`). */
export type OfficialAccountsEncryptMode = "plaintext" | "compatible" | "safe"

/** How the account is administered, mirroring `iam_oauth_resource_account.access_mode`. */
export type OfficialAccountsAccessMode =
  | "self_managed_account"
  | "operator_authorized_account"

/** Channel kind of the unified resource account. */
export type OfficialAccountsResourceAccountKind = "official_account" | "mini_program"

/** What a verification run checks. */
export type OfficialAccountsVerificationKind = "domain" | "webhook" | "authorization"

/** One custom-menu button (WeChat `button` / `sub_button` shape). */
export interface OfficialAccountsMenuButton {
  /** Button label as displayed in the WeChat official-account menu. */
  name: string
  /** `view` opens `url`; `click` reports `key`; omitted for a parent button. */
  type?: "view" | "click"
  /** Target URL for `type: "view"`. */
  url?: string
  /** Event key for `type: "click"`. */
  key?: string
  /** Second-level buttons; a parent button with sub-buttons has no type. */
  subButtons?: readonly OfficialAccountsMenuButton[]
}

/** The editable custom-menu draft. */
export interface OfficialAccountsMenu {
  buttons: readonly OfficialAccountsMenuButton[]
}

/**
 * Strongly typed view of the `provider_config_json` subdocument
 * (`D5`): domain sets, menu draft, logo, notification and the verification
 * file. Hosts that carry extra provider keys may keep them; this package only
 * reads the documented members.
 */
export interface OfficialAccountsProviderConfig {
  /** Logo reference (`drive://…`) or a legacy delivery URL. */
  logoUrl?: string
  /** OAuth callback URL the WeChat console expects for this account. */
  redirectUri?: string
  /** WeChat JS interface security domains (parent domains cover subdomains). */
  jsSecureDomains?: readonly string[]
  /** WeChat web-authorization callback domains. */
  webAuthDomains?: readonly string[]
  /** WeChat business domains. */
  businessDomains?: readonly string[]
  /** Custom-menu draft. */
  customMenu?: OfficialAccountsMenu
  /** The account-level WeChat `MP_verify_*.txt` document. */
  verifyFile?: { fileName?: string; content?: string }
  /** Message-push server configuration. */
  notify?: {
    url?: string
    token?: string
    encodingAesKey?: string
    encryptMode?: string
    dataFormat?: string
  }
  /** Provider-owned keys this package does not interpret. */
  [key: string]: unknown
}

/** One official account as the panel renders it. Secrets are never present. */
export interface OfficialAccount {
  /** Stable account id used by retrieve/update/delete (`D3`: never rewritten). */
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
  notifyEncryptMode: OfficialAccountsEncryptMode
  /** WeChat JS interface security domains (parent domains cover subdomains). */
  jsSecureDomains: readonly string[]
  /** WeChat web-authorization callback domains. */
  webAuthDomains: readonly string[]
  /** WeChat business domains. */
  businessDomains: readonly string[]
  /** Current custom-menu draft. */
  customMenu: OfficialAccountsMenu
  /** Whether the account is enabled for publishing. */
  enabled: boolean
  /** Lifecycle status reported by the API (`active`). */
  status: string
  /** Creation timestamp, when reported. */
  createdAt?: string
  /** Last update timestamp, when reported. */
  updatedAt?: string
  /** Administration mode (`D1`); operator lists annotate `self_managed_account`. */
  accessMode?: OfficialAccountsAccessMode
  /** Maintainer of a self-managed account (`D2`), when reported. */
  maintainerUserId?: string
  /** Whether the account is the scan-login default (operator accounts only, `D4`). */
  qrDefaultEnabled?: boolean
  /** Channel kind of the unified resource account. */
  resourceAccountKind?: OfficialAccountsResourceAccountKind
  /** Operator-side authorization state (`authorized` / `pending`). */
  authorizationStatus?: string
  /** Operator-side provider configuration subdocument (`D5`), when reported. */
  providerConfig?: OfficialAccountsProviderConfig
}

/** Write payload of create. Empty secrets keep the stored value. */
export interface OfficialAccountDraft {
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
  notifyEncryptMode?: OfficialAccountsEncryptMode
  /** WeChat JS interface security domains. */
  jsSecureDomains?: readonly string[]
  /** WeChat web-authorization callback domains. */
  webAuthDomains?: readonly string[]
  /** WeChat business domains. */
  businessDomains?: readonly string[]
  /** Custom-menu draft. */
  customMenu?: OfficialAccountsMenu
  /** Whether the account is enabled. */
  enabled?: boolean
  /** Whether the account is the scan-login default (operator hosts only). */
  qrDefaultEnabled?: boolean
  /** Operator create: the provider configuration document to persist. */
  config?: OfficialAccountsProviderConfig
  /** Operator create: OAuth callback URL the login integration should use. */
  redirectUri?: string
  /** Operator create: channel kind, defaulting to `official_account`. */
  resourceAccountKind?: OfficialAccountsResourceAccountKind
  /** Operator create: reuse this integration instead of matching by AppID. */
  integrationId?: string
}

/** Profile fields of an operator patch. */
export interface OfficialAccountsProfilePatch {
  displayName?: string
  accountType?: string
  originalId?: string
}

/** Credential fields of an operator patch (empty secret keeps the stored one). */
export interface OfficialAccountsCredentialsPatch {
  appId?: string
  appSecret?: string
}

/**
 * Update payload.
 *
 * Hosts may send the panel-shaped fields directly, or group them for an
 * operator transport that persists each group through its own action:
 * `profile` → display name / type / original id, `credentials` → AppID /
 * AppSecret, `config` → the `provider_config_json` document, `enabled` → the
 * enable switch. A grouped patch is applied in that dependency order so a
 * partial failure never stores half an edit.
 */
export type OfficialAccountsPatch = Partial<OfficialAccountDraft> & {
  profile?: OfficialAccountsProfilePatch
  credentials?: OfficialAccountsCredentialsPatch
  config?: OfficialAccountsProviderConfig
}

/** List query the panel issues. */
export interface OfficialAccountsQuery {
  /** One-based page number. */
  page?: number
  /** Page size. */
  pageSize?: number
  /** Case-insensitive search over display name, AppID, and original id. */
  q?: string
  /** Operator-side account-type filter. */
  accountType?: string
  /** Operator-side authorization filter (`authorized` / `pending`). */
  authorizationStatus?: string
  /** Operator-side enabled filter (`"0"` / `"1"`). */
  enabled?: string
  /** Operator-side channel filter. */
  resourceAccountKind?: OfficialAccountsResourceAccountKind
}

/** One page of official accounts. */
export interface OfficialAccountsPage {
  /** Accounts on this page. */
  items: readonly OfficialAccount[]
  /** Total accounts matching the query. */
  totalItems: number
  /** One-based page number. */
  page: number
  /** Page size. */
  pageSize: number
}

/** The custom-menu draft of one account, as the menu actions return it. */
export interface OfficialAccountsCustomMenuContext {
  /** Account the draft belongs to. */
  accountId: string
  /** The stored draft. */
  menu: OfficialAccountsMenu
}

/** Result of pushing a menu draft to the WeChat console. */
export interface OfficialAccountsCustomMenuPublishResult {
  /** Account the draft was published for. */
  accountId: string
  /** Whether the channel accepted the draft. */
  published: boolean
  /** Publication timestamp, when reported. */
  publishedAt?: string
}

/** One WeChat follow (parameterized) QR code. */
export interface OfficialAccountsFollowQrCode {
  /** Image URL the channel returned. */
  qrCode: string
  /** Content encoded in the QR, when reported. */
  qrContent?: string
  /** Scene value, when reported. */
  scene?: string
  /** Ticket the channel issued, when reported. */
  ticket?: string
  /** Whether the QR never expires. */
  permanent?: boolean
  /** Lifetime in seconds (`0` for permanent QRs). */
  expireSeconds?: number
  /** Channel the QR belongs to. */
  qrMode?: string
}

/**
 * Transport port the controller and panel consume.
 *
 * The IAM backend SDK (`iam.oauth.resourceAccounts.*`), the IAM app SDK
 * (`iam.oauth.officialAccounts.*`), and any product host implement this narrow
 * face, so the package never creates an HTTP client or reads auth headers.
 * Members marked optional are capabilities a host may not expose; the
 * controller refuses the matching action with a typed error instead of
 * pretending it happened.
 */
export interface OfficialAccountsTransport {
  /** @param query - page, page size, search text, and operator filters. */
  list(query?: OfficialAccountsQuery): Promise<OfficialAccountsPage>
  /** @param draft - the new account; AppID is required. */
  create(draft: OfficialAccountDraft): Promise<OfficialAccount>
  /** @param id - account id. @param patch - fields (or field groups) to change. */
  update(id: string, patch: OfficialAccountsPatch): Promise<OfficialAccount>
  /** @param id - account id. */
  delete(id: string): Promise<void>
  /** @param id - account id. @param config - the provider configuration document. */
  updateConfig(id: string, config: OfficialAccountsProviderConfig): Promise<OfficialAccount>
  /** @param id - account id. */
  loadCustomMenu(id: string): Promise<OfficialAccountsCustomMenuContext>
  /** @param id - account id. @param draft - the complete menu draft. */
  saveCustomMenu(
    id: string,
    draft: OfficialAccountsMenu,
  ): Promise<OfficialAccountsCustomMenuContext>
  /** @param id - account id. @param draft - the draft to push to the channel. */
  publishCustomMenu?(
    id: string,
    draft: OfficialAccountsMenu,
  ): Promise<OfficialAccountsCustomMenuPublishResult>
  /** @param id - account id. @param enabled - target value. */
  setEnabled(id: string, enabled: boolean): Promise<void>
  /** @param id - account id. @param enabled - whether it is the scan-login default. */
  setQrLogin?(id: string, enabled: boolean): Promise<void>
  /** @param id - account id. */
  createFollowQrCode?(id: string): Promise<OfficialAccountsFollowQrCode>
  /** @param id - account id. @param kind - what to verify. */
  runVerification?(id: string, kind: OfficialAccountsVerificationKind): Promise<void>
}

/**
 * What the host allows in the current surface.
 *
 * `mode` selects the administration posture (`D1`); each flag switches one
 * section or action off without forking the implementation.
 */
export interface OfficialAccountsCapabilities {
  /** Administration posture of the host surface. */
  mode: "operator" | "self-service"
  /** Operator may edit AppID / AppSecret; self-service users fill their own. */
  editCredentials: boolean
  /** Only operator surfaces may push a menu draft to the WeChat console. */
  publishMenu: boolean
  /** Operator may manage scan-login (QR) settings of the account. */
  manageQrLogin: boolean
  /** The three WeChat protected-domain sets are editable. */
  manageDomains: boolean
  /** The message-push (notify) server configuration is editable. */
  manageNotify: boolean
  /** The account may be deleted from this surface. */
  deleteAccount: boolean
}

/** Panel/controller state. */
export interface OfficialAccountsState {
  /** Load phase. */
  status: "idle" | "loading" | "ready" | "error"
  /** Loaded accounts. */
  accounts: readonly OfficialAccount[]
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
