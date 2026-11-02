// SDKWORK-IAM-FLUTTER-ADMIN-TENANT: authored service layer.
/**
 * Use-case orchestration of `sdkwork_iam_flutter_mobile_admin_tenant`.
 *
 * Section 6: the admin tier reads **backend-api** resources; the bootstrap constructs the
 * generated backend client and injects it through the port below.
 *
 * A tenant row is what an operator matches a support ticket against: the id they were given,
 * the name the customer uses, and the status that says whether the tenant is usable at all.
 */

/// One tenant row.
class IamFlutterMobileAdminTenantRow {
  const IamFlutterMobileAdminTenantRow({
    required this.id,
    this.name,
    this.slug,
    this.status,
  });

  /// Stable identity.
  final String id;

  /// Display name.
  final String? name;

  /// URL-safe handle, when reported.
  final String? slug;

  /// Lifecycle status, when reported.
  final String? status;
}

/// One page of tenants.
class IamFlutterMobileAdminTenantPage {
  const IamFlutterMobileAdminTenantPage({
    this.items = const <IamFlutterMobileAdminTenantRow>[],
    this.hasMore = false,
  });

  /// Records of this page.
  final List<IamFlutterMobileAdminTenantRow> items;

  /// Whether the server reported another page.
  final bool hasMore;
}

/// The data port the capability depends on.
abstract class IamFlutterMobileAdminTenantDataSource {
  /// Fetches one page, server-searched by [q].
  Future<IamFlutterMobileAdminTenantPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  });
}

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> iamFlutterMobileAdminTenantRoutePaths = <String, String>{
  'admin.iam.tenant.list': '/admin/iam/tenants',
};

/// Validation and error mapping of the `admin_tenant` capability.
class IamFlutterMobileAdminTenantService {
  const IamFlutterMobileAdminTenantService({IamFlutterMobileAdminTenantDataSource? dataSource})
      : _dataSource = dataSource;

  final IamFlutterMobileAdminTenantDataSource? _dataSource;

  /// Fetches one page of tenants.
  Future<IamFlutterMobileAdminTenantPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  }) {
    return _requireDataSource().fetchPage(page: page, pageSize: pageSize, q: q);
  }

  /// Maps a physical Flutter location back to its cross-client route id.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry in iamFlutterMobileAdminTenantRoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }

  IamFlutterMobileAdminTenantDataSource _requireDataSource() {
    final IamFlutterMobileAdminTenantDataSource? source = _dataSource;
    if (source == null) {
      throw StateError(
        'IamFlutterMobileAdminTenantService requires an IamFlutterMobileAdminTenantDataSource; '
        'the root bootstrap must inject one.',
      );
    }
    return source;
  }
}
