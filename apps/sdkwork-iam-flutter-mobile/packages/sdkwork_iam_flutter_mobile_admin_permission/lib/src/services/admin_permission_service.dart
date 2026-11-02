// SDKWORK-IAM-FLUTTER-ADMIN-PERMISSION: authored service layer.
/**
 * Use-case orchestration of `sdkwork_iam_flutter_mobile_admin_permission`.
 *
 * Section 6: the admin tier reads **backend-api** resources. The bootstrap constructs the
 * generated backend client and injects it through the port below, so this package never
 * constructs a client and never composes raw HTTP or manual authorization headers.
 *
 * A permission row is a code plus the resource/action it grants; an operator scans it to
 * answer "does this tenant even have a permission for that?".
 */

/// One permission row.
class IamFlutterMobileAdminPermissionRow {
  const IamFlutterMobileAdminPermissionRow({
    required this.id,
    required this.code,
    this.resource,
    this.action,
  });

  /// Stable identity.
  final String id;

  /// Permission code, e.g. `iam.user.read`.
  final String code;

  /// Resource the permission applies to.
  final String? resource;

  /// Action the permission grants.
  final String? action;
}

/// One page of permissions.
class IamFlutterMobileAdminPermissionPage {
  const IamFlutterMobileAdminPermissionPage({
    this.items = const <IamFlutterMobileAdminPermissionRow>[],
    this.hasMore = false,
  });

  /// Records of this page.
  final List<IamFlutterMobileAdminPermissionRow> items;

  /// Whether the server reported another page.
  final bool hasMore;
}

/// The data port the capability depends on.
abstract class IamFlutterMobileAdminPermissionDataSource {
  /// Fetches one page, server-searched by [q].
  Future<IamFlutterMobileAdminPermissionPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  });
}

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> iamFlutterMobileAdminPermissionRoutePaths = <String, String>{
  'admin.iam.permission.permissions': '/admin/iam/permissions',
  'admin.iam.permission.roles': '/admin/iam/roles',
  'admin.iam.permission.policies': '/admin/iam/policies',
  'admin.iam.permission.authorizations': '/admin/iam/authorizations',
};

/// Validation and error mapping of the `admin_permission` capability.
class IamFlutterMobileAdminPermissionService {
  const IamFlutterMobileAdminPermissionService({
    IamFlutterMobileAdminPermissionDataSource? dataSource,
  }) : _dataSource = dataSource;

  final IamFlutterMobileAdminPermissionDataSource? _dataSource;

  /// Fetches one page of permissions.
  Future<IamFlutterMobileAdminPermissionPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  }) {
    return _requireDataSource().fetchPage(page: page, pageSize: pageSize, q: q);
  }

  /// Maps a physical Flutter location back to its cross-client route id.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry in iamFlutterMobileAdminPermissionRoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }

  IamFlutterMobileAdminPermissionDataSource _requireDataSource() {
    final IamFlutterMobileAdminPermissionDataSource? source = _dataSource;
    if (source == null) {
      throw StateError(
        'IamFlutterMobileAdminPermissionService requires an '
        'IamFlutterMobileAdminPermissionDataSource; the root bootstrap must inject one.',
      );
    }
    return source;
  }
}
