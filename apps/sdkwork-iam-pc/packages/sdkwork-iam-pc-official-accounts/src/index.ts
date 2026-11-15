/**
 * Shared official-account CRUD component.
 *
 * One package carries the unified `iam_oauth_resource_account` official-account
 * contract (`D1`–`D9`): the record and draft types, the single controller state
 * machine, the panel, the bilingual message catalog, and the two transport
 * adapters. Product hosts, the IAM PC app, and the IAM backend-admin consume
 * this package instead of implementing their own official-account CRUD.
 *
 * The package is transport-agnostic: a host adapts its own SDK slice with
 * {@link createOperatorTransport} (backend `iam.oauth.resourceAccounts.*`) or
 * {@link createSelfServiceTransport} (app `iam.oauth.officialAccounts.*`),
 * builds a controller with {@link createOfficialAccountsController}, and mounts
 * {@link SdkworkOfficialAccountsPanel} inside an `SdkworkI18nProvider` carrying
 * {@link SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG}. It performs no raw HTTP and
 * assembles no authentication headers.
 */
export type {
  OfficialAccountsAccessMode,
  OfficialAccountsCapabilities,
  OfficialAccountsCredentialsPatch,
  OfficialAccountsCustomMenuContext,
  OfficialAccountsCustomMenuPublishResult,
  OfficialAccountsEncryptMode,
  OfficialAccountsFollowQrCode,
  OfficialAccountsMenu,
  OfficialAccountsMenuActionKind,
  OfficialAccountsMenuButton,
  OfficialAccountsPage,
  OfficialAccountsPatch,
  OfficialAccountsProfilePatch,
  OfficialAccountsProviderConfig,
  OfficialAccountsQuery,
  OfficialAccountsResourceAccountKind,
  OfficialAccountsState,
  OfficialAccountsTransport,
  OfficialAccountsVerificationKind,
  OfficialAccount,
  OfficialAccountDraft,
} from "./types";
export {
  DEFAULT_OFFICIAL_ACCOUNTS_PAGE_SIZE,
  DEFAULT_OPERATOR_CAPABILITIES,
  DEFAULT_SELF_SERVICE_CAPABILITIES,
  OfficialAccountsCapabilityError,
  OfficialAccountsController,
  OfficialAccountsUnsupportedError,
  createOfficialAccountsController,
} from "./client/controller";
export {
  SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG,
  SDKWORK_OFFICIAL_ACCOUNTS_NAMESPACE,
  useOfficialAccountsMessages,
  type OfficialAccountsMessages,
} from "./client/messages";
export { SdkworkOfficialAccountsPanel } from "./client/panel";
export {
  SdkworkOfficialAccountsMenuDialog,
  type SdkworkOfficialAccountsMenuDialogProps,
  type SdkworkOfficialAccountsMenuPublishOutcome,
} from "./client/menu/dialog";
export {
  SdkworkOfficialAccountsMenuWorkspace,
  type SdkworkOfficialAccountsMenuWorkspaceProps,
} from "./client/menu/workspace";
export {
  OFFICIAL_ACCOUNTS_MENU_MESSAGES_EN_US,
  OFFICIAL_ACCOUNTS_MENU_MESSAGES_ZH_CN,
  type OfficialAccountsMenuMessages,
} from "./client/menu/messages";
export type {
  OfficialAccountsDomainVerification,
  OfficialAccountsDomainVerificationStatus,
} from "./client/panel";
export {
  createOperatorTransport,
  type OfficialAccountsOperatorOperations,
} from "./transport/operator";
export {
  createSelfServiceTransport,
  type OfficialAccountsSelfServiceApi,
} from "./transport/self-service";
export {
  readOfficialAccountMenu,
  toOfficialAccount,
  toOfficialAccountCommand,
  toOfficialAccountCreateCommand,
} from "./transport/normalize";
