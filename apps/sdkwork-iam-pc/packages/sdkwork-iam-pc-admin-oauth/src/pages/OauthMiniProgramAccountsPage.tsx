import { useMemo } from "react";

import { SdkworkMiniProgramPanel } from "@sdkwork/iam-pc-mini-program";
import type { DriveUploadImageService } from "@sdkwork/drive-upload-image-core";
import type {
  SdkworkIamOauthAdminController,
  SdkworkIamOauthPagePermissions,
} from "../types/oauth-admin-types";
import {
  createIamOauthMiniProgramController,
  miniProgramCapabilitiesOf,
} from "../services/mini-program-operator-operations";

/**
 * Mini program account management.
 *
 * Accounts are `iam_oauth_resource_account` rows with
 * `resourceAccountKind = "mini_program"`. Saving an account auto-creates or
 * reuses the `wechat_mini_program` login integration; enabling it makes the
 * mini program login available immediately.
 *
 * The page is a thin host shell: the CRUD implementation, the capability set,
 * and the panel all live in `@sdkwork/iam-pc-mini-program`. This module only
 * builds the operator transport over the injected backend-admin controller, so
 * cloudrouter's `@sdkwork/cloudrouter-pc-admin-iam` and webserver's
 * `IamAdminSurface` keep mounting the same export with the same props.
 */
export function SdkworkIamOauthMiniProgramAccountsPage({
  controller,
  permissions,
}: {
  controller: SdkworkIamOauthAdminController;
  /**
   * Host-injected Drive image-upload capability. Kept in the props contract for
   * the page consumers that pass it; the mini-program account identity has no
   * logo field, so the shared panel does not consume it.
   */
  driveUploadImageService?: DriveUploadImageService;
  /** UI discovery of the server-side mutation permissions (REQ-2026-0107); every member defaults to true. */
  permissions?: SdkworkIamOauthPagePermissions;
}) {
  const capabilities = useMemo(() => miniProgramCapabilitiesOf(permissions), [permissions]);
  const miniProgramController = useMemo(
    () => createIamOauthMiniProgramController(controller, capabilities),
    [capabilities, controller],
  );
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <SdkworkMiniProgramPanel
        capabilities={capabilities}
        controller={miniProgramController}
      />
    </div>
  );
}
