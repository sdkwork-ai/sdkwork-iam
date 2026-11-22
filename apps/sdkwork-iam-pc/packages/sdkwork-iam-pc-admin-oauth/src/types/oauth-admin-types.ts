import type { SdkWorkPageInfo } from "@sdkwork/iam-contracts";
import type { SdkworkIamService } from "@sdkwork/iam-service";

export interface SdkworkIamOauthIntegrationDraft {
  appId?: string;
  displayName: string;
  enabled?: boolean;
  integrationCode: string;
  providerCatalogId?: string;
  providerClientId?: string;
  providerClientSecret?: string;
  providerCode: string;
  providerTenantId?: string;
  redirectUri?: string;
  surfaceKind?: string;
}

export interface SdkworkIamOauthProviderCatalogDraft {
  providerCode: string;
  providerDisplayName: string;
  providerName: string;
}

export interface SdkworkIamOauthSurfaceDraft {
  displayName: string;
  integrationId: string;
  oauthClientId: string;
  redirectUri: string;
  surfaceCode: string;
  surfaceKind: string;
}

export interface SdkworkIamOauthClientDraft {
  clientCode: string;
  displayName: string;
  integrationId: string;
  providerClientId: string;
  providerCode: string;
  providerTenantId: string;
}

export interface SdkworkIamOauthClaimMappingDraft {
  externalClaim: string;
  integrationId: string;
  providerCode: string;
  targetField: string;
  targetKind: string;
}

export interface SdkworkIamOauthWebhookConfigDraft {
  callbackUrl: string;
  displayName: string;
  integrationId: string;
  providerCode: string;
  // Optional binding to the resource account this webhook receives events
  // for; the scan-login settings surface shows webhooks bound to an account.
  resourceAccountId?: string;
  webhookCode: string;
  webhookKind: string;
}

export interface SdkworkIamOauthFlowConfigDraft {
  flowKind: string;
  flowPurpose: string;
  integrationId: string;
  oauthClientId: string;
}

export interface SdkworkIamOauthSecretDraft {
  secretKind: string;
  secretOwnerId: string;
  secretOwnerKind: string;
  secretValue: string;
}

export interface SdkworkIamOauthScopeProfileDraft {
  displayName: string;
  integrationId: string;
  providerCode: string;
  purpose: string;
  scopeProfileCode: string;
}

export interface SdkworkIamOauthPolicyDraft {
  displayName: string;
  integrationId: string;
  policyCode: string;
}

export interface SdkworkIamOauthDiagnosticRunDraft {
  integrationId: string;
  providerCode: string;
  runKind: string;
}

export interface SdkworkIamOauthOperatorPlatformDraft {
  displayName: string;
  integrationId: string;
  operatorMode: string;
  platformCode: string;
  providerCode: string;
  providerPlatformId: string;
}

export interface SdkworkIamOauthOperatorPlatformComponentDraft {
  authorizationCallbackUrl: string;
  callbackToken: string;
  componentAppId: string;
  componentAppSecret: string;
  encodingAesKey: string;
}

export function EMPTY_OPERATOR_PLATFORM_COMPONENT_DRAFT(): SdkworkIamOauthOperatorPlatformComponentDraft {
  return {
    authorizationCallbackUrl: "",
    callbackToken: "",
    componentAppId: "",
    componentAppSecret: "",
    encodingAesKey: "",
  };
}

export interface SdkworkIamOauthTenantBindingDraft {
  bindingKind: string;
  integrationId: string;
  providerCode: string;
}

export interface SdkworkIamOauthAccountLinkUpdateDraft {
  accountLinkId: string;
  status: string;
}

export interface SdkworkIamOauthOperationalResourceDraft {
  displayName: string;
  integrationId: string;
  providerCode: string;
  resourceAccountId: string;
  resourceCode: string;
  resourceKind: string;
}

export interface SdkworkIamOauthResourceAccountDraft {
  accessMode: string;
  displayName: string;
  integrationId: string;
  providerAccountId: string;
  providerCode: string;
  resourceAccountCode: string;
  resourceAccountKind: string;
}

export interface SdkworkIamOauthResourceAuthorizationDraft {
  authorizationMode: string;
  integrationId: string;
  providerCode: string;
  resourceAccountId: string;
}

export interface SdkworkIamOauthRelyingPartyDraft {
  allowedScopesText: string;
  /** OAuth client id; defaults to the tenant application app id when blank. */
  clientId: string;
  /** Read-only hint showing the owning tenant application app id. */
  clientIdHint: string;
  /**
   * Operator-supplied client secret. A plaintext value is hashed by the server;
   * an Argon2id PHC string is stored verbatim. Blank preserves the stored hash.
   */
  clientSecretHash: string;
  confidential: boolean;
  enabled: boolean;
  hasExistingSecret: boolean;
  redirectUrisText: string;
  installationId: string;
  tenantId: string;
}

/**
 * Full developer configuration of a mini program or official account,
 * mirroring the WeChat development console: custom (legal) domains, the
 * domain verification file issued by WeChat, and message notification
 * push settings. Stored as one JSON document in the backend
 * `provider_config_json` column.
 */
export interface SdkworkIamOauthAccountDomainsConfig {
  business?: string[];
  downloadFile?: string[];
  request?: string[];
  socket?: string[];
  uploadFile?: string[];
}

export interface SdkworkIamOauthAccountNotifyConfig {
  dataFormat?: "json" | "xml";
  encodingAesKey?: string;
  encryptMode?: "compatible" | "plain" | "safe";
  token?: string;
  url?: string;
}

export interface SdkworkIamOauthAccountVerifyFileConfig {
  content?: string;
  fileName?: string;
}

/**
 * One WeChat domain verification file bound to a single root domain. Each
 * configured domain (web authorization domain or legal domain) carries its
 * own `MP_verify_*.txt` file issued by WeChat.
 */
export interface SdkworkIamOauthAccountDomainVerifyFile {
  content: string;
  domain: string;
  fileName: string;
}

/**
 * Official account (公众号) protected-domain sets, mirroring 公众平台 →
 * 设置与开发 → 公众号设置 → 功能设置:
 *
 * - `jsSecureDomains` — JS 接口安全域名, at most 5; pages that call the JS-SDK.
 * - `webAuthDomains` — 网页授权域名, at most 2; the OAuth 网页授权 callback must
 *   live on one of them, so this set owns the account's callback URL.
 * - `businessDomains` — 业务域名, at most 3; pages that open inside WeChat
 *   without re-layout, optionally configured with a path.
 *
 * Values are stored as normalized hosts (no scheme, port, or trailing slash).
 * `SdkworkIamOauthAccountDomainsConfig.business` is the legacy mini-program
 * shape and is only read as a migration source.
 */
export interface SdkworkIamOauthAccountConfig {
  businessDomains?: string[];
  domains?: SdkworkIamOauthAccountDomainsConfig;
  jsSecureDomains?: string[];
  logoUrl?: string;
  notify?: SdkworkIamOauthAccountNotifyConfig;
  redirectUri?: string;
  verifyFile?: SdkworkIamOauthAccountVerifyFileConfig;
  /**
   * Legacy per-domain verification files (pre single-file storage). WeChat
   * issues one `MP_verify_*.txt` per account and expects that same file at
   * every domain root, so new saves write `verifyFile` instead; existing
   * entries stay readable until the account is re-saved.
   */
  verifyFiles?: SdkworkIamOauthAccountDomainVerifyFile[];
  webAuthDomains?: string[];
  /**
   * Legacy primary domain. Kept as the fallback callback domain for accounts
   * provisioned before the dedicated 网页授权域名 set existed; the drawer now
   * prefers the first `webAuthDomains` entry.
   */
  webDomain?: string;
  /**
   * Official account custom menu draft. Persisted inside the account's
   * `provider_config_json` document so the same menu design is shared by the
   * admin and console surfaces; publishing to WeChat is a backend concern.
   */
  customMenu?: SdkworkIamOauthCustomMenuDraft;
}

/**
 * Quick-setup draft for a mini program or official account. Saving creates
 * (or reuses) the matching WeChat integration and a resource account, so the
 * account is usable immediately. `redirectUri` is optional: when `config`
 * carries a `webAuthDomains` entry (or the legacy `webDomain`), the
 * standardized callback URL is derived as
 * `https://{webAuthDomain}/oauth/callback`.
 */
export interface SdkworkIamOauthAccountSetupDraft {
  accountType?: string;
  appId: string;
  appSecret: string;
  config?: SdkworkIamOauthAccountConfig;
  displayName: string;
  enabled: boolean;
  originalId?: string;
  redirectUri: string;
}

export type SdkworkIamOauthAccountKind = "mini_program" | "official_account";

export interface SdkworkIamOauthAdminResourceSnapshot {
  accountLinks: unknown[];
  callbackEvents: unknown[];
  claimMappings: unknown[];
  clients: unknown[];
  diagnosticRuns: unknown[];
  flowConfigs: unknown[];
  grants: unknown[];
  integrations: unknown[];
  operationalResources: unknown[];
  operatorPlatforms: unknown[];
  policies: unknown[];
  providerCatalog: unknown[];
  resourceAccounts: unknown[];
  resourceAuthorizations: unknown[];
  scopeProfiles: unknown[];
  secrets: unknown[];
  surfaces: unknown[];
  tenantBindings: unknown[];
  webhookConfigs: unknown[];
}

export interface SdkworkIamOauthAdminState extends SdkworkIamOauthAdminResourceSnapshot {
  listPageInfo?: Partial<Record<keyof SdkworkIamOauthAdminResourceSnapshot, SdkWorkPageInfo>>;
  status: "idle" | "loading" | "ready" | "saving" | "error";
  lastError?: string;
  lastDiagnosticRunDetail?: unknown;
  lastResourceDetail?: {
    detail: unknown;
    label: string;
  };
}

/**
 * Structural port the OAuth administration capability actually reaches.
 *
 * Every call in `oauth-admin-controller.ts` goes through `service.iam.oauth.*`
 * or `service.iam.installations.*`; the other IAM resource groups and the
 * sibling `auth`, `oauth` and `system` port groups belong to different
 * capabilities and are never touched here. Declaring the whole
 * `SdkworkIamService` forced every embedding host and every test double to
 * fabricate twenty-plus resource groups the capability cannot observe, so the
 * requirement is narrowed to what it uses. A complete `SdkworkIamService` stays
 * assignable to this port.
 */
export type SdkworkIamOauthAdminServicePort = {
  iam: {
    oauth: SdkworkIamService["iam"]["oauth"];
    installations: Pick<
      SdkworkIamService["iam"]["installations"],
      "list" | "management"
    >;
  };
};

export interface CreateSdkworkIamOauthAdminControllerInput {
  service: SdkworkIamOauthAdminServicePort;
}

export type SdkworkIamOauthAdminTab = "inbound" | "provider" | "extended" | "audit";

export type SdkworkIamOauthAdminView =
  | "providers"
  | "applications"
  | "login-configuration"
  | "governance"
  | "authorizations"
  | "resources"
  | "activity";

export type SdkworkIamOauthScanLoginQrMode = "official_account" | "url";

export interface SdkworkIamOauthScanLoginModeEntry {
  displayName?: string;
  enabled: boolean;
  mode: "official_account" | "provider" | "url" | string;
  providerCode?: string;
  qrMode: string;
  sortOrder: number;
}

export interface SdkworkIamOauthScanLoginWebhookInfo {
  callbackPublicId?: string;
  callbackUrl?: string;
  enabled?: boolean;
  encodingAesKeyStatus?: string;
  verificationTokenStatus?: string;
}

export interface SdkworkIamOauthScanLoginOfficialAccount {
  accountId: string;
  appId?: string;
  displayName: string;
  enabled: boolean;
  integrationId: string;
  qrLoginEnabled: boolean;
  verificationStatus?: string;
  webhook?: SdkworkIamOauthScanLoginWebhookInfo;
}

export interface SdkworkIamOauthScanLoginSettings {
  defaultQrMode: "auto" | SdkworkIamOauthScanLoginQrMode;
  /**
   * Tenant-level master switch for the whole scan-login surface. When
   * `false`, the IAM login/register pages render no QR rail and the app API
   * stops advertising scan-login modes.
   */
  enabled: boolean;
  modes: SdkworkIamOauthScanLoginModeEntry[];
  officialAccounts: SdkworkIamOauthScanLoginOfficialAccount[];
  /**
   * Deployment server egress IPs the operator maintains for the WeChat
   * official-account IP allowlist (multi-entry, deduplicated on write).
   */
  serverIps: string[];
  urlLogin: {
    enabled: boolean;
    h5LoginOrigin: string;
  };
}

export interface SdkworkIamOauthScanLoginSettingsDraft {
  defaultQrMode?: "auto" | SdkworkIamOauthScanLoginQrMode;
  enabled?: boolean;
  modes?: SdkworkIamOauthScanLoginModeEntry[];
  serverIps?: string[];
  urlLogin?: {
    enabled?: boolean;
    h5LoginOrigin?: string;
  };
}

export interface SdkworkIamOauthScanLoginPreview {
  expireSeconds?: number;
  qrCode?: string;
  qrContent: string;
  qrMode: string;
}

/**
 * Tenant-level "follow our official account" QR shown on the hosted desktop
 * login-success page.
 *
 * The operator pins one WeChat official account; the backend generated that
 * account's permanent follow QR once and stores the image URL, so the page
 * renders it without calling WeChat. `enabled` is false when no QR is stored.
 */
export interface SdkworkIamOauthLoginFollowQrSettings {
  accountName: string;
  enabled: boolean;
  qrCode: string;
  resourceAccountId: string;
  scene: string;
  updatedAt: string;
}

/** Draft the admin page sends to the login-success follow QR endpoint. */
export interface SdkworkIamOauthLoginFollowQrDraft {
  enabled: boolean;
  /** Regenerate the account's permanent QR instead of reusing the stored one. */
  refreshQrCode?: boolean;
  resourceAccountId?: string;
}

/**
 * WeChat permanent parameterized follow QR for one official account.
 *
 * `qrCode` is the `mp.weixin.qq.com/cgi-bin/showqrcode?ticket=...` image URL;
 * `scene` (`follow:{accountId}`) travels back through the subscribe event so
 * the platform can attribute followers to the account.
 */
export interface SdkworkIamOauthAccountFollowQrCode {
  expireSeconds: number;
  permanent: boolean;
  qrCode: string;
  qrContent: string;
  qrMode: string;
  scene: string;
  ticket: string;
}

/**
 * Action kinds supported for official account custom menu buttons, aligned
 * with the editable WeChat custom menu API button types: `click` (push an
 * EventKey to the configured server callback), `view` (jump to a web URL)
 * and `miniprogram` (jump into a mini program). Sub-menus cannot carry
 * actions of their own on WeChat, so every nested button stores its action
 * on the leaf.
 */
export type SdkworkIamOauthCustomMenuActionKind = "click" | "view" | "miniprogram";

/**
 * One button of the official account custom menu tree. Top-level buttons may
 * carry up to five `subButtons`; a button that has sub-menus is display-only
 * (it never carries an action itself, mirroring the WeChat editor).
 */
export interface SdkworkIamOauthCustomMenuButton {
  /** Stable id so React keys and selection survive renames/reorders. */
  key: string;
  name: string;
  type?: SdkworkIamOauthCustomMenuActionKind;
  /** `view`: destination web URL. */
  url?: string;
  /** `miniprogram`: target mini program AppID. */
  appId?: string;
  /** `miniprogram`: required path inside the target mini program. */
  pagePath?: string;
  /** `click`: provider EventKey pushed to the server callback. */
  message?: string;
  /** Imported WeChat action that this editor cannot publish losslessly yet. */
  unsupportedType?: string;
  /** Original provider payload retained until the operator converts it. */
  providerAction?: Record<string, unknown>;
  subButtons?: SdkworkIamOauthCustomMenuButton[];
}

/**
 * The editable custom menu design of one official account. `buttons` holds the
 * top-level menus (1-3); each may expand into up to five sub-menus.
 */
export interface SdkworkIamOauthCustomMenuDraft {
  buttons: SdkworkIamOauthCustomMenuButton[];
  updatedAt?: string;
  publishedAt?: string;
  source?: "database" | "wechat";
  /** Monotonic revision of this draft; absent for legacy documents. */
  version?: number;
  /** Earlier revisions retained for conflict resolution and rollback. */
  history?: SdkworkIamOauthCustomMenuVersion[];
}

/** One retained custom-menu revision. */
export interface SdkworkIamOauthCustomMenuVersion {
  version: number;
  buttons: SdkworkIamOauthCustomMenuButton[];
  savedAt?: string;
  publishedAt?: string;
  source?: "database" | "wechat";
}

/**
 * Account context plus the current custom menu draft, loaded together so the
 * menu management page can render the phone preview header without coupling
 * to any host surface.
 */
export interface SdkworkIamOauthCustomMenuContext {
  displayName: string;
  logoUrl?: string;
  draft: SdkworkIamOauthCustomMenuDraft;
  source?: "database" | "wechat" | "empty";
  /** Monotonic revision of the loaded draft. */
  version?: number;
}

/**
 * Structured result of a publish attempt: the draft is always saved first;
 * `published` is false when the backend publish capability is not (yet)
 * wired, with `reason` telling the UI which notice to render.
 */
export interface SdkworkIamOauthCustomMenuPublishResult {
  context?: SdkworkIamOauthCustomMenuContext;
  saved: boolean;
  published: boolean;
  reason?: "backend_unavailable" | "publish_failed";
  errorMessage?: string;
}

export interface SdkworkIamOauthAdminController {
  getState(): SdkworkIamOauthAdminState;
  load(
    resourceKeys?: readonly (keyof SdkworkIamOauthAdminResourceSnapshot)[],
  ): Promise<SdkworkIamOauthAdminResourceSnapshot>;
  loadMoreResource(resourceKey: keyof SdkworkIamOauthAdminResourceSnapshot): Promise<unknown[]>;
  listPageResource(
    resourceKey: keyof SdkworkIamOauthAdminResourceSnapshot,
    params: Record<string, unknown>,
  ): Promise<unknown[]>;
  /**
   * Read one page of resource accounts without touching the paged resource
   * sessions, so a shared official-account transport can list accounts without
   * resetting the page, filters, or status of the page that owns the list.
   */
  listResourceAccountPage(params: Record<string, unknown>): Promise<{
    items: unknown[];
    pageInfo?: SdkWorkPageInfo;
  }>;
  createAccountSetup(
    kind: SdkworkIamOauthAccountKind,
    body: SdkworkIamOauthAccountSetupDraft,
  ): Promise<unknown>;
  setResourceAccountEnabled(
    resourceAccountId: string,
    integrationId: string,
    enabled: boolean,
  ): Promise<unknown>;
  deleteResourceAccount(resourceAccountId: string): Promise<unknown>;
  createIntegration(body: SdkworkIamOauthIntegrationDraft): Promise<unknown>;
  updateIntegrationSetup(
    integrationId: string,
    body: SdkworkIamOauthIntegrationDraft,
  ): Promise<unknown>;
  createClient(body: SdkworkIamOauthClientDraft): Promise<unknown>;
  createSecret(body: SdkworkIamOauthSecretDraft): Promise<unknown>;
  createScopeProfile(body: SdkworkIamOauthScopeProfileDraft): Promise<unknown>;
  createPolicy(body: SdkworkIamOauthPolicyDraft): Promise<unknown>;
  createTenantBinding(body: SdkworkIamOauthTenantBindingDraft): Promise<unknown>;
  createOperatorPlatform(body: SdkworkIamOauthOperatorPlatformDraft): Promise<unknown>;
  createDiagnosticRun(body: SdkworkIamOauthDiagnosticRunDraft): Promise<unknown>;
  createClaimMapping(body: SdkworkIamOauthClaimMappingDraft): Promise<unknown>;
  createWebhookConfig(body: SdkworkIamOauthWebhookConfigDraft): Promise<unknown>;
  updateWebhookConfigSetup(
    webhookConfigId: string,
    body: Partial<SdkworkIamOauthWebhookConfigDraft>,
  ): Promise<unknown>;
  deleteWebhookConfig(webhookConfigId: string): Promise<unknown>;
  createFlowConfig(body: SdkworkIamOauthFlowConfigDraft): Promise<unknown>;
  createSurface(body: SdkworkIamOauthSurfaceDraft): Promise<unknown>;
  createResourceAccount(body: SdkworkIamOauthResourceAccountDraft): Promise<unknown>;
  createResourceAuthorization(body: SdkworkIamOauthResourceAuthorizationDraft): Promise<unknown>;
  createOperationalResource(body: SdkworkIamOauthOperationalResourceDraft): Promise<unknown>;
  createProviderCatalog(body: SdkworkIamOauthProviderCatalogDraft): Promise<unknown>;
  updateAccountLink(body: SdkworkIamOauthAccountLinkUpdateDraft): Promise<unknown>;
  revokeGrant(grantId: string): Promise<unknown>;
  updateIntegration(integrationId: string, enabled: boolean): Promise<unknown>;
  deleteIntegration(integrationId: string): Promise<unknown>;
  updateClient(oauthClientId: string, enabled: boolean): Promise<unknown>;
  deleteClient(oauthClientId: string): Promise<unknown>;
  deleteSecret(secretId: string): Promise<unknown>;
  updateSurface(surfaceId: string, enabled: boolean): Promise<unknown>;
  deleteSurface(surfaceId: string): Promise<unknown>;
  updateFlowConfig(flowConfigId: string, enabled: boolean): Promise<unknown>;
  updateWebhookConfig(webhookConfigId: string, enabled: boolean): Promise<unknown>;
  updateOperatorPlatform(operatorPlatformId: string, enabled: boolean): Promise<unknown>;
  updateResourceAccount(resourceAccountId: string, enabled: boolean): Promise<unknown>;
  updateAccountConfig(
    resourceAccountId: string,
    config: SdkworkIamOauthAccountConfig,
  ): Promise<unknown>;
  updateAccountCredentials(
    resourceAccountId: string,
    body: { appId?: string; appSecret?: string },
  ): Promise<unknown>;
  updateAccountProfile(
    resourceAccountId: string,
    integrationId: string,
    body: { accountType?: string; displayName: string; originalId?: string },
  ): Promise<unknown>;
  updateOperationalResource(resourceId: string, enabled: boolean): Promise<unknown>;
  updateScopeProfileStatus(scopeProfileId: string, active: boolean): Promise<unknown>;
  updateClaimMappingStatus(mappingId: string, active: boolean): Promise<unknown>;
  updatePolicyStatus(policyId: string, active: boolean): Promise<unknown>;
  updateTenantBindingStatus(bindingId: string, active: boolean): Promise<unknown>;
  updateResourceAuthorizationStatus(authorizationId: string, active: boolean): Promise<unknown>;
  runWebhookVerification(webhookConfigId: string): Promise<unknown>;
  runResourceAccountVerification(resourceAccountId: string): Promise<unknown>;
  runResourceAccountAuthorizationRefresh(resourceAccountId: string): Promise<unknown>;
  runResourceAccountMiniProgramLoginCheck(resourceAccountId: string): Promise<unknown>;
  runOperatorPlatformPreAuthorization(operatorPlatformId: string): Promise<unknown>;
  saveOperatorPlatformComponentCredentials(
    operatorPlatformId: string,
    body: SdkworkIamOauthOperatorPlatformComponentDraft,
  ): Promise<unknown>;
  runOperatorPlatformConnectivityCheck(operatorPlatformId: string): Promise<unknown>;
  invokeResourceAuthorizationCapability(
    authorizationId: string,
    capability: string,
    payload: Record<string, unknown>,
  ): Promise<unknown>;
  publishOperationalResource(resourceId: string): Promise<unknown>;
  retrieveDiagnosticRun(diagnosticRunId: string): Promise<unknown>;
  retrieveIntegration(integrationId: string): Promise<unknown>;
  retrieveClient(oauthClientId: string): Promise<unknown>;
  retrieveProviderCatalogEntry(providerCatalogId: string): Promise<unknown>;
  updateProviderCatalogStatus(providerCatalogId: string, active: boolean): Promise<unknown>;
  deleteOperationalResource(resourceId: string): Promise<unknown>;
  loadRelyingPartyConfig(tenantId: string, installationId: string): Promise<SdkworkIamOauthRelyingPartyDraft>;
  updateRelyingParty(body: SdkworkIamOauthRelyingPartyDraft): Promise<unknown>;
  loadScanLoginSettings(): Promise<SdkworkIamOauthScanLoginSettings>;
  updateScanLoginSettings(body: SdkworkIamOauthScanLoginSettingsDraft): Promise<SdkworkIamOauthScanLoginSettings>;
  loadLoginFollowQrSettings(): Promise<SdkworkIamOauthLoginFollowQrSettings>;
  saveLoginFollowQrSettings(
    body: SdkworkIamOauthLoginFollowQrDraft,
  ): Promise<SdkworkIamOauthLoginFollowQrSettings>;
  generateScanLoginPreview(
    qrMode: string,
    accountId?: string,
  ): Promise<SdkworkIamOauthScanLoginPreview>;
  createAccountFollowQrCode(
    resourceAccountId: string,
  ): Promise<SdkworkIamOauthAccountFollowQrCode>;
  loadAccountCustomMenu(resourceAccountId: string): Promise<SdkworkIamOauthCustomMenuContext>;
  saveAccountCustomMenu(
    resourceAccountId: string,
    draft: SdkworkIamOauthCustomMenuDraft,
  ): Promise<SdkworkIamOauthCustomMenuContext>;
  publishAccountCustomMenu(
    resourceAccountId: string,
    draft: SdkworkIamOauthCustomMenuDraft,
  ): Promise<SdkworkIamOauthCustomMenuPublishResult>;
  /** Pull the live WeChat menu into the stored draft as a new version. */
  syncAccountCustomMenu(
    resourceAccountId: string,
    baseVersion?: number,
  ): Promise<SdkworkIamOauthCustomMenuContext>;
  /** Restore a retained revision and publish it to WeChat. */
  rollbackAccountCustomMenu(
    resourceAccountId: string,
    version: number,
    baseVersion?: number,
  ): Promise<SdkworkIamOauthCustomMenuContext>;
  setResourceAccountQrLogin(resourceAccountId: string, enabled: boolean): Promise<unknown>;
}

export interface SdkworkIamOauthAdminSettingsProps {
  controller: SdkworkIamOauthAdminController;
  tab?: SdkworkIamOauthAdminTab;
  view?: SdkworkIamOauthAdminView;
}

export interface SdkworkIamOauthAdminWorkspaceProps {
  controller: SdkworkIamOauthAdminController;
}

/**
 * Shared props contract for composed admin pages (view/tab/all surfaces).
 */
export type SdkworkIamOauthAdminPageProps = Pick<
  SdkworkIamOauthAdminSettingsProps,
  "controller"
>;

/**
 * Shared props contract for the per-resource settings sections. Sections
 * receive list data, controller, busy state, and the page-level refresh hook
 * from their composing page; they never create HTTP clients.
 */
export interface SdkworkIamOauthAdminSectionProps {
  controller: SdkworkIamOauthAdminController;
  disabled: boolean;
  listPageInfo?: Partial<Record<keyof SdkworkIamOauthAdminResourceSnapshot, SdkWorkPageInfo>>;
  onChanged: () => void;
  status?: SdkworkIamOauthAdminState["status"];
}

/**
 * UI discovery of the server-side oauth mutation permissions (REQ-2026-0107).
 *
 * Every member defaults to `true`: callers that do not model permissions keep
 * today's behavior (open-closed), and the backend-api manifest remains the
 * enforcement point either way. The host derives each page's prop from the
 * session scope with `can("iam.oauth.<family>.<action>")`.
 */
export interface SdkworkIamOauthPagePermissions {
  create?: boolean;
  update?: boolean;
  delete?: boolean;
}

/**
 * Custom-menu editor permissions (REQ-2026-0107): saving a draft needs
 * `iam.oauth.resourceAccounts.customMenus.update`, publishing needs
 * `iam.oauth.resourceAccounts.customMenus.publish`. Both default to `true`.
 */
export interface SdkworkIamOauthCustomMenuPermissions {
  update?: boolean;
  publish?: boolean;
}
