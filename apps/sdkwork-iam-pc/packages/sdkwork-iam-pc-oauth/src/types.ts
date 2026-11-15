/**
 * Public contract of the user-facing IAM OAuth surface.
 *
 * The official-account model, drafts, port, and state are owned by
 * `@sdkwork/iam-pc-official-accounts` (the single shared official-account CRUD
 * package). This module re-exports them under the `SdkworkIam…` names this
 * package has always exported, so existing consumers compile unchanged while
 * there is only one implementation.
 */
export type {
  OfficialAccount as SdkworkIamOfficialAccount,
  OfficialAccountDraft as SdkworkIamOfficialAccountDraft,
  OfficialAccountsEncryptMode as SdkworkIamOfficialAccountEncryptMode,
  OfficialAccountsMenu as SdkworkIamOfficialAccountMenu,
  OfficialAccountsMenuButton as SdkworkIamOfficialAccountMenuButton,
  OfficialAccountsPage as SdkworkIamOfficialAccountsListPage,
  OfficialAccountsQuery as SdkworkIamOfficialAccountsQuery,
  OfficialAccountsState as SdkworkIamOfficialAccountsState,
  OfficialAccountsTransport as SdkworkIamOfficialAccountsClient,
} from "@sdkwork/iam-pc-official-accounts";
