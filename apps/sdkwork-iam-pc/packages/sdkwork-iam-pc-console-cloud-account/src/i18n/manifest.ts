import { createSdkworkMessageCatalog } from "@sdkwork/i18n-pc-react";

import type { SdkworkIamCloudAccountConsoleMessages } from "../types/cloud-account-console-messages";
import { sdkworkIamCloudAccountConsoleMessages as enMessages } from "./en-US/iam/cloud-account/workspace";
import { sdkworkIamCloudAccountConsoleMessages as zhMessages } from "./zh-CN/iam/cloud-account/workspace";

/**
 * Catalog for the cloud account center.
 *
 * One catalog serves both surfaces the page is mounted on (the tenant console and
 * the platform admin), because they render one implementation over one route set
 * — see `adminSubtitle` for the copy that differs.
 *
 * The structural default is `en-US` for the same reason every other catalog in
 * this workspace picks it: an unmatched locale falls back the way the runtime
 * locale chain does.
 */
export const SDKWORK_IAM_CLOUD_ACCOUNT_CONSOLE_I18N_CATALOG = createSdkworkMessageCatalog<SdkworkIamCloudAccountConsoleMessages>({
  defaultLocale: "en-US",
  locales: {
    "en-US": enMessages,
    "zh-CN": zhMessages,
  },
  namespace: "iam.cloud-account.console",
});
