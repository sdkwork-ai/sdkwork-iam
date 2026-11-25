import { useSdkworkModuleMessages } from "@sdkwork/i18n-pc-react";

import { SDKWORK_IAM_OAUTH_ADMIN_I18N_CATALOG } from "./manifest";

export * from "./manifest";
export type * from "../types/oauth-admin-messages";

/**
 * The two channel panels this package mounts resolve their own namespaces
 * (`@sdkwork/iam-pc-official-accounts`, `@sdkwork/iam-pc-mini-program`).
 * Re-exporting their catalogs here gives a host one import that covers every
 * copy surface reachable from the OAuth admin menu, so it never has to know
 * which panel owns which namespace.
 */
export { SDKWORK_MINI_PROGRAM_I18N_CATALOG } from "@sdkwork/iam-pc-mini-program/i18n";
export { SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG } from "@sdkwork/iam-pc-official-accounts/i18n";

export function useSdkworkIamOauthAdminMessages() {
  return useSdkworkModuleMessages(SDKWORK_IAM_OAUTH_ADMIN_I18N_CATALOG);
}
