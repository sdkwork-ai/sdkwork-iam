// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Use-case orchestration of `sdkwork_iam_flutter_mobile_admin_oauth`.
 *
 * Section 6: this package consumes `/backend/v3/api` through generated Dart SDK
 * clients that the bootstrap injected. The service receives its collaborators, so
 * it never constructs a client and never composes raw HTTP or manual authorization
 * headers.
 */

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> iamFlutterMobileAdminOauthRoutePaths = <String, String>{
  'admin.iam.oauth.providers': '/admin/iam/oauth',
};

/// Validation and error mapping of the `admin_oauth` capability.
class IamFlutterMobileAdminOauthService {
  const IamFlutterMobileAdminOauthService();

  /// Maps a physical Flutter location back to its cross-client route id.
  ///
  /// Section 8 resolves a deep link to a route id before converting it into a
  /// navigation action, so the reverse lookup lives beside the forward one.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry in iamFlutterMobileAdminOauthRoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }
}
