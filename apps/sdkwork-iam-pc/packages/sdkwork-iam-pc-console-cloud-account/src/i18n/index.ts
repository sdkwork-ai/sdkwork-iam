import { useSdkworkModuleMessages } from "@sdkwork/i18n-pc-react";

import { SDKWORK_IAM_CLOUD_ACCOUNT_CONSOLE_I18N_CATALOG } from "./manifest";

export * from "./manifest";
// The vendor label rules resolve *message keys*, not locale fragments, so they
// live beside the other label helpers instead of inside the locale tree: an
// `i18n/` entry that is not a `<locale>/<domain>/<capability>/` fragment fails
// the repository's i18n standard check.
export * from "../labels/vendor-labels";
export type * from "../types/cloud-account-console-messages";

/**
 * Resolve the cloud account center copy against the locale the host provider is
 * currently rendering. The catalog is passed in whole, so no host has to register
 * it: a capability package that ships its own fragment stays self-contained.
 */
export function useSdkworkIamCloudAccountConsoleMessages() {
  return useSdkworkModuleMessages(SDKWORK_IAM_CLOUD_ACCOUNT_CONSOLE_I18N_CATALOG);
}
