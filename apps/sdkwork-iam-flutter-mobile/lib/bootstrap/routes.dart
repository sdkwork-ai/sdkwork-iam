// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Root route assembly.
 *
 * Section 2 keeps the root bootstrap thin: it names the tiers and their composition
 * functions. Each tier's composition lives in its shell, which is the only layer
 * section 5 lets read both the tier core and the tier's capability packages.
 */

import 'package:sdkwork_iam_flutter_mobile_shell/sdkwork_iam_flutter_mobile_shell.dart' as iamFlutterMobileShell;
import 'package:sdkwork_iam_flutter_mobile_console_shell/sdkwork_iam_flutter_mobile_console_shell.dart' as iamFlutterMobileConsoleShell;
import 'package:sdkwork_iam_flutter_mobile_admin_shell/sdkwork_iam_flutter_mobile_admin_shell.dart' as iamFlutterMobileAdminShell;

/// One tier and the composition function that lists its route ids.
class RouteTierDescriptor {
  const RouteTierDescriptor({required this.tier, required this.routeIds});

  /// Route surface tier.
  final String tier;

  /// Composition function of that tier's shell package.
  final List<String> Function() routeIds;
}

/// Tier registries in route-surface order.
const List<RouteTierDescriptor> iamRouteTiers = <RouteTierDescriptor>[
  RouteTierDescriptor(
    tier: 'app',
    routeIds: iamFlutterMobileShell.iamFlutterMobileShellRouteIds,
  ),
  RouteTierDescriptor(
    tier: 'console',
    routeIds: iamFlutterMobileConsoleShell.iamFlutterMobileConsoleShellRouteIds,
  ),
  RouteTierDescriptor(
    tier: 'admin',
    routeIds: iamFlutterMobileAdminShell.iamFlutterMobileAdminShellRouteIds,
  ),
];

/// Every route id this root can navigate to, across all three tiers.
List<String> allIamRouteIds() {
  return <String>[
    for (final RouteTierDescriptor descriptor in iamRouteTiers) ...descriptor.routeIds(),
  ];
}

/// Assembles the root route table during bootstrap.
void createRoutes() {
  // Nothing is cached here: the table is derived from the tier registries on
  // demand, so a hot restart cannot keep a stale registry alive.
  allIamRouteIds();
}
