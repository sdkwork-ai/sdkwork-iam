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

/// One role row.
class IamFlutterMobileAdminRoleRow {
  const IamFlutterMobileAdminRoleRow({
    required this.id,
    this.code,
    this.name,
    this.scope,
  });

  /// Stable identity.
  final String id;

  /// Role code, e.g. `tenant-admin`.
  final String? code;

  /// Display name.
  final String? name;

  /// Scope the role applies to, when reported.
  final String? scope;
}

/// One policy row.
class IamFlutterMobileAdminPolicyRow {
  const IamFlutterMobileAdminPolicyRow({
    required this.id,
    this.action,
    this.effect,
    this.resource,
    this.subject,
  });

  /// Stable identity.
  final String id;

  /// Action the policy covers.
  final String? action;

  /// `allow` or `deny`, as the server reported it.
  final String? effect;

  /// Resource the policy covers.
  final String? resource;

  /// Who the policy applies to.
  final String? subject;
}

/// One page of roles.
class IamFlutterMobileAdminRolePage {
  const IamFlutterMobileAdminRolePage({
    this.items = const <IamFlutterMobileAdminRoleRow>[],
    this.hasMore = false,
  });

  /// Records of this page.
  final List<IamFlutterMobileAdminRoleRow> items;

  /// Whether the server reported another page.
  final bool hasMore;
}

/// One page of policies.
class IamFlutterMobileAdminPolicyPage {
  const IamFlutterMobileAdminPolicyPage({
    this.items = const <IamFlutterMobileAdminPolicyRow>[],
    this.hasMore = false,
  });

  /// Records of this page.
  final List<IamFlutterMobileAdminPolicyRow> items;

  /// Whether the server reported another page.
  final bool hasMore;
}

/// The data port the capability depends on.
abstract class IamFlutterMobileAdminPermissionDataSource {
  /// Fetches one page of policies, server-searched by [q].
  Future<IamFlutterMobileAdminPolicyPage> fetchPoliciesPage({
    required int page,
    required int pageSize,
    String? q,
  });

  /// Fetches one page of permissions, server-searched by [q].
  Future<IamFlutterMobileAdminPermissionPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  });

  /// Fetches one page of roles, server-searched by [q].
  Future<IamFlutterMobileAdminRolePage> fetchRolesPage({
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

  /// Fetches one page of roles.
  Future<IamFlutterMobileAdminRolePage> fetchRolesPage({
    required int page,
    required int pageSize,
    String? q,
  }) {
    return _requireDataSource().fetchRolesPage(page: page, pageSize: pageSize, q: q);
  }

  /// Fetches one page of policies.
  Future<IamFlutterMobileAdminPolicyPage> fetchPoliciesPage({
    required int page,
    required int pageSize,
    String? q,
  }) {
    return _requireDataSource().fetchPoliciesPage(page: page, pageSize: pageSize, q: q);
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
