// SDKWORK-IAM-FLUTTER-ADMIN-OAUTH: authored service layer.
/**
 * Use-case orchestration of `sdkwork_iam_flutter_mobile_admin_oauth`.
 *
 * Section 6: the admin tier reads **backend-api** resources; the bootstrap constructs the
 * generated backend client and injects it through the port below.
 *
 * The provider catalog answers what this deployment can offer at sign-in: which providers
 * exist, which are enabled, and where each entry came from. An operator checks it before
 * telling a user "GitHub sign-in should be there".
 */

/// One provider row.
class IamFlutterMobileAdminOAuthProviderRow {
  const IamFlutterMobileAdminOAuthProviderRow({
    required this.providerKey,
    this.displayName,
    this.enabled,
    this.source,
  });

  /// Provider key, e.g. `github`.
  final String providerKey;

  /// Display name.
  final String? displayName;

  /// Whether the deployment offers it, as reported.
  final bool? enabled;

  /// Where the entry came from (platform catalog vs tenant configuration).
  final String? source;
}

/// One page of providers.
class IamFlutterMobileAdminOAuthProviderPage {
  const IamFlutterMobileAdminOAuthProviderPage({
    this.items = const <IamFlutterMobileAdminOAuthProviderRow>[],
    this.hasMore = false,
  });

  /// Records of this page.
  final List<IamFlutterMobileAdminOAuthProviderRow> items;

  /// Whether the server reported another page.
  final bool hasMore;
}

/// The data port the capability depends on.
abstract class IamFlutterMobileAdminOAuthDataSource {
  /// Fetches one page, server-searched by [q].
  Future<IamFlutterMobileAdminOAuthProviderPage> fetchProvidersPage({
    required int page,
    required int pageSize,
    String? q,
  });
}

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> iamFlutterMobileAdminOAuthRoutePaths = <String, String>{
  'admin.iam.oauth.providers': '/admin/iam/oauth-providers',
};

/// Validation and error mapping of the `admin_oauth` capability.
class IamFlutterMobileAdminOAuthService {
  const IamFlutterMobileAdminOAuthService({IamFlutterMobileAdminOAuthDataSource? dataSource})
      : _dataSource = dataSource;

  final IamFlutterMobileAdminOAuthDataSource? _dataSource;

  /// Fetches one page of providers.
  Future<IamFlutterMobileAdminOAuthProviderPage> fetchProvidersPage({
    required int page,
    required int pageSize,
    String? q,
  }) {
    return _requireDataSource().fetchProvidersPage(page: page, pageSize: pageSize, q: q);
  }

  /// Maps a physical Flutter location back to its cross-client route id.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry in iamFlutterMobileAdminOAuthRoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }

  IamFlutterMobileAdminOAuthDataSource _requireDataSource() {
    final IamFlutterMobileAdminOAuthDataSource? source = _dataSource;
    if (source == null) {
      throw StateError(
        'IamFlutterMobileAdminOAuthService requires an IamFlutterMobileAdminOAuthDataSource; '
        'the root bootstrap must inject one.',
      );
    }
    return source;
  }
}
