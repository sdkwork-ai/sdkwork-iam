// SDKWORK-IAM-FLUTTER-ADMIN-AUDIT: authored state.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_admin_audit`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this root uses
 * controllers, so state objects stay immutable and controllers emit them.
 */

import '../services/admin_audit_service.dart';

/// Lifecycle of the audit trail.
enum IamFlutterMobileAdminAuditStatus {
  /// Nothing requested yet.
  idle,

  /// The first page is in flight.
  loading,

  /// Rows are available.
  ready,

  /// The first page failed; [IamFlutterMobileAdminAuditState.errorMessage] says why.
  error,
}

/// State of the `admin_audit` capability.
class IamFlutterMobileAdminAuditState {
  const IamFlutterMobileAdminAuditState({
    this.status = IamFlutterMobileAdminAuditStatus.idle,
    this.items = const <IamFlutterMobileAdminAuditEvent>[],
    this.hasMore = false,
    this.loadingMore = false,
    this.errorMessage,
    this.search = '',
  });

  /// Current lifecycle stage.
  final IamFlutterMobileAdminAuditStatus status;

  /// Rows loaded so far.
  final List<IamFlutterMobileAdminAuditEvent> items;

  /// Whether the server reported another page.
  final bool hasMore;

  /// True while a follow-up page is in flight.
  final bool loadingMore;

  /// User-safe failure text.
  final String? errorMessage;

  /// Current server-side search term.
  final String search;

  /// A copy that keeps every field.
  IamFlutterMobileAdminAuditState copyWith({
    IamFlutterMobileAdminAuditStatus? status,
    List<IamFlutterMobileAdminAuditEvent>? items,
    bool? hasMore,
    bool? loadingMore,
    String? errorMessage,
    String? search,
  }) {
    return IamFlutterMobileAdminAuditState(
      status: status ?? this.status,
      items: items ?? this.items,
      hasMore: hasMore ?? this.hasMore,
      loadingMore: loadingMore ?? this.loadingMore,
      errorMessage: errorMessage ?? this.errorMessage,
      search: search ?? this.search,
    );
  }

  /// A copy for a fresh first-page load with the given term.
  IamFlutterMobileAdminAuditState reloading(String term) {
    return IamFlutterMobileAdminAuditState(
      search: term,
      status: IamFlutterMobileAdminAuditStatus.loading,
    );
  }

  /// A copy that records a failure, keeping the rows already loaded.
  IamFlutterMobileAdminAuditState failed(String message) {
    return IamFlutterMobileAdminAuditState(
      errorMessage: message,
      hasMore: hasMore,
      items: items,
      search: search,
      status: items.isEmpty
          ? IamFlutterMobileAdminAuditStatus.error
          : IamFlutterMobileAdminAuditStatus.ready,
    );
  }
}
