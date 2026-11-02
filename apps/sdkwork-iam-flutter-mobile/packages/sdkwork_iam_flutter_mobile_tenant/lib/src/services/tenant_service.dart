// SDKWORK-IAM-FLUTTER-TENANT: authored service layer.
/**
 * Use-case orchestration of `sdkwork_iam_flutter_mobile_tenant`.
 *
 * Section 6: this package consumes `/app/v3/api` through generated Dart SDK
 * clients that the bootstrap injected. The service receives its collaborators, so
 * it never constructs a client and never composes raw HTTP or manual authorization
 * headers.
 *
 * The data dependency is an explicit port ([IamFlutterMobileTenantDataSource])
 * rather than a concrete client: the capability package then compiles and tests
 * without a network, while the root bootstrap supplies the generated-SDK
 * implementation.
 */

/// One row the tenant overview renders.
class IamFlutterMobileTenantRow {
  const IamFlutterMobileTenantRow({
    required this.id,
    required this.title,
    this.detail,
  });

  /// Stable identity, used as the list key.
  final String id;

  /// Primary line.
  final String title;

  /// Secondary line: ids, parent ids, role codes.
  final String? detail;
}

/// Everything the tenant overview screen shows.
class IamFlutterMobileTenantOverview {
  const IamFlutterMobileTenantOverview({
    this.memberships = const <IamFlutterMobileTenantRow>[],
    this.organizations = const <IamFlutterMobileTenantRow>[],
    this.environment,
    this.tenantId,
    this.userId,
  });

  /// Environment the request landed on, when reported.
  final String? environment;

  /// Signed-in user id, when reported.
  final String? userId;

  /// Tenant the session is pinned to, when reported.
  final String? tenantId;

  /// The tenant's organizations.
  final List<IamFlutterMobileTenantRow> organizations;

  /// The caller's memberships.
  final List<IamFlutterMobileTenantRow> memberships;
}

/// The data port the capability depends on.
abstract class IamFlutterMobileTenantDataSource {
  /// Loads the overview for the current session.
  Future<IamFlutterMobileTenantOverview> loadOverview();
}

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> iamFlutterMobileTenantRoutePaths = <String, String>{
  'app.iam.tenant.overview': '/tenant',
};

/// Validation and error mapping of the `tenant` capability.
class IamFlutterMobileTenantService {
  const IamFlutterMobileTenantService({IamFlutterMobileTenantDataSource? dataSource})
      : _dataSource = dataSource;

  final IamFlutterMobileTenantDataSource? _dataSource;

  /// Loads the overview.
  ///
  /// Throws a readable `StateError` when no data source was injected: that is a
  /// composition mistake, and reporting it here names the missing piece instead of
  /// failing later with a null dereference.
  Future<IamFlutterMobileTenantOverview> loadOverview() async {
    final IamFlutterMobileTenantDataSource? source = _dataSource;
    if (source == null) {
      throw StateError(
        'IamFlutterMobileTenantService requires an IamFlutterMobileTenantDataSource; '
        'the root bootstrap must inject one.',
      );
    }
    return source.loadOverview();
  }

  /// Maps a physical Flutter location back to its cross-client route id.
  ///
  /// Section 8 resolves a deep link to a route id before converting it into a
  /// navigation action, so the reverse lookup lives beside the forward one.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry in iamFlutterMobileTenantRoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }
}
