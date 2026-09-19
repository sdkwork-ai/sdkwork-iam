// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { describe, expect, it } from '@ohos/hypium';

import { listIamHarmonyProfileIds, resolveIamHarmonyEnvironment } from '../../../main/ets/bootstrap/Environment';
import { createIamHarmonyRoutes } from '../../../main/ets/bootstrap/Routes';
import { IAM_HARMONY_DEFAULT_PROFILE_ID } from '../../../main/ets/generated/RuntimeConfig';

/**
 * HarmonyOS on-device contract test.
 *
 * Runs under `hvigor test` with the HarmonyOS SDK available, which is the only
 * environment where these modules can be evaluated at all. It asserts the same
 * properties the repository-level `node --test` suite asserts by reading source,
 * because a source scan proves a value is written down while this proves the built
 * module actually produces it.
 *
 * The import depth is three levels up, not four: this file sits at
 * `entry/src/ohosTest/ets/test/`, so `../../../main/ets` resolves to
 * `entry/src/main/ets`.
 */
export default function iamHarmonyContractTest() {
  describe('SdkworkIamHarmonyContract', () => {
    it('packages all ten runtime profiles', 0, () => {
      expect(listIamHarmonyProfileIds().length).assertEqual(10);
    });

    it('resolves the default profile as harmony-native', 0, () => {
      const environment = resolveIamHarmonyEnvironment(IAM_HARMONY_DEFAULT_PROFILE_ID);
      expect(environment.runtimeTarget).assertEqual('harmony-native');
      expect(environment.profileId).assertEqual(IAM_HARMONY_DEFAULT_PROFILE_ID);
    });

    it('keeps every sdk base url free of the canonical api prefix', 0, () => {
      for (const profileId of listIamHarmonyProfileIds()) {
        const environment = resolveIamHarmonyEnvironment(profileId);
        expect(environment.appbaseAppApiBaseUrl.indexOf('/app/v3/api')).assertEqual(-1);
        expect(environment.platformApiGatewayHttpUrl.indexOf('/backend/v3/api')).assertEqual(-1);
      }
    });

    it('registers a validated route registry', 0, () => {
      const routes = createIamHarmonyRoutes();
      expect(routes.length).assertEqual(26);
    });
  });
}
