// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Canonical IAM route identity registry of the `console` tier (console surface).
 *
 * Owner: APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md section 4 (the route registry
 * belongs to the tier's core package) and section 7 (route identity). `id` follows
 * `<surface>.<domain>.<capability>.<screen>` and is identical across every IAM
 * client root and every tier; only `presentation` is platform-specific.
 *
 * This registry holds the 4 `console`-surface route(s) and imports no
 * other package. Section 5 orders the flow `core, commons -> shell -> capabilities
 * -> entry -> host`, so a registry that pulled in the capability packages would be
 * an upward edge and a cycle. Capability packages instead derive their own slice
 * through the helpers below, and the root bootstrap reads the registry directly.
 */

/// Authentication mode of a route contribution.
enum RouteAuth { public, required }

/// One route of this tier, keyed by its cross-client route id.
class RouteContribution {
  const RouteContribution({
    required this.id,
    required this.surface,
    required this.capability,
    required this.screen,
    required this.path,
    required this.titleKey,
    required this.auth,
    required this.presentation,
    this.permissionHint,
    this.additionalPermissionHints = const <String>[],
  });

  /// Cross-client route id, identical in every IAM client root.
  final String id;

  /// Route surface tier: `app`, `console` or `admin`.
  final String surface;

  /// Domain capability token.
  final String capability;

  /// Screen token within the capability.
  final String screen;

  /// Physical path for this platform. Physical paths may differ per platform.
  final String path;

  /// Locale key of the screen title.
  final String titleKey;

  /// Whether the route requires an authenticated session.
  final RouteAuth auth;

  /// Flutter presentation pattern (section 8).
  final String presentation;

  /// Primary permission hint, when the route is permission-gated.
  final String? permissionHint;

  /// Additional permission hints the route accepts.
  final List<String> additionalPermissionHints;
}

/// Every route of the `console` surface, in canonical order.
const List<RouteContribution> iamFlutterMobileConsoleCoreRouteContributions = <RouteContribution>[
  RouteContribution(
    id: 'console.iam.tenant.overview',
    surface: 'console',
    capability: 'tenant',
    screen: 'overview',
    path: '/console/iam/tenant',
    titleKey: 'iam.console.tenant.overview.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.tenant_console',
  ),
  RouteContribution(
    id: 'console.iam.organization.directory',
    surface: 'console',
    capability: 'organization',
    screen: 'directory',
    path: '/console/iam/organizations',
    titleKey: 'iam.console.organization.directory.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.organization_console',
  ),
  RouteContribution(
    id: 'console.iam.account-binding.list',
    surface: 'console',
    capability: 'account-binding',
    screen: 'list',
    path: '/console/iam/account-binding',
    titleKey: 'iam.console.accountBinding.list.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.account_binding_console',
  ),
  RouteContribution(
    id: 'console.iam.user-center.profile',
    surface: 'console',
    capability: 'user-center',
    screen: 'profile',
    path: '/console/iam/user',
    titleKey: 'iam.console.userCenter.profile.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.user_console',
  ),
];

/// Route ids of the `console` surface, in registry order.
List<String> iamFlutterMobileConsoleCoreRouteIds() {
  return iamFlutterMobileConsoleCoreRouteContributions
      .map((RouteContribution contribution) => contribution.id)
      .toList(growable: false);
}

/// Finds one route by its cross-client route id.
RouteContribution? findIamFlutterMobileConsoleCoreRoute(String id) {
  for (final RouteContribution contribution in iamFlutterMobileConsoleCoreRouteContributions) {
    if (contribution.id == id) return contribution;
  }
  return null;
}

/// Routes of one capability token, for that capability's own route manifest.
List<RouteContribution> iamFlutterMobileConsoleCoreRoutesByCapability(String capability) {
  return iamFlutterMobileConsoleCoreRouteContributions
      .where((RouteContribution contribution) => contribution.capability == capability)
      .toList(growable: false);
}
