// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Module registry of the `app` tier.
 *
 * One descriptor per capability package, so the root shell can assemble navigation
 * without importing every package directly — which is what keeps the root `lib/`
 * thin (section 2).
 */

/// One capability package of this tier and the routes it owns.
class ModuleDescriptor {
  const ModuleDescriptor({
    required this.id,
    required this.capability,
    required this.routeIds,
  });

  /// Package directory name.
  final String id;

  /// Domain capability token.
  final String capability;

  /// Cross-client route ids this package contributes.
  final List<String> routeIds;
}

/// Capability packages of the `app` surface.
const List<ModuleDescriptor> iamFlutterMobileCoreModules = <ModuleDescriptor>[
  ModuleDescriptor(
    id: 'sdkwork_iam_flutter_mobile_auth',
    capability: 'auth',
    routeIds: <String>['app.iam.auth.login', 'app.iam.auth.register', 'app.iam.auth.forgot-password', 'app.iam.auth.oauth-callback', 'app.iam.auth.context-selection'],
  ),
  ModuleDescriptor(
    id: 'sdkwork_iam_flutter_mobile_user_center',
    capability: 'user-center',
    routeIds: <String>['app.iam.user-center.profile', 'app.iam.user-center.password'],
  ),
  ModuleDescriptor(
    id: 'sdkwork_iam_flutter_mobile_account_binding',
    capability: 'account-binding',
    routeIds: <String>['app.iam.account-binding.list'],
  ),
  ModuleDescriptor(
    id: 'sdkwork_iam_flutter_mobile_user',
    capability: 'user',
    routeIds: <String>['app.iam.user.list'],
  ),
  ModuleDescriptor(
    id: 'sdkwork_iam_flutter_mobile_tenant',
    capability: 'tenant',
    routeIds: <String>['app.iam.tenant.overview'],
  ),
  ModuleDescriptor(
    id: 'sdkwork_iam_flutter_mobile_organization',
    capability: 'organization',
    routeIds: <String>['app.iam.organization.directory'],
  ),
  ModuleDescriptor(
    id: 'sdkwork_iam_flutter_mobile_oauth',
    capability: 'oauth',
    routeIds: <String>['app.iam.oauth.providers'],
  ),
];
