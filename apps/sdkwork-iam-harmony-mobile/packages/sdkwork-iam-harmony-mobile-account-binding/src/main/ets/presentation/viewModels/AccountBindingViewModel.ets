// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View model of `sdkwork-iam-harmony-mobile-account-binding`.
 *
 * Section 4: `presentation/viewModels/` maps capability state onto what a screen
 * renders. It holds no transport and reads no runtime environment.
 */

import { type AccountBindingState } from '../../state/AccountBindingState';
import { type AccountBindingViewModel } from '../../models/Models';

/**
 * Re-export of the projected type.
 *
 * A screen that renders this view model needs both the type and the projector, and
 * it reaches both through this module. Without the re-export the page's
 * `import { type AccountBindingViewModel } from '../presentation/viewModels/AccountBindingViewModel'`
 * names a binding this module never exports: importing a type is not re-exporting
 * it, so the page compiled nowhere while the module itself stayed clean.
 */
export { type AccountBindingViewModel } from '../../models/Models';

/** Locale keys of the screens this package contributes. */
export const IAM_HARMONY_ACCOUNT_BINDING_TITLE_KEYS: string[] = [
  'iam.accountBinding.list.title',
];

/**
 * Projects capability state onto the view model.
 *
 * The error key is passed through unchanged rather than resolved to copy here:
 * locale resolution belongs to the screen, which knows the active locale.
 */
export function toAccountBindingViewModel(state: AccountBindingState, titleKey: string): AccountBindingViewModel {
  return {
    titleKey,
    loading: state.status === 'loading',
    errorKey: state.errorKey,
  };
}
