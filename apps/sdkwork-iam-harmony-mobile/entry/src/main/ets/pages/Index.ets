// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Root page.
 *
 * `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 1 keeps `entry/` thin: page
 * registry and composition only. This page resolves the registry bootstrap
 * validated, evaluates the shell's auth gate, and hands the result to the generated
 * route-to-page projection. It holds no business state of its own.
 */
import { IAM_HARMONY_DEFAULT_LOCALE, ScreenStateView } from '@sdkwork/sdkwork-iam-harmony-mobile-commons';
import { resolveIamHarmonyEntryRouteId } from '@sdkwork/sdkwork-iam-harmony-mobile-shell';

import { readIamHarmonyOffline } from '../bootstrap/HostAdapters';
import {
  getIamHarmonyAppRuntime,
  getIamHarmonyBootstrapError,
  resolveIamHarmonyAppLocale,
} from '../bootstrap/Runtime';
import { IamHarmonyRoutePageMap } from './__generated__/RoutePageMap';

const BOOTSTRAP_FAILED_MESSAGE: string = 'The application runtime failed to start.';

@Entry
@Component
struct Index {
  @State locale: string = IAM_HARMONY_DEFAULT_LOCALE;
  @State routeId: string = '';
  @State offline: boolean = false;
  /**
   * Route-permission denial.
   *
   * Left false in this slice: the shell decides authentication, and no permission
   * facts are resolved yet, so claiming a denial would be inventing a decision the
   * runtime never made. Every capability page already renders the state, so wiring a
   * real permission source is a change to this field alone.
   */
  @State permissionDenied: boolean = false;
  @State failureMessage: string = '';

  aboutToAppear(): void {
    const runtime = getIamHarmonyAppRuntime();
    if (runtime === null) {
      const recorded: string | null = getIamHarmonyBootstrapError();
      this.failureMessage = recorded ?? BOOTSTRAP_FAILED_MESSAGE;
      return;
    }
    this.locale = resolveIamHarmonyAppLocale();
    const entryRouteId: string | undefined = resolveIamHarmonyEntryRouteId(
      runtime.routes,
      runtime.iam.isAuthenticated(),
    );
    this.routeId = entryRouteId ?? '';
    readIamHarmonyOffline().then((offline: boolean) => {
      this.offline = offline;
    });
  }

  build() {
    Column() {
      if (this.failureMessage.length > 0) {
        ScreenStateView({
          status: 'error',
          message: this.failureMessage,
          retryLabel: '',
        })
      } else {
        IamHarmonyRoutePageMap({
          routeId: this.routeId,
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
      }
    }
    .width('100%')
    .height('100%')
  }
}
