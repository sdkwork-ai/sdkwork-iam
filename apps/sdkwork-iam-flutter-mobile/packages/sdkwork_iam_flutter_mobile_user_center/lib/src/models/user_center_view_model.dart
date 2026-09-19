// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models and route parameters of `sdkwork_iam_flutter_mobile_user_center`.
 *
 * Section 4 gives this directory view models and route params only; API DTOs come
 * from the generated Dart SDK.
 */

/// Route identity owned by this package, for typed navigation calls.
class IamFlutterMobileUserCenterRoutes {
  const IamFlutterMobileUserCenterRoutes._();

  /// Route id of `/user/profile`.
  static const String profileRouteId = 'app.iam.user-center.profile';

  /// Route id of `/user/password`.
  static const String passwordRouteId = 'app.iam.user-center.password';
}

/// Presentation state of the `user_center` capability.
class IamFlutterMobileUserCenterViewModel {
  const IamFlutterMobileUserCenterViewModel({
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
