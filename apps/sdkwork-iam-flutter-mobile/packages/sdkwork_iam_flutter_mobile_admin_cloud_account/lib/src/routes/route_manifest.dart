// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route manifest of `sdkwork_iam_flutter_mobile_admin_cloud_account`.
 *
 * Owner: APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md section 7. The identities live in
 * `sdkwork_iam_flutter_mobile_admin_core`, which
 * owns the `admin` tier registry; this file only narrows them to the
 * `cloud-account` capability so the screens, the shell and the root bootstrap
 * still share one source of truth.
 */

import 'package:sdkwork_iam_flutter_mobile_admin_core/sdkwork_iam_flutter_mobile_admin_core.dart';

/// Routes of the `cloud-account` capability, taken from the tier registry.
final List<RouteContribution> iamFlutterMobileAdminCloudAccountRouteContributions =
    iamFlutterMobileAdminCoreRoutesByCapability('cloud-account');

/// Route ids `sdkwork_iam_flutter_mobile_admin_cloud_account` owns, in registry order.
List<String> iamFlutterMobileAdminCloudAccountRouteIds() {
  return iamFlutterMobileAdminCloudAccountRouteContributions
      .map((RouteContribution contribution) => contribution.id)
      .toList(growable: false);
}
