// SDKWORK-IAM-FLUTTER-CONSOLE-TENANT: authored service layer.
/**
 * Use-case orchestration of `sdkwork_iam_flutter_mobile_console_tenant`.
 *
 * Section 6: this package consumes `/app/v3/api` through generated Dart SDK clients that
 * the bootstrap injected. The service receives its collaborators, so it never constructs
 * a client and never composes raw HTTP or manual authorization headers.
 *
 * The console answers a different question than the app tenant screen: an operator wants
 * the tenant they are acting in plus the self-service policy, not their own memberships.
 */

/// Tenant identity the console shows at the top.
class IamFlutterMobileConsoleTenantRuntime {
  const IamFlutterMobileConsoleTenantRuntime({
    this.environment,
    this.tenantId,
    this.userId,
  });

  /// Environment the request landed on, when reported.
  final String? environment;

  /// Tenant the session is pinned to, when reported.
  final String? tenantId;

  /// Operator id, when reported.
  final String? userId;
}

/// The self-service policies an operator checks before answering a ticket.
class IamFlutterMobileConsoleTenantPolicy {
  const IamFlutterMobileConsoleTenantPolicy({
    this.contactEnabled = false,
    this.emailEnabled = false,
    this.oauthEnabled = false,
    this.selfServiceUnlinkEnabled = false,
  });

  /// Whether contact binding is on.
  final bool contactEnabled;

  /// Whether the user may bind an email.
  final bool emailEnabled;

  /// Whether third-party sign-in is offered.
  final bool oauthEnabled;

  /// Whether the user may remove a linked identity themselves.
  final bool selfServiceUnlinkEnabled;
}

/// One organization row.
class IamFlutterMobileConsoleTenantOrganization {
  const IamFlutterMobileConsoleTenantOrganization({
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
class IamFlutterMobileConsoleTenantOrganizationPage {
  const IamFlutterMobileConsoleTenantOrganizationPage({
    this.items = const <IamFlutterMobileConsoleTenantOrganization>[],
    this.hasMore = false,
  });

  /// Records of this page.
  final List<IamFlutterMobileConsoleTenantOrganization> items;

  /// Whether the server reported another page.
  final bool hasMore;
}

/// The data port the capability depends on.
abstract class IamFlutterMobileConsoleTenantDataSource {
  /// Fetches one page of the tenant's organizations.
  Future<IamFlutterMobileConsoleTenantOrganizationPage> fetchOrganizationsPage({
    required int page,
    required int pageSize,
    String? q,
  });

  /// Reads the tenant's self-service binding policy.
  Future<IamFlutterMobileConsoleTenantPolicy> loadPolicy();

  /// Reads the session context the console is acting in.
  Future<IamFlutterMobileConsoleTenantRuntime> loadRuntime();
}

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> iamFlutterMobileConsoleTenantRoutePaths = <String, String>{
  'console.iam.tenant.overview': '/console/iam/tenant',
};

/// Validation and error mapping of the `console_tenant` capability.
class IamFlutterMobileConsoleTenantService {
  const IamFlutterMobileConsoleTenantService({
    IamFlutterMobileConsoleTenantDataSource? dataSource,
  }) : _dataSource = dataSource;

  final IamFlutterMobileConsoleTenantDataSource? _dataSource;

  /// Reads the session context.
  Future<IamFlutterMobileConsoleTenantRuntime> loadRuntime() =>
      _requireDataSource().loadRuntime();

  /// Reads the tenant policy.
  Future<IamFlutterMobileConsoleTenantPolicy> loadPolicy() => _requireDataSource().loadPolicy();

  /// Fetches one page of the tenant's organizations.
  Future<IamFlutterMobileConsoleTenantOrganizationPage> fetchOrganizationsPage({
    required int page,
    required int pageSize,
    String? q,
  }) {
    return _requireDataSource().fetchOrganizationsPage(page: page, pageSize: pageSize, q: q);
  }

  /// Maps a physical Flutter location back to its cross-client route id.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry in iamFlutterMobileConsoleTenantRoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }

  IamFlutterMobileConsoleTenantDataSource _requireDataSource() {
    final IamFlutterMobileConsoleTenantDataSource? source = _dataSource;
    if (source == null) {
      throw StateError(
        'IamFlutterMobileConsoleTenantService requires an '
        'IamFlutterMobileConsoleTenantDataSource; the root bootstrap must inject one.',
      );
    }
    return source;
  }
}
