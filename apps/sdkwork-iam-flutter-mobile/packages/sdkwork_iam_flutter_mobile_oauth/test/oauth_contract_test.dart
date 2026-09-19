// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route contribution test of `sdkwork_iam_flutter_mobile_oauth`.
 *
 * Proves this package contributes the route ids APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC
 * section 7 assigns to the `oauth` capability on the
 * `app` surface, with the physical Flutter path it declares.
 */

import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_oauth/sdkwork_iam_flutter_mobile_oauth.dart';

void main() {
  test('route ids and paths match the cross-client identity', () {
    final Map<String, String> actual = <String, String>{
      for (final RouteContribution contribution in iamFlutterMobileOauthRouteContributions)
        contribution.id: contribution.path,
    };
    expect(actual, <String, String>{
      'app.iam.oauth.providers': '/oauth/providers',
    });
  });

  test('every contribution declares a title key and a presentation', () {
    for (final RouteContribution contribution in iamFlutterMobileOauthRouteContributions) {
      expect(contribution.titleKey, isNotEmpty, reason: contribution.id);
      expect(contribution.presentation, isNotEmpty, reason: contribution.id);
    }
  });
}
