/**
 * Backend-admin host chrome for the shared custom-menu dialog.
 *
 * The editor, the rules, the phone preview and the persistence boundary live in
 * `@sdkwork/iam-pc-official-accounts`; this module only maps the backend-admin
 * controller onto that dialog's callbacks, so the IAM admin page and every
 * product host mount one menu implementation.
 */
import { SdkworkOfficialAccountsMenuDialog } from "@sdkwork/iam-pc-official-accounts";
import type {
  OfficialAccountsMenu,
  OfficialAccountsMenuMessages,
} from "@sdkwork/iam-pc-official-accounts";

import { useSdkworkIamOauthAdminMessages } from "../../i18n";
import type {
  SdkworkIamOauthAdminController,
  SdkworkIamOauthCustomMenuDraft,
  SdkworkIamOauthCustomMenuPermissions,
} from "../../types/oauth-admin-types";

export interface SdkworkIamOauthCustomMenuFullscreenModalProps {
  accountId: string;
  controller: SdkworkIamOauthAdminController;
  onClose: () => void;
  /** UI discovery of the server-side mutation permissions (REQ-2026-0107); every member defaults to true. */
  permissions?: SdkworkIamOauthCustomMenuPermissions;
}

/** Viewport-aware menu workspace hosted by the shared dialog. */
export function SdkworkIamOauthCustomMenuFullscreenModal({
  accountId,
  controller,
  onClose,
  permissions,
}: SdkworkIamOauthCustomMenuFullscreenModalProps) {
  const messages = useSdkworkIamOauthAdminMessages().quickSetup.customMenus;
  return (
    <SdkworkOfficialAccountsMenuDialog
      canPublish={permissions?.publish ?? true}
      canUpdate={permissions?.update ?? true}
      load={async () => {
        const context = await controller.loadAccountCustomMenu(accountId);
        return {
          accountId,
          menu: context.draft,
          displayName: context.displayName,
          logoUrl: context.logoUrl,
          source: context.source,
        };
      }}
      messages={messages as OfficialAccountsMenuMessages}
      onClose={onClose}
      onPublish={async (menu) => {
        const result = await controller.publishAccountCustomMenu(
          accountId,
          menu as SdkworkIamOauthCustomMenuDraft,
        );
        return {
          published: result.published,
          saved: result.saved,
          reason: result.reason,
          errorMessage: result.errorMessage,
        };
      }}
      onSave={async (menu) => {
        const stored = await controller.saveAccountCustomMenu(
          accountId,
          menu as SdkworkIamOauthCustomMenuDraft,
        );
        return stored.draft as OfficialAccountsMenu;
      }}
      open
    />
  );
}
