// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View model of `sdkwork-iam-harmony-mobile-admin-permission`.
 *
 * Section 4: `presentation/viewModels/` maps capability state onto what a screen
 * renders. It holds no transport and reads no runtime environment.
 */

import { type AdminPermissionState } from '../../state/AdminPermissionState';
import { type AdminPermissionViewModel } from '../../models/Models';

/**
 * Re-export of the projected type.
 *
 * A screen that renders this view model needs both the type and the projector, and
 * it reaches both through this module. Without the re-export the page's
 * `import { type AdminPermissionViewModel } from '../presentation/viewModels/AdminPermissionViewModel'`
 * names a binding this module never exports: importing a type is not re-exporting
 * it, so the page compiled nowhere while the module itself stayed clean.
 */
export { type AdminPermissionViewModel } from '../../models/Models';

/** Locale keys of the screens this package contributes. */
export const IAM_HARMONY_ADMIN_PERMISSION_TITLE_KEYS: string[] = [
  'iam.admin.permission.roles.title',
  'iam.admin.permission.permissions.title',
  'iam.admin.permission.policies.title',
  'iam.admin.permission.authorizations.title',
];

/**
 * Projects capability state onto the view model.
 *
 * The error key is passed through unchanged rather than resolved to copy here:
 * locale resolution belongs to the screen, which knows the active locale.
 */
export function toAdminPermissionViewModel(state: AdminPermissionState, titleKey: string): AdminPermissionViewModel {
  return {
    titleKey,
    loading: state.status === 'loading',
    errorKey: state.errorKey,
  };
}
