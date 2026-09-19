// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Cross-client route alignment test.
 *
 * Proves the Flutter root publishes exactly the route ids of
 * APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md section 7 — the same ids PC, H5, mini
 * program and Harmony declare — and that no tier registry duplicates one.
 */

import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';
import 'package:sdkwork_iam_flutter_mobile/bootstrap/routes.dart';

void main() {
  test('every route id of every tier is present exactly once', () {
    final List<String> ids = allIamRouteIds();
    expect(ids.toSet().length, ids.length, reason: 'duplicate route id across tiers');
    expect(ids.toSet(), <String>{
      'admin.iam.account-binding.list',
      'admin.iam.audit.events',
      'admin.iam.oauth.providers',
      'admin.iam.organization.tree',
      'admin.iam.permission.authorizations',
      'admin.iam.permission.permissions',
      'admin.iam.permission.policies',
      'admin.iam.permission.roles',
      'admin.iam.tenant.list',
      'admin.iam.user.list',
      'app.iam.account-binding.list',
      'app.iam.auth.context-selection',
      'app.iam.auth.forgot-password',
      'app.iam.auth.login',
      'app.iam.auth.oauth-callback',
      'app.iam.auth.register',
      'app.iam.oauth.providers',
      'app.iam.organization.directory',
      'app.iam.tenant.overview',
      'app.iam.user-center.password',
      'app.iam.user-center.profile',
      'app.iam.user.list',
      'console.iam.account-binding.list',
      'console.iam.organization.directory',
      'console.iam.tenant.overview',
      'console.iam.user-center.profile',
    });
  });

  test('each tier registry owns only its own surface', () {
    for (final RouteTierDescriptor descriptor in iamRouteTiers) {
      for (final String id in descriptor.routeIds()) {
        expect(
          id.split('.').first,
          descriptor.tier,
          reason: id + ' is registered under the ' + descriptor.tier + ' tier',
        );
      }
    }
  });

  test('the app tier registry is reachable through its core package boundary', () {
    // `iamFlutterMobileCoreRouteIds` is reached through
    // `package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart`, so this stops compiling if the core
    // package stops exporting its registry. The previous version of this test
    // asserted that a string literal contained a substring of itself, which no
    // change to any package could have broken.
    final List<String> appIds = iamFlutterMobileCoreRouteIds();
    expect(appIds, isNotEmpty);
    expect(appIds.toSet().length, appIds.length, reason: 'duplicate route id inside the app tier');
  });
}
