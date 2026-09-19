// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models and route parameters of `sdkwork_iam_flutter_mobile_admin_permission`.
 *
 * Section 4 gives this directory view models and route params only; API DTOs come
 * from the generated Dart SDK.
 */

/// Route identity owned by this package, for typed navigation calls.
class IamFlutterMobileAdminPermissionRoutes {
  const IamFlutterMobileAdminPermissionRoutes._();

  /// Route id of `/admin/iam/roles`.
  static const String rolesRouteId = 'admin.iam.permission.roles';

  /// Route id of `/admin/iam/permissions`.
  static const String permissionsRouteId = 'admin.iam.permission.permissions';

  /// Route id of `/admin/iam/policies`.
  static const String policiesRouteId = 'admin.iam.permission.policies';

  /// Route id of `/admin/iam/authorizations`.
  static const String authorizationsRouteId = 'admin.iam.permission.authorizations';
}

/// Presentation state of the `admin_permission` capability.
class IamFlutterMobileAdminPermissionViewModel {
  const IamFlutterMobileAdminPermissionViewModel({
    required this.titleKey,
    this.loading = false,
    this.errorKey,
  });

  /// Locale key of the screen title.
  final String titleKey;

  /// True while the capability is fetching.
  final bool loading;

  /// Locale key of the last user-safe failure, or null after a success.
  final String? errorKey;
}
