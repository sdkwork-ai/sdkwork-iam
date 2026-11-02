// SDKWORK-IAM-FLUTTER-ORGANIZATION: authored service layer.
/**
 * Use-case orchestration of `sdkwork_iam_flutter_mobile_organization`.
 *
 * Section 6: this package consumes `/app/v3/api` through generated Dart SDK
 * clients that the bootstrap injected. The service receives its collaborators, so
 * it never constructs a client and never composes raw HTTP or manual authorization
 * headers.
 *
 * The data dependency is an explicit port
 * ([IamFlutterMobileOrganizationDataSource]): the capability compiles and tests
 * without a network, and the root bootstrap supplies the generated-SDK
 * implementation.
 */

/// One organization row.
class IamFlutterMobileOrganizationRow {
  const IamFlutterMobileOrganizationRow({
    required this.id,
    required this.title,
    this.detail,
  });

  /// Stable identity, used as the list key.
  final String id;

  /// Primary line.
  final String title;

  /// Secondary line: the organization id and its parent id.
  final String? detail;
}

/// One page of organizations.
class IamFlutterMobileOrganizationPage {
  const IamFlutterMobileOrganizationPage({
    this.items = const <IamFlutterMobileOrganizationRow>[],
    this.hasMore = false,
  });

  /// Records of this page, in server order.
  final List<IamFlutterMobileOrganizationRow> items;

  /// Whether the server reported another page.
  final bool hasMore;
}

/// The data port the capability depends on.
abstract class IamFlutterMobileOrganizationDataSource {
  /// Fetches one page, server-filtered by [q].
  Future<IamFlutterMobileOrganizationPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  });
}

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> iamFlutterMobileOrganizationRoutePaths = <String, String>{
  'app.iam.organization.directory': '/organizations',
};

/// Validation and error mapping of the `organization` capability.
class IamFlutterMobileOrganizationService {
  const IamFlutterMobileOrganizationService({IamFlutterMobileOrganizationDataSource? dataSource})
      : _dataSource = dataSource;

  final IamFlutterMobileOrganizationDataSource? _dataSource;

  /// Fetches one page of organizations.
  ///
  /// Throws a named `StateError` when no data source was injected: a composition
  /// mistake must say what is missing instead of failing later on a null.
  Future<IamFlutterMobileOrganizationPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  }) {
    final IamFlutterMobileOrganizationDataSource? source = _dataSource;
    if (source == null) {
      throw StateError(
        'IamFlutterMobileOrganizationService requires an '
        'IamFlutterMobileOrganizationDataSource; the root bootstrap must inject one.',
      );
    }
    return source.fetchPage(page: page, pageSize: pageSize, q: q);
  }

  /// Maps a physical Flutter location back to its cross-client route id.
  ///
  /// Section 8 resolves a deep link to a route id before converting it into a
  /// navigation action, so the reverse lookup lives beside the forward one.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry in iamFlutterMobileOrganizationRoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }
}
