import { useEffect, useMemo, useState } from "react";

import { SdkworkOfficialAccountsPanel } from "@sdkwork/iam-pc-official-accounts";
import type { DriveUploadImageService } from "@sdkwork/drive-upload-image-core";
import type {
  SdkworkIamOauthAdminController,
  SdkworkIamOauthCustomMenuPermissions,
  SdkworkIamOauthPagePermissions,
} from "../types/oauth-admin-types";
import { SdkworkIamOauthCustomMenuFullscreenModal } from "../components/custom-menu/custom-menu-fullscreen-modal";
import { createIamOauthOfficialAccountController } from "../services/official-account-operator-operations";
import { officialAccountCapabilitiesOf } from "../services/official-account-capabilities";

/**
 * Official (service) account management.
 *
 * Accounts are `iam_oauth_resource_account` rows with
 * `resourceAccountKind = "official_account"`. Saving an account auto-creates
 * or reuses the `wechat` web-authorization login integration; enabling it
 * shows the WeChat login entry on the login page immediately.
 *
 * The page is a thin host shell: the CRUD implementation and the panel live in
 * `@sdkwork/iam-pc-official-accounts`. This module only builds the shared
 * operator-mode controller over the injected backend controller, derives the
 * capability set from the page permissions, and supplies the admin-only pieces
 * the panel accepts from its host (the Drive logo capability, the deep link,
 * and the full-screen custom-menu takeover).
 *
 * `?open=add` in the URL (e.g. jumped from the scan-login settings page) opens
 * the add-account drawer automatically on mount. The custom menu manager opens
 * as a full-screen modal on top of the list; hosts that prefer a dedicated
 * route can provide `onOpenCustomMenu` to take over navigation.
 */
export function SdkworkIamOauthOfficialAccountsPage({
  controller,
  customMenuPermissions,
  driveUploadImageService,
  onOpenCustomMenu,
  permissions,
}: {
  controller: SdkworkIamOauthAdminController;
  /**
   * Permissions for the custom-menu editor, which answers to its own
   * `iam.oauth.resourceAccounts.customMenus.update/.publish` codes rather
   * than the account-mutation family above (REQ-2026-0107).
   */
  customMenuPermissions?: SdkworkIamOauthCustomMenuPermissions;
  /**
   * Host-injected Drive image-upload capability, threaded to the shared panel's
   * logo field (shared upload component + bounded preview resolution). Omitted:
   * the field keeps a stored logo visible and states that uploads are
   * unavailable.
   */
  driveUploadImageService?: DriveUploadImageService;
  onOpenCustomMenu?: (resourceAccountId: string) => void;
  /** UI discovery of the server-side mutation permissions (REQ-2026-0107); every member defaults to true. */
  permissions?: SdkworkIamOauthPagePermissions;
}) {
  // Operator mode: the shared controller owns every official-account mutation.
  const officialAccounts = useMemo(
    () => createIamOauthOfficialAccountController(controller),
    [controller],
  );
  const capabilities = useMemo(
    () => officialAccountCapabilitiesOf(permissions, customMenuPermissions),
    [customMenuPermissions, permissions],
  );
  const [initialOpen, setInitialOpen] = useState(false);
  const [activeMenuAccountId, setActiveMenuAccountId] = useState<string | undefined>();
  const [serverIps, setServerIps] = useState<readonly string[]>([]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("open") === "add") {
      setInitialOpen(true);
    }
  }, []);
  // The operator-maintained egress IP allowlist lives on the tenant OAuth
  // settings; load it once and let the drawer's server-info tab edit it.
  useEffect(() => {
    let cancelled = false;
    // Partial test doubles and older host controllers may not expose the
    // settings surface; the drawer then renders the page's `serverIps` prop.
    if (typeof controller.loadScanLoginSettings !== "function") return;
    controller.loadScanLoginSettings()
      .then((settings) => { if (!cancelled) setServerIps(settings.serverIps); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [controller]);
  const saveServerIps = async (ips: string[]): Promise<readonly string[]> => {
    if (typeof controller.updateScanLoginSettings !== "function") return serverIps;
    const updated = await controller.updateScanLoginSettings({ serverIps: ips });
    setServerIps(updated.serverIps);
    return updated.serverIps;
  };
  const handleOpenCustomMenu = (resourceAccountId: string) => {
    // Host-provided navigation wins; otherwise open the full-screen modal.
    if (onOpenCustomMenu) {
      onOpenCustomMenu(resourceAccountId);
      return;
    }
    setActiveMenuAccountId(resourceAccountId);
  };
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <SdkworkOfficialAccountsPanel
        capabilities={capabilities}
        controller={officialAccounts}
        driveUploadImageService={driveUploadImageService}
        initialOpen={initialOpen}
        onOpenCustomMenu={handleOpenCustomMenu}
        onSaveServerIps={capabilities.mode === "operator" ? saveServerIps : undefined}
        serverIps={serverIps}
      />
      {activeMenuAccountId ? (
        <SdkworkIamOauthCustomMenuFullscreenModal
          accountId={activeMenuAccountId}
          controller={controller}
          onClose={() => setActiveMenuAccountId(undefined)}
          permissions={customMenuPermissions}
        />
      ) : null}
    </div>
  );
}
