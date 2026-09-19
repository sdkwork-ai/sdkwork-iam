// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route manifest of `sdkwork_iam_flutter_mobile_account_binding`.
 *
 * Owner: APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md section 7. The identities live in
 * `sdkwork_iam_flutter_mobile_core`, which
 * owns the `app` tier registry; this file only narrows them to the
 * `account-binding` capability so the screens, the shell and the root bootstrap
 * still share one source of truth.
 */

import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';

/// Routes of the `account-binding` capability, taken from the tier registry.
final List<RouteContribution> iamFlutterMobileAccountBindingRouteContributions =
    iamFlutterMobileCoreRoutesByCapability('account-binding');

/// Route ids `sdkwork_iam_flutter_mobile_account_binding` owns, in registry order.
List<String> iamFlutterMobileAccountBindingRouteIds() {
  return iamFlutterMobileAccountBindingRouteContributions
      .map((RouteContribution contribution) => contribution.id)
      .toList(growable: false);
}
