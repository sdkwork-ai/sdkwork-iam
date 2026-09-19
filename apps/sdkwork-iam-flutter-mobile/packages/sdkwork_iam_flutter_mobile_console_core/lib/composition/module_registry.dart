// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Module registry of the `console` tier.
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

/// Capability packages of the `console` surface.
const List<ModuleDescriptor> iamFlutterMobileConsoleCoreModules = <ModuleDescriptor>[
  ModuleDescriptor(
    id: 'sdkwork_iam_flutter_mobile_console_tenant',
    capability: 'tenant',
    routeIds: <String>['console.iam.tenant.overview'],
  ),
  ModuleDescriptor(
    id: 'sdkwork_iam_flutter_mobile_console_organization',
    capability: 'organization',
    routeIds: <String>['console.iam.organization.directory'],
  ),
  ModuleDescriptor(
    id: 'sdkwork_iam_flutter_mobile_console_account_binding',
    capability: 'account-binding',
    routeIds: <String>['console.iam.account-binding.list'],
  ),
  ModuleDescriptor(
    id: 'sdkwork_iam_flutter_mobile_console_user_center',
    capability: 'user-center',
    routeIds: <String>['console.iam.user-center.profile'],
  ),
];
