/**
 * User-facing IAM OAuth surface: the signed-in account's own official (service)
 * account configuration and custom-menu draft, over the IAM app API.
 *
 * The panel is transport-agnostic: a host adapts its generated app-SDK slice
 * with `createSdkworkIamOfficialAccountsClient`, builds a
 * `SdkworkIamOfficialAccountsController`, and mounts
 * `SdkworkIamOfficialAccountsPanel` (or the page wrapper) inside an
 * `SdkworkI18nProvider` carrying `SDKWORK_IAM_OFFICIAL_ACCOUNTS_I18N_CATALOG`.
 */
export type {
  SdkworkIamOfficialAccount,
  SdkworkIamOfficialAccountDraft,
  SdkworkIamOfficialAccountMenu,
  SdkworkIamOfficialAccountMenuButton,
  SdkworkIamOfficialAccountsClient,
  SdkworkIamOfficialAccountsListPage,
  SdkworkIamOfficialAccountsQuery,
  SdkworkIamOfficialAccountsState,
} from "./types";
export {
  createSdkworkIamOfficialAccountsClient,
  DEFAULT_OFFICIAL_ACCOUNTS_PAGE_SIZE,
  readOfficialAccountMenu,
  SdkworkIamOfficialAccountsController,
  toOfficialAccount,
  toOfficialAccountCommand,
  toOfficialAccountCreateCommand,
  type SdkworkIamOfficialAccountsApi,
} from "./client/controller";
export {
  SDKWORK_IAM_OFFICIAL_ACCOUNTS_I18N_CATALOG,
  SDKWORK_IAM_OFFICIAL_ACCOUNTS_NAMESPACE,
  useSdkworkIamOfficialAccountsMessages,
  type SdkworkIamOfficialAccountsMessages,
} from "./client/messages";
export { SdkworkIamOfficialAccountsPanel } from "./client/panel";
export { SdkworkIamOfficialAccountsPage } from "./pages/OfficialAccountsPage";
