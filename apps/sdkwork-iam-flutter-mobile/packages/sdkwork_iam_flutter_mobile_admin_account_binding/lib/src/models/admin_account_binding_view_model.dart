// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models and route parameters of `sdkwork_iam_flutter_mobile_admin_account_binding`.
 *
 * Section 4 gives this directory view models and route params only; API DTOs come
 * from the generated Dart SDK.
 */

/// Route identity owned by this package, for typed navigation calls.
class IamFlutterMobileAdminAccountBindingRoutes {
  const IamFlutterMobileAdminAccountBindingRoutes._();

  /// Route id of `/admin/iam/account-binding`.
  static const String listRouteId = 'admin.iam.account-binding.list';
}

/// Presentation state of the `admin_account_binding` capability.
class IamFlutterMobileAdminAccountBindingViewModel {
  const IamFlutterMobileAdminAccountBindingViewModel({
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
