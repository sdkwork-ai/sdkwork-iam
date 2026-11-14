import type { ReactNode } from "react";
import type { DriveUploadImageService } from "@sdkwork/drive-upload-image-core";

import { SdkworkIamOfficialAccountsPanel } from "../client/panel";
import { useSdkworkIamOfficialAccountsMessages } from "../client/messages";
import type { SdkworkIamOfficialAccountsController } from "../client/controller";

/**
 * Page wrapper for the user-facing official-account surface.
 *
 * The IAM PC app mounts this on its app-tier route; product clients that embed
 * the same surface render {@link SdkworkIamOfficialAccountsPanel} directly.
 * The page owns the heading, so an embedding dialog that already states the
 * title and description does not receive a second copy from the panel. The host
 * service layer injects the Drive image-upload capability the logo field uses;
 * without it the field states that uploads are unavailable.
 */
export function SdkworkIamOfficialAccountsPage({
  controller,
  driveUploadImageService,
}: {
  controller: SdkworkIamOfficialAccountsController;
  /** Host-injected Drive image-upload service (`createDriveUploadImageService`). */
  driveUploadImageService?: DriveUploadImageService;
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
        driveUploadImageService={driveUploadImageService}
      />
    </div>
  );
}
