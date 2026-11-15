import type { ReactNode } from "react";
import type { DriveUploadImageService } from "@sdkwork/drive-upload-image-core";

import { SdkworkIamOfficialAccountsPanel } from "../client/panel";
import type { SdkworkIamDomainVerification } from "../client/panel";
import { useSdkworkIamOfficialAccountsMessages } from "../client/messages";
import type { SdkworkIamOfficialAccountsController } from "../client/controller";

/**
 * Page wrapper for the user-facing official-account surface.
 *
 * The IAM PC app mounts this on its app-tier route; product clients that embed
 * the same surface render {@link SdkworkIamOfficialAccountsPanel} directly.
 * The page owns only the heading (the panel is a workspace and renders none),
 * so an embedding dialog that already states the title and description does not
 * receive a second copy. The host service layer injects the Drive image-upload
 * capability the logo field uses; without it the field states that uploads are
 * unavailable.
 */
export function SdkworkIamOfficialAccountsPage({
  controller,
  domainVerification,
  driveUploadImageService,
  notifyBaseUrl,
  serverIps,
}: {
  controller: SdkworkIamOfficialAccountsController;
  /** Host-injected WeChat verification-file capability for managed domains. */
  domainVerification?: SdkworkIamDomainVerification;
  /** Host-injected Drive image-upload service (`createDriveUploadImageService`). */
  driveUploadImageService?: DriveUploadImageService;
  /** Gateway origin the standard WeChat callback URL is built from. */
  notifyBaseUrl?: string;
  /** Deployment-published server egress IPs for the WeChat IP allowlist. */
  serverIps?: readonly string[];
}): ReactNode {
  const messages = useSdkworkIamOfficialAccountsMessages();
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 p-4">
      <header className="min-w-0 space-y-1">
        <h2 className="text-base font-semibold text-[var(--sdk-color-text-primary)]">
          {messages.panel.title}
        </h2>
        <p className="text-xs text-[var(--sdk-color-text-muted)]">{messages.panel.description}</p>
      </header>
      <SdkworkIamOfficialAccountsPanel
        controller={controller}
        domainVerification={domainVerification}
        driveUploadImageService={driveUploadImageService}
        notifyBaseUrl={notifyBaseUrl}
        serverIps={serverIps}
      />
    </div>
  );
}
