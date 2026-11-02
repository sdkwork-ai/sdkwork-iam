// SDKWORK-IAM-FLUTTER-ADMIN-AUDIT: authored service layer.
/**
 * Use-case orchestration of `sdkwork_iam_flutter_mobile_admin_audit`.
 *
 * Section 6: the admin tier reads **backend-api** resources; the bootstrap constructs the
 * generated backend client and injects it through the port below.
 *
 * An audit row answers the only question that matters when something looks wrong: who did
 * what, to which resource, and when.
 */

/// One audit event.
class IamFlutterMobileAdminAuditEvent {
  const IamFlutterMobileAdminAuditEvent({
    required this.id,
    this.action,
    this.actor,
    this.occurredAt,
    this.resource,
  });

  /// Stable identity of the event.
  final String id;

  /// Action that happened.
  final String? action;

  /// Who performed it.
  final String? actor;

  /// When it happened, as the server reported it.
  final String? occurredAt;

  /// Resource it touched.
  final String? resource;
}

/// One page of audit events.
class IamFlutterMobileAdminAuditPage {
  const IamFlutterMobileAdminAuditPage({
    this.items = const <IamFlutterMobileAdminAuditEvent>[],
    this.hasMore = false,
  });

  /// Records of this page.
  final List<IamFlutterMobileAdminAuditEvent> items;

  /// Whether the server reported another page.
  final bool hasMore;
}

/// The data port the capability depends on.
abstract class IamFlutterMobileAdminAuditDataSource {
  /// Fetches one page, server-searched by [q].
  Future<IamFlutterMobileAdminAuditPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  });
}

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> iamFlutterMobileAdminAuditRoutePaths = <String, String>{
  'admin.iam.audit.events': '/admin/iam/audit',
};

/// Validation and error mapping of the `admin_audit` capability.
class IamFlutterMobileAdminAuditService {
  const IamFlutterMobileAdminAuditService({IamFlutterMobileAdminAuditDataSource? dataSource})
      : _dataSource = dataSource;

  final IamFlutterMobileAdminAuditDataSource? _dataSource;

  /// Fetches one page of audit events.
  Future<IamFlutterMobileAdminAuditPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  }) {
    return _requireDataSource().fetchPage(page: page, pageSize: pageSize, q: q);
  }

  /// Maps a physical Flutter location back to its cross-client route id.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry in iamFlutterMobileAdminAuditRoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }

  IamFlutterMobileAdminAuditDataSource _requireDataSource() {
    final IamFlutterMobileAdminAuditDataSource? source = _dataSource;
    if (source == null) {
      throw StateError(
        'IamFlutterMobileAdminAuditService requires an IamFlutterMobileAdminAuditDataSource; '
        'the root bootstrap must inject one.',
      );
    }
    return source;
  }
}
