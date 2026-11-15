/**
 * Copy of the user-facing official-account surface.
 *
 * The catalog is owned by `@sdkwork/iam-pc-official-accounts` (namespace
 * `iam.oauth.officialAccounts`); this module re-exports it under the names this
 * package has always exported, so hosts that already register
 * `SDKWORK_IAM_OFFICIAL_ACCOUNTS_I18N_CATALOG` keep the same copy and keys.
 */
export {
  SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG as SDKWORK_IAM_OFFICIAL_ACCOUNTS_I18N_CATALOG,
  SDKWORK_OFFICIAL_ACCOUNTS_NAMESPACE as SDKWORK_IAM_OFFICIAL_ACCOUNTS_NAMESPACE,
  useOfficialAccountsMessages as useSdkworkIamOfficialAccountsMessages,
  type OfficialAccountsMessages as SdkworkIamOfficialAccountsMessages,
} from "@sdkwork/iam-pc-official-accounts";
