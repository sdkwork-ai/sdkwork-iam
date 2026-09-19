// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Use-case orchestration of `sdkwork_iam_flutter_mobile_auth`.
 *
 * Section 6: this package consumes `/app/v3/api` through generated Dart SDK
 * clients that the bootstrap injected. The service receives its collaborators, so
 * it never constructs a client and never composes raw HTTP or manual authorization
 * headers.
 */

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> iamFlutterMobileAuthRoutePaths = <String, String>{
  'app.iam.auth.login': '/auth/login',
  'app.iam.auth.register': '/auth/register',
  'app.iam.auth.forgot-password': '/auth/forgot-password',
  'app.iam.auth.oauth-callback': '/auth/oauth/callback',
  'app.iam.auth.context-selection': '/auth/login/context',
};

/// Validation and error mapping of the `auth` capability.
class IamFlutterMobileAuthService {
  const IamFlutterMobileAuthService();

  /// Maps a physical Flutter location back to its cross-client route id.
  ///
  /// Section 8 resolves a deep link to a route id before converting it into a
  /// navigation action, so the reverse lookup lives beside the forward one.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry in iamFlutterMobileAuthRoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }
}
