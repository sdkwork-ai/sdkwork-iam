// SDKWORK-IAM-FLUTTER-CONSOLE-ORGANIZATION: authored service layer.
/**
 * Use-case orchestration of `sdkwork_iam_flutter_mobile_console_organization`.
 *
 * Section 6: this package consumes `/app/v3/api` through generated Dart SDK clients that
 * the bootstrap injected. The service receives its collaborators, so it never constructs a
 * client and never composes raw HTTP or manual authorization headers.
 *
 * The console lists every organization of the tenant an operator is acting in, so the row
 * keeps the parent id an operator needs to reconstruct the tree — the app directory shows
 * the same rows for a different reason (what am I a member of).
 */

/// One organization row.
class IamFlutterMobileConsoleOrganizationRow {
  const IamFlutterMobileConsoleOrganizationRow({
    required this.id,
    required this.title,
    this.detail,
  });

  /// Stable identity.
  final String id;

  /// Primary line.
  final String title;

  /// Secondary line: the organization id and its parent id.
  final String? detail;
}

/// One page of organizations.
class IamFlutterMobileConsoleOrganizationPage {
  const IamFlutterMobileConsoleOrganizationPage({
    this.items = const <IamFlutterMobileConsoleOrganizationRow>[],
    this.hasMore = false,
  });

  /// Records of this page.
  final List<IamFlutterMobileConsoleOrganizationRow> items;

  /// Whether the server reported another page.
  final bool hasMore;
}

/// The data port the capability depends on.
abstract class IamFlutterMobileConsoleOrganizationDataSource {
  /// Fetches one page, server-searched by [q].
  Future<IamFlutterMobileConsoleOrganizationPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  });
}

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> iamFlutterMobileConsoleOrganizationRoutePaths = <String, String>{
  'console.iam.organization.directory': '/console/iam/organizations',
};

/// Validation and error mapping of the `console_organization` capability.
class IamFlutterMobileConsoleOrganizationService {
  const IamFlutterMobileConsoleOrganizationService({
    IamFlutterMobileConsoleOrganizationDataSource? dataSource,
  }) : _dataSource = dataSource;

  final IamFlutterMobileConsoleOrganizationDataSource? _dataSource;

  /// Fetches one page of organizations.
  Future<IamFlutterMobileConsoleOrganizationPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  }) {
    return _requireDataSource().fetchPage(page: page, pageSize: pageSize, q: q);
  }

  /// Maps a physical Flutter location back to its cross-client route id.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry in iamFlutterMobileConsoleOrganizationRoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }

  IamFlutterMobileConsoleOrganizationDataSource _requireDataSource() {
    final IamFlutterMobileConsoleOrganizationDataSource? source = _dataSource;
    if (source == null) {
      throw StateError(
        'IamFlutterMobileConsoleOrganizationService requires an '
        'IamFlutterMobileConsoleOrganizationDataSource; the root bootstrap must inject one.',
      );
    }
    return source;
  }
}
