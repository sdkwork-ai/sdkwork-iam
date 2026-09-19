// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Module registry of the `admin` tier.
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

/// Capability packages of the `admin` surface.
const List<ModuleDescriptor> iamFlutterMobileAdminCoreModules = <ModuleDescriptor>[
  ModuleDescriptor(
    id: 'sdkwork_iam_flutter_mobile_admin_oauth',
    capability: 'oauth',
    routeIds: <String>['admin.iam.oauth.providers'],
  ),
  ModuleDescriptor(
    id: 'sdkwork_iam_flutter_mobile_admin_tenant',
    capability: 'tenant',
    routeIds: <String>['admin.iam.tenant.list'],
  ),
  ModuleDescriptor(
    id: 'sdkwork_iam_flutter_mobile_admin_organization',
    capability: 'organization',
    routeIds: <String>['admin.iam.organization.tree'],
  ),
  ModuleDescriptor(
    id: 'sdkwork_iam_flutter_mobile_admin_permission',
    capability: 'permission',
    routeIds: <String>['admin.iam.permission.roles', 'admin.iam.permission.permissions', 'admin.iam.permission.policies', 'admin.iam.permission.authorizations'],
  ),
  ModuleDescriptor(
    id: 'sdkwork_iam_flutter_mobile_admin_account_binding',
    capability: 'account-binding',
    routeIds: <String>['admin.iam.account-binding.list'],
  ),
  ModuleDescriptor(
    id: 'sdkwork_iam_flutter_mobile_admin_user',
    capability: 'user',
    routeIds: <String>['admin.iam.user.list'],
  ),
  ModuleDescriptor(
    id: 'sdkwork_iam_flutter_mobile_admin_audit',
    capability: 'audit',
    routeIds: <String>['admin.iam.audit.events'],
  ),
];
