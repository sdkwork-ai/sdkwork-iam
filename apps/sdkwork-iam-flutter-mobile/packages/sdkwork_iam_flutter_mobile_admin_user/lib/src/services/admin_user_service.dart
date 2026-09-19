// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Use-case orchestration of `sdkwork_iam_flutter_mobile_admin_user`.
 *
 * Section 6: this package consumes `/backend/v3/api` through generated Dart SDK
 * clients that the bootstrap injected. The service receives its collaborators, so
 * it never constructs a client and never composes raw HTTP or manual authorization
 * headers.
 */

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> iamFlutterMobileAdminUserRoutePaths = <String, String>{
  'admin.iam.user.list': '/admin/iam/users',
};

/// Validation and error mapping of the `admin_user` capability.
class IamFlutterMobileAdminUserService {
  const IamFlutterMobileAdminUserService();

  /// Maps a physical Flutter location back to its cross-client route id.
  ///
  /// Section 8 resolves a deep link to a route id before converting it into a
  /// navigation action, so the reverse lookup lives beside the forward one.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry in iamFlutterMobileAdminUserRoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }
}
