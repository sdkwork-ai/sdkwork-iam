import { useEffect, useMemo, useState } from "react";
import { StatusNotice } from "@sdkwork/ui-pc-react";

import type { DriveUploadImageService } from "@sdkwork/drive-upload-image-core";
import type {
  SdkworkIamOauthAdminController,
  SdkworkIamOauthCustomMenuPermissions,
  SdkworkIamOauthPagePermissions,
} from "../types/oauth-admin-types";
import { useOauthAdminPageState } from "../hooks/use-oauth-admin-page-state";
import { useSdkworkIamOauthAdminMessages } from "../i18n";
import { OauthAccountSetupSection } from "../components/oauth-account-setup-section";
import { SdkworkIamOauthCustomMenuFullscreenModal } from "../components/custom-menu/custom-menu-fullscreen-modal";
import { readResourceAccountKind } from "../utils/oauth-admin-utils";

/**
 * Official (service) account management.
 *
 * Accounts are `iam_oauth_resource_account` rows with
 * `resourceAccountKind = "official_account"`. Saving an account auto-creates
 * or reuses the `wechat` web-authorization login integration; enabling it
 * shows the WeChat login entry on the login page immediately.
 *
 * `?open=add` in the URL (e.g. jumped from the scan-login settings page)
 * opens the add-account drawer automatically on mount. The custom menu
 * manager opens as a full-screen modal on top of the list; hosts that prefer
 * a dedicated route can provide `onOpenCustomMenu` to take over navigation.
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
   * Host-injected Drive image-upload capability, threaded to the account
   * setup section's logo field (shared upload component + bounded preview
   * resolution). Omitted: the logo field degrades to the external-URL input.
   */
  driveUploadImageService?: DriveUploadImageService;
  onOpenCustomMenu?: (resourceAccountId: string) => void;
  /** UI discovery of the server-side mutation permissions (REQ-2026-0107); every member defaults to true. */
  permissions?: SdkworkIamOauthPagePermissions;
}) {
  const messages = useSdkworkIamOauthAdminMessages();
  const { data, disabled, error, listPageInfo, status, sync } = useOauthAdminPageState(controller, [
    "resourceAccounts",
    "integrations",
  ]);
  const [initialOpen, setInitialOpen] = useState(false);
  const [activeMenuAccountId, setActiveMenuAccountId] = useState<string | undefined>();
  const accounts = useMemo(
    () => data.resourceAccounts.filter((item) => readResourceAccountKind(item) === "official_account"),
    [data.resourceAccounts],
  );
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("open") === "add") {
      setInitialOpen(true);
    }
  }, []);
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
      {error ? <StatusNotice tone="danger">{error}</StatusNotice> : null}
      <OauthAccountSetupSection
        accounts={accounts}
        common={messages.common}
        controller={controller}
        disabled={disabled}
        driveUploadImageService={driveUploadImageService}
        initialOpen={initialOpen}
        kind="official_account"
        listPageInfo={listPageInfo?.resourceAccounts}
        messages={messages.quickSetup.officialAccounts}
        onChanged={sync}
        onOpenCustomMenu={handleOpenCustomMenu}
        permissions={permissions}
        status={status}
        switchMessages={messages.quickSetup.accountSwitch}
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
