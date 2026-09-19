// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models and route parameters of `sdkwork_iam_flutter_mobile_tenant`.
 *
 * Section 4 gives this directory view models and route params only; API DTOs come
 * from the generated Dart SDK.
 */

/// Route identity owned by this package, for typed navigation calls.
class IamFlutterMobileTenantRoutes {
  const IamFlutterMobileTenantRoutes._();

  /// Route id of `/tenant`.
  static const String overviewRouteId = 'app.iam.tenant.overview';
}

/// Presentation state of the `tenant` capability.
class IamFlutterMobileTenantViewModel {
  const IamFlutterMobileTenantViewModel({
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
