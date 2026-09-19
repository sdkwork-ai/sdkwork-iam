// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route manifest of `sdkwork_iam_flutter_mobile_console_organization`.
 *
 * Owner: APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md section 7. The identities live in
 * `sdkwork_iam_flutter_mobile_console_core`, which
 * owns the `console` tier registry; this file only narrows them to the
 * `organization` capability so the screens, the shell and the root bootstrap
 * still share one source of truth.
 */

import 'package:sdkwork_iam_flutter_mobile_console_core/sdkwork_iam_flutter_mobile_console_core.dart';

/// Routes of the `organization` capability, taken from the tier registry.
final List<RouteContribution> iamFlutterMobileConsoleOrganizationRouteContributions =
    iamFlutterMobileConsoleCoreRoutesByCapability('organization');

/// Route ids `sdkwork_iam_flutter_mobile_console_organization` owns, in registry order.
List<String> iamFlutterMobileConsoleOrganizationRouteIds() {
  return iamFlutterMobileConsoleOrganizationRouteContributions
      .map((RouteContribution contribution) => contribution.id)
      .toList(growable: false);
}
