// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route contribution test of `sdkwork_iam_flutter_mobile_admin_cloud_account`.
 *
 * Proves this package contributes the route ids APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC
 * section 7 assigns to the `cloud-account` capability on the
 * `backend-admin` surface, with the physical Flutter path it declares.
 */

import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_cloud_account/sdkwork_iam_flutter_mobile_admin_cloud_account.dart';

void main() {
  test('route ids and paths match the cross-client identity', () {
    final Map<String, String> actual = <String, String>{
      for (final RouteContribution contribution in iamFlutterMobileAdminCloudAccountRouteContributions)
        contribution.id: contribution.path,
    };
    expect(actual, <String, String>{
      'admin.iam.cloud-account.list': '/admin/iam/cloud-accounts',
    });
  });

  test('every contribution declares a title key and a presentation', () {
    for (final RouteContribution contribution in iamFlutterMobileAdminCloudAccountRouteContributions) {
      expect(contribution.titleKey, isNotEmpty, reason: contribution.id);
      expect(contribution.presentation, isNotEmpty, reason: contribution.id);
    }
  });
}
