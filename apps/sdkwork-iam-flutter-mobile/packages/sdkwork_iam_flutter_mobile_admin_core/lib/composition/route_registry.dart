// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Canonical IAM route identity registry of the `admin` tier (admin surface).
 *
 * Owner: APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md section 4 (the route registry
 * belongs to the tier's core package) and section 7 (route identity). `id` follows
 * `<surface>.<domain>.<capability>.<screen>` and is identical across every IAM
 * client root and every tier; only `presentation` is platform-specific.
 *
 * This registry holds the 10 `admin`-surface route(s) and imports no
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

/// Every route of the `admin` surface, in canonical order.
const List<RouteContribution> iamFlutterMobileAdminCoreRouteContributions = <RouteContribution>[
  RouteContribution(
    id: 'admin.iam.oauth.providers',
    surface: 'admin',
    capability: 'oauth',
    screen: 'providers',
    path: '/admin/iam/oauth',
    titleKey: 'iam.admin.oauth.providers.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.oauth',
  ),
  RouteContribution(
    id: 'admin.iam.tenant.list',
    surface: 'admin',
    capability: 'tenant',
    screen: 'list',
    path: '/admin/iam/tenants',
    titleKey: 'iam.admin.tenant.list.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.tenants',
  ),
  RouteContribution(
    id: 'admin.iam.organization.tree',
    surface: 'admin',
    capability: 'organization',
    screen: 'tree',
    path: '/admin/iam/organizations',
    titleKey: 'iam.admin.organization.tree.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.organizations',
  ),
  RouteContribution(
    id: 'admin.iam.permission.roles',
    surface: 'admin',
    capability: 'permission',
    screen: 'roles',
    path: '/admin/iam/roles',
    titleKey: 'iam.admin.permission.roles.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.roles',
  ),
  RouteContribution(
    id: 'admin.iam.permission.permissions',
    surface: 'admin',
    capability: 'permission',
    screen: 'permissions',
    path: '/admin/iam/permissions',
    titleKey: 'iam.admin.permission.permissions.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.permissions',
  ),
  RouteContribution(
    id: 'admin.iam.permission.policies',
    surface: 'admin',
    capability: 'permission',
    screen: 'policies',
    path: '/admin/iam/policies',
    titleKey: 'iam.admin.permission.policies.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.policies',
  ),
  RouteContribution(
    id: 'admin.iam.permission.authorizations',
    surface: 'admin',
    capability: 'permission',
    screen: 'authorizations',
    path: '/admin/iam/authorizations',
    titleKey: 'iam.admin.permission.authorizations.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.role_bindings',
  ),
  RouteContribution(
    id: 'admin.iam.account-binding.list',
    surface: 'admin',
    capability: 'account-binding',
    screen: 'list',
    path: '/admin/iam/account-binding',
    titleKey: 'iam.admin.accountBinding.list.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.account_binding',
  ),
  RouteContribution(
    id: 'admin.iam.user.list',
    surface: 'admin',
    capability: 'user',
    screen: 'list',
    path: '/admin/iam/users',
    titleKey: 'iam.admin.user.list.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.users',
  ),
  RouteContribution(
    id: 'admin.iam.audit.events',
    surface: 'admin',
    capability: 'audit',
    screen: 'events',
    path: '/admin/iam/audit',
    titleKey: 'iam.admin.audit.events.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.audit_events',
    additionalPermissionHints: <String>['iam.security_events'],
  ),
];

/// Route ids of the `admin` surface, in registry order.
List<String> iamFlutterMobileAdminCoreRouteIds() {
  return iamFlutterMobileAdminCoreRouteContributions
      .map((RouteContribution contribution) => contribution.id)
      .toList(growable: false);
}

/// Finds one route by its cross-client route id.
RouteContribution? findIamFlutterMobileAdminCoreRoute(String id) {
  for (final RouteContribution contribution in iamFlutterMobileAdminCoreRouteContributions) {
    if (contribution.id == id) return contribution;
  }
  return null;
}

/// Routes of one capability token, for that capability's own route manifest.
List<RouteContribution> iamFlutterMobileAdminCoreRoutesByCapability(String capability) {
  return iamFlutterMobileAdminCoreRouteContributions
      .where((RouteContribution contribution) => contribution.capability == capability)
      .toList(growable: false);
}
