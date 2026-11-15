import type { ReactNode } from "react";
import type { DriveUploadImageService } from "@sdkwork/drive-upload-image-core";
import {
  DEFAULT_SELF_SERVICE_CAPABILITIES,
  SdkworkOfficialAccountsPanel,
} from "@sdkwork/iam-pc-official-accounts";
import type {
  OfficialAccountsController,
  OfficialAccountsDomainVerification,
  OfficialAccountsDomainVerificationStatus,
  OfficialAccountsMessages,
} from "@sdkwork/iam-pc-official-accounts";

/** One domain's WeChat verification-file state (shared contract). */
export type SdkworkIamDomainVerification = OfficialAccountsDomainVerification;

/** Host capability that stores a domain's WeChat verification file (shared contract). */
export type SdkworkIamDomainVerificationStatus = OfficialAccountsDomainVerificationStatus;

/**
 * Page-level port of the shared official-account panel, pinned to the
 * self-service posture.
 *
 * The panel itself is owned by `@sdkwork/iam-pc-official-accounts`; this shell
 * only injects the user-facing capability set (the signed-in account's own
 * `self_managed_account` rows: domain sets, server information, standard notify
 * URL, no operator publish or scan-login default). It renders nothing of its
 * own, so the embedding dialog and the standalone route keep the same DOM.
 */
export function SdkworkIamOfficialAccountsPanel({
  controller,
  domainVerification,
  driveUploadImageService,
  messages,
  notifyBaseUrl,
  onOpenCustomMenu,
  serverIps,
}: {
  controller: OfficialAccountsController;
  /** Host-injected WeChat verification-file capability for managed domains. */
  domainVerification?: SdkworkIamDomainVerification;
  /** Host-injected Drive image-upload service (`createDriveUploadImageService`). */
  driveUploadImageService?: DriveUploadImageService;
  /** Override copy (hosts and tests); defaults to the module catalog. */
  messages?: OfficialAccountsMessages;
  /** Gateway origin the standard WeChat callback URL is built from. */
  notifyBaseUrl?: string;
  /** Operator-only custom-menu navigation hook (unused in the self-service posture). */
  onOpenCustomMenu?: (accountId: string) => void;
  /** Deployment-published server egress IPs for the WeChat IP allowlist. */
  serverIps?: readonly string[];
}): ReactNode {
  return (
    <SdkworkOfficialAccountsPanel
      capabilities={DEFAULT_SELF_SERVICE_CAPABILITIES}
      controller={controller}
      domainVerification={domainVerification}
      driveUploadImageService={driveUploadImageService}
      messages={messages}
      notifyBaseUrl={notifyBaseUrl}
      onOpenCustomMenu={onOpenCustomMenu}
      serverIps={serverIps}
    />
  );
}
