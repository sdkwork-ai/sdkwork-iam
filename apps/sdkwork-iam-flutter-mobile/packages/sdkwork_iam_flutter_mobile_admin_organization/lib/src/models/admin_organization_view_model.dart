// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models and route parameters of `sdkwork_iam_flutter_mobile_admin_organization`.
 *
 * Section 4 gives this directory view models and route params only; API DTOs come
 * from the generated Dart SDK.
 */

/// Route identity owned by this package, for typed navigation calls.
class IamFlutterMobileAdminOrganizationRoutes {
  const IamFlutterMobileAdminOrganizationRoutes._();

  /// Route id of `/admin/iam/organizations`.
  static const String treeRouteId = 'admin.iam.organization.tree';
}

/// Presentation state of the `admin_organization` capability.
class IamFlutterMobileAdminOrganizationViewModel {
  const IamFlutterMobileAdminOrganizationViewModel({
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
