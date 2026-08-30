import {
  assertSdkworkCatalogLocaleParity,
  createSdkworkMessageCatalog,
  normalizeSdkworkLocale,
  useSdkworkModuleMessages,
} from "@sdkwork/i18n-pc-react";

import { actionsMessages as enActionsMessages } from "./en-US/iam/h5/actions";
import { commonMessages as enCommonMessages } from "./en-US/iam/h5/common";
import { contextSelectionMessages as enContextSelectionMessages } from "./en-US/iam/h5/contextSelection";
import { footerMessages as enFooterMessages } from "./en-US/iam/h5/footer";
import { linksMessages as enLinksMessages } from "./en-US/iam/h5/links";
import { modesMessages as enModesMessages } from "./en-US/iam/h5/modes";
import { oauthMessages as enOauthMessages } from "./en-US/iam/h5/oauth";
import { scanLoginMessages as enScanLoginMessages } from "./en-US/iam/h5/scanLogin";
import { termsModalMessages as enTermsModalMessages } from "./en-US/iam/h5/termsModal";
import { thirdPartyMessages as enThirdPartyMessages } from "./en-US/iam/h5/thirdParty";
import { toastsMessages as enToastsMessages } from "./en-US/iam/h5/toasts";

import { actionsMessages as zhActionsMessages } from "./zh-CN/iam/h5/actions";
import { commonMessages as zhCommonMessages } from "./zh-CN/iam/h5/common";
import { contextSelectionMessages as zhContextSelectionMessages } from "./zh-CN/iam/h5/contextSelection";
import { footerMessages as zhFooterMessages } from "./zh-CN/iam/h5/footer";
import { linksMessages as zhLinksMessages } from "./zh-CN/iam/h5/links";
import { modesMessages as zhModesMessages } from "./zh-CN/iam/h5/modes";
import { oauthMessages as zhOauthMessages } from "./zh-CN/iam/h5/oauth";
import { scanLoginMessages as zhScanLoginMessages } from "./zh-CN/iam/h5/scanLogin";
import { termsModalMessages as zhTermsModalMessages } from "./zh-CN/iam/h5/termsModal";
import { thirdPartyMessages as zhThirdPartyMessages } from "./zh-CN/iam/h5/thirdParty";
import { toastsMessages as zhToastsMessages } from "./zh-CN/iam/h5/toasts";

const EN_US_MESSAGES = {
  actions: enActionsMessages,
  common: enCommonMessages,
  contextSelection: enContextSelectionMessages,
  footer: enFooterMessages,
  links: enLinksMessages,
  modes: enModesMessages,
  oauth: enOauthMessages,
  scanLogin: enScanLoginMessages,
  termsModal: enTermsModalMessages,
  thirdParty: enThirdPartyMessages,
  toasts: enToastsMessages,
};

const ZH_CN_MESSAGES: typeof EN_US_MESSAGES = {
  actions: zhActionsMessages,
  common: zhCommonMessages,
  contextSelection: zhContextSelectionMessages,
  footer: zhFooterMessages,
  links: zhLinksMessages,
  modes: zhModesMessages,
  oauth: zhOauthMessages,
  scanLogin: zhScanLoginMessages,
  termsModal: zhTermsModalMessages,
  thirdParty: zhThirdPartyMessages,
  toasts: zhToastsMessages,
};

const SDKWORK_IAM_H5_AUTH_MESSAGES: Record<SdkworkIamH5AuthLocale, typeof EN_US_MESSAGES> = {
  "en-US": EN_US_MESSAGES,
  "zh-CN": ZH_CN_MESSAGES,
};

export type SdkworkIamH5AuthLocale = "en-US" | "zh-CN";

export type SdkworkIamH5AuthMessages = typeof EN_US_MESSAGES;

export const SDKWORK_IAM_H5_AUTH_I18N_NAMESPACE = "iam.h5.auth";

export const SDKWORK_IAM_H5_AUTH_I18N_CATALOG = createSdkworkMessageCatalog<SdkworkIamH5AuthMessages>({
  defaultLocale: "en-US",
  locales: SDKWORK_IAM_H5_AUTH_MESSAGES,
  namespace: SDKWORK_IAM_H5_AUTH_I18N_NAMESPACE,
});

export function assertSdkworkIamH5AuthI18nCatalogParity(): void {
  assertSdkworkCatalogLocaleParity(SDKWORK_IAM_H5_AUTH_I18N_CATALOG);
}

export function createSdkworkIamH5AuthMessages(
  locale?: string | null,
): SdkworkIamH5AuthMessages {
  return SDKWORK_IAM_H5_AUTH_I18N_CATALOG.resolveMessages(locale);
}

export function normalizeSdkworkIamH5AuthLocale(locale?: string | null): SdkworkIamH5AuthLocale {
  return normalizeSdkworkLocale(locale);
}

export function useSdkworkIamH5AuthMessages() {
  return useSdkworkModuleMessages(SDKWORK_IAM_H5_AUTH_I18N_CATALOG);
}