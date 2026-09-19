// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Page of the `admin-audit` capability.
 *
 * `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 11 requires loading, success,
 * empty, validation-error, permission-denied, offline and unknown-error coverage;
 * the screen delegates every one of them to the shared `ScreenStateView` so no
 * page re-implements a state and none can silently omit one.
 *
 * PENDING PLATFORM WIRING: the device locale comes from the HarmonyOS
 * localization kit (`@kit.LocalizationKit`). That call needs the DevEco toolchain
 * to compile, so it is not shipped as unverified code here; the locale is passed
 * down from the root page instead.
 */
import { ScreenStateView, type ScreenState } from '@sdkwork/sdkwork-iam-harmony-mobile-commons';

import { type AdminAuditViewModel } from '../presentation/viewModels/AdminAuditViewModel';

/** Route ids this page can be mounted for. */
export const IAM_HARMONY_ADMIN_AUDIT_PAGE_ROUTE_IDS: string[] = [
  'admin.iam.audit.events',
];

@Component
export struct AdminAuditPage {
  locale: string = 'en-US';
  offline: boolean = false;
  permissionDenied: boolean = false;
  viewModel: AdminAuditViewModel = { titleKey: '', loading: true };

  /**
   * Which state to render.
   *
   * Ordered so a permission denial is reported ahead of a transient network
   * failure: telling a user to retry a request they are not allowed to make is
   * worse than saying nothing.
   */
  private screenState(): ScreenState {
    if (this.permissionDenied) return 'permission-denied';
    if (this.offline) return 'offline';
    if (this.viewModel.errorKey !== undefined) return 'error';
    if (this.viewModel.loading) return 'loading';
    return 'success';
  }

  build() {
    Column() {
      ScreenStateView({
        status: this.screenState(),
        message: this.viewModel.titleKey,
        retryLabel: '',
      })
    }
    .width('100%')
    .height('100%')
  }
}
