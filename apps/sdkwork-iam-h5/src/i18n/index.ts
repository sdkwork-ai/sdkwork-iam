// SDKWORK-IAM-H5-SHELL-I18N: authored barrel.
import { createSdkworkIamH5MessageCatalog } from "@sdkwork/iam-h5-commons";

import { iamH5ShellMessages as enUS, type IamH5ShellMessages } from "./en-US/iam/h5/shell.js";
import { iamH5ShellMessages as zhCN } from "./zh-CN/iam/h5/shell.js";

export type { IamH5ShellMessages } from "./en-US/iam/h5/shell.js";

/** Namespace of the application-chrome catalog. */
export const IAM_H5_SHELL_I18N_NAMESPACE = "iam.h5.shell";

/** The application-chrome catalog of this root. */
export const IAM_H5_SHELL_I18N_CATALOG = createSdkworkIamH5MessageCatalog<IamH5ShellMessages>({
  bundles: [
    { locale: "en-US", messages: enUS },
    { locale: "zh-CN", messages: zhCN },
  ],
  defaultLocale: "en-US",
  namespace: IAM_H5_SHELL_I18N_NAMESPACE,
});
