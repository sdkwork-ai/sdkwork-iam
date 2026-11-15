/**
 * Capability derivation for the shared official-account panel.
 *
 * The backend-admin page receives UI discovery of the server-side mutation
 * permissions (REQ-2026-0107) plus the custom-menu permission family. The
 * shared panel's capability set is derived once here so the page and the
 * compatibility section agree, and so a new server permission has one place to
 * map onto the panel.
 */
import {
  DEFAULT_OPERATOR_CAPABILITIES,
  type OfficialAccountsCapabilities,
} from "@sdkwork/iam-pc-official-accounts";

import type {
  SdkworkIamOauthCustomMenuPermissions,
  SdkworkIamOauthPagePermissions,
} from "../types/oauth-admin-types";

/**
 * Map the admin page's permission discovery onto the shared capability set.
 *
 * The credential capability gates both the add action and the AppSecret field,
 * so it stays on when either create or update is allowed; a call the server
 * refuses still surfaces its error, so this never turns a denial into a silent
 * no-op.
 *
 * @param permissions - page-level mutation permissions; every member defaults to true.
 * @param customMenuPermissions - the custom-menu family; publish defaults to true.
 * @returns the capability set the panel renders with.
 */
export function officialAccountCapabilitiesOf(
  permissions?: SdkworkIamOauthPagePermissions,
  customMenuPermissions?: SdkworkIamOauthCustomMenuPermissions,
): OfficialAccountsCapabilities {
  const canCreate = permissions?.create ?? true;
  const canUpdate = permissions?.update ?? true;
  return {
    ...DEFAULT_OPERATOR_CAPABILITIES,
    editCredentials: canCreate || canUpdate,
    publishMenu: customMenuPermissions?.publish ?? true,
    manageQrLogin: canUpdate,
    manageDomains: canUpdate,
    manageNotify: canUpdate,
    manageFollowQrCode: canUpdate,
    deleteAccount: permissions?.delete ?? true,
  };
}
