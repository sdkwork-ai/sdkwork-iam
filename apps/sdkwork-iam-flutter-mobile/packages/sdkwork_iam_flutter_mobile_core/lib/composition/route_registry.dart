// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Canonical IAM route identity registry of the `app` tier (application surface).
 *
 * Owner: APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md section 4 (the route registry
 * belongs to the tier's core package) and section 7 (route identity). `id` follows
 * `<surface>.<domain>.<capability>.<screen>` and is identical across every IAM
 * client root and every tier; only `presentation` is platform-specific.
 *
 * This registry holds the 12 `app`-surface route(s) and imports no
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

/// Every route of the `app` surface, in canonical order.
const List<RouteContribution> iamFlutterMobileCoreRouteContributions = <RouteContribution>[
  RouteContribution(
    id: 'app.iam.auth.login',
    surface: 'app',
    capability: 'auth',
    screen: 'login',
    path: '/auth/login',
    titleKey: 'iam.auth.login.title',
    auth: RouteAuth.public,
    presentation: 'route',
  ),
  RouteContribution(
    id: 'app.iam.auth.register',
    surface: 'app',
    capability: 'auth',
    screen: 'register',
    path: '/auth/register',
    titleKey: 'iam.auth.register.title',
    auth: RouteAuth.public,
    presentation: 'route',
  ),
  RouteContribution(
    id: 'app.iam.auth.forgot-password',
    surface: 'app',
    capability: 'auth',
    screen: 'forgot-password',
    path: '/auth/forgot-password',
    titleKey: 'iam.auth.forgotPassword.title',
    auth: RouteAuth.public,
    presentation: 'route',
  ),
  RouteContribution(
    id: 'app.iam.auth.oauth-callback',
    surface: 'app',
    capability: 'auth',
    screen: 'oauth-callback',
    path: '/auth/oauth/callback',
    titleKey: 'iam.auth.oauthCallback.title',
    auth: RouteAuth.public,
    presentation: 'route',
  ),
  RouteContribution(
    id: 'app.iam.auth.context-selection',
    surface: 'app',
    capability: 'auth',
    screen: 'context-selection',
    path: '/auth/login/context',
    titleKey: 'iam.auth.contextSelection.title',
    auth: RouteAuth.required,
    presentation: 'route',
  ),
  RouteContribution(
    id: 'app.iam.user-center.profile',
    surface: 'app',
    capability: 'user-center',
    screen: 'profile',
    path: '/user/profile',
    titleKey: 'iam.userCenter.profile.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.self',
  ),
  RouteContribution(
    id: 'app.iam.user-center.password',
    surface: 'app',
    capability: 'user-center',
    screen: 'password',
    path: '/user/password',
    titleKey: 'iam.userCenter.password.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.self',
  ),
  RouteContribution(
    id: 'app.iam.account-binding.list',
    surface: 'app',
    capability: 'account-binding',
    screen: 'list',
    path: '/user/account-binding',
    titleKey: 'iam.accountBinding.list.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.self',
  ),
  RouteContribution(
    id: 'app.iam.user.list',
    surface: 'app',
    capability: 'user',
    screen: 'list',
    path: '/user/directory',
    titleKey: 'iam.user.list.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.users.read',
  ),
  RouteContribution(
    id: 'app.iam.tenant.overview',
    surface: 'app',
    capability: 'tenant',
    screen: 'overview',
    path: '/tenant',
    titleKey: 'iam.tenant.overview.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.tenants.read',
  ),
  RouteContribution(
    id: 'app.iam.organization.directory',
    surface: 'app',
    capability: 'organization',
    screen: 'directory',
    path: '/organizations',
    titleKey: 'iam.organization.directory.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.organizations.read',
  ),
  RouteContribution(
    id: 'app.iam.oauth.providers',
    surface: 'app',
    capability: 'oauth',
    screen: 'providers',
    path: '/oauth/providers',
    titleKey: 'iam.oauth.providers.title',
    auth: RouteAuth.required,
    presentation: 'route',
    permissionHint: 'iam.oauth.read',
  ),
];

/// Route ids of the `app` surface, in registry order.
List<String> iamFlutterMobileCoreRouteIds() {
  return iamFlutterMobileCoreRouteContributions
      .map((RouteContribution contribution) => contribution.id)
      .toList(growable: false);
}

/// Finds one route by its cross-client route id.
RouteContribution? findIamFlutterMobileCoreRoute(String id) {
  for (final RouteContribution contribution in iamFlutterMobileCoreRouteContributions) {
    if (contribution.id == id) return contribution;
  }
  return null;
}

/// Routes of one capability token, for that capability's own route manifest.
List<RouteContribution> iamFlutterMobileCoreRoutesByCapability(String capability) {
  return iamFlutterMobileCoreRouteContributions
      .where((RouteContribution contribution) => contribution.capability == capability)
      .toList(growable: false);
}
