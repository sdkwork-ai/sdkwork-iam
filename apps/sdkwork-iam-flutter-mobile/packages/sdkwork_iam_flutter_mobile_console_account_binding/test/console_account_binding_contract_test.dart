// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route contribution test of `sdkwork_iam_flutter_mobile_console_account_binding`.
 *
 * Proves this package contributes the route ids APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC
 * section 7 assigns to the `account-binding` capability on the
 * `console` surface, with the physical Flutter path it declares.
 */

import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_console_account_binding/sdkwork_iam_flutter_mobile_console_account_binding.dart';

void main() {
  test('route ids and paths match the cross-client identity', () {
    final Map<String, String> actual = <String, String>{
      for (final RouteContribution contribution in iamFlutterMobileConsoleAccountBindingRouteContributions)
        contribution.id: contribution.path,
    };
    expect(actual, <String, String>{
      'console.iam.account-binding.list': '/console/iam/account-binding',
    });
  });

  test('every contribution declares a title key and a presentation', () {
    for (final RouteContribution contribution in iamFlutterMobileConsoleAccountBindingRouteContributions) {
      expect(contribution.titleKey, isNotEmpty, reason: contribution.id);
      expect(contribution.presentation, isNotEmpty, reason: contribution.id);
    }
  });
}
