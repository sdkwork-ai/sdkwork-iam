import type { ReactNode } from "react";

import { SdkworkIamOfficialAccountsPanel } from "../client/panel";
import type { SdkworkIamOfficialAccountsController } from "../client/controller";

/**
 * Page wrapper for the user-facing official-account surface.
 *
 * The IAM PC app mounts this on its app-tier route; product clients that embed
 * the same surface render {@link SdkworkIamOfficialAccountsPanel} directly.
 */
export function SdkworkIamOfficialAccountsPage({
  controller,
}: {
  controller: SdkworkIamOfficialAccountsController;
}): ReactNode {
  return (
    <div className="flex h-full min-h-0 w-full flex-col p-4">
      <SdkworkIamOfficialAccountsPanel controller={controller} />
    </div>
  );
}
