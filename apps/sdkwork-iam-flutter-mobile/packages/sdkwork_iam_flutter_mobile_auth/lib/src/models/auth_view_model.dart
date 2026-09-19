// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models and route parameters of `sdkwork_iam_flutter_mobile_auth`.
 *
 * Section 4 gives this directory view models and route params only; API DTOs come
 * from the generated Dart SDK.
 */

/// Route identity owned by this package, for typed navigation calls.
class IamFlutterMobileAuthRoutes {
  const IamFlutterMobileAuthRoutes._();

  /// Route id of `/auth/login`.
  static const String loginRouteId = 'app.iam.auth.login';

  /// Route id of `/auth/register`.
  static const String registerRouteId = 'app.iam.auth.register';

  /// Route id of `/auth/forgot-password`.
  static const String forgot-passwordRouteId = 'app.iam.auth.forgot-password';

  /// Route id of `/auth/oauth/callback`.
  static const String oauth-callbackRouteId = 'app.iam.auth.oauth-callback';

  /// Route id of `/auth/login/context`.
  static const String context-selectionRouteId = 'app.iam.auth.context-selection';
}

/// Presentation state of the `auth` capability.
class IamFlutterMobileAuthViewModel {
  const IamFlutterMobileAuthViewModel({
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
