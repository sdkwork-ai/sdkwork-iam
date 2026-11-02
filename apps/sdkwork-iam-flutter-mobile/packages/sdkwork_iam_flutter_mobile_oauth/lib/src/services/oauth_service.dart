// SDKWORK-IAM-FLUTTER-OAUTH: authored service layer.
/**
 * Use-case orchestration of `sdkwork_iam_flutter_mobile_oauth`.
 *
 * Section 6: this package consumes `/app/v3/api` through generated Dart SDK
 * clients that the bootstrap injected. The service receives its collaborators, so
 * it never constructs a client and never composes raw HTTP or manual authorization
 * headers.
 *
 * The data dependency is an explicit port: the capability compiles and tests
 * without a network, and the root bootstrap supplies the generated-SDK
 * implementation.
 */

/// One third-party sign-in provider.
class IamFlutterMobileOAuthProvider {
  const IamFlutterMobileOAuthProvider({
    required this.providerKey,
    this.displayName,
    this.enabled = true,
  });

  /// Stable provider code, e.g. `github`.
  final String providerKey;

  /// Name to show, when the server supplies one.
  final String? displayName;

  /// Whether the provider may be offered.
  ///
  /// Defaults to true because the server only lists providers it wants shown; a
  /// provider that arrives disabled is not rendered.
  final bool enabled;
}

/// The data port the capability depends on.
abstract class IamFlutterMobileOAuthDataSource {
  /// Creates the provider authorization URL to open.
  Future<String> createAuthorizationUrl(String providerKey);

  /// Lists the providers this tenant offers.
  Future<List<IamFlutterMobileOAuthProvider>> loadProviders();
}

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> iamFlutterMobileOAuthRoutePaths = <String, String>{
  'app.iam.oauth.providers': '/oauth/providers',
};

/// Validation and error mapping of the `oauth` capability.
class IamFlutterMobileOAuthService {
  const IamFlutterMobileOAuthService({IamFlutterMobileOAuthDataSource? dataSource})
      : _dataSource = dataSource;

  final IamFlutterMobileOAuthDataSource? _dataSource;

  /// Lists the providers this tenant offers.
  Future<List<IamFlutterMobileOAuthProvider>> loadProviders() =>
      _requireDataSource().loadProviders();

  /// Creates the authorization URL for [providerKey].
  ///
  /// An empty key or an empty URL is refused here: opening nothing would look like a
  /// cancelled sign-in, and the user could not tell it apart from a provider that
  /// refused.
  Future<String> createAuthorizationUrl(String providerKey) async {
    final String key = providerKey.trim();
    if (key.isEmpty) {
      throw StateError('A provider is required to start authorization.');
    }
    final String url = (await _requireDataSource().createAuthorizationUrl(key)).trim();
    if (url.isEmpty) {
      throw StateError('The authorization endpoint returned no URL.');
    }
    return url;
  }

  /// Maps a physical Flutter location back to its cross-client route id.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry in iamFlutterMobileOAuthRoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }

  IamFlutterMobileOAuthDataSource _requireDataSource() {
    final IamFlutterMobileOAuthDataSource? source = _dataSource;
    if (source == null) {
      throw StateError(
        'IamFlutterMobileOAuthService requires an IamFlutterMobileOAuthDataSource; '
        'the root bootstrap must inject one.',
      );
    }
    return source;
  }
}
