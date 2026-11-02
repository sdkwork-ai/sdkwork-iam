// SDKWORK-IAM-FLUTTER-ADMIN-TENANT: authored state.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_admin_tenant`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this root uses
 * controllers, so state objects stay immutable and controllers emit them.
 */

import '../services/admin_tenant_service.dart';

/// Lifecycle of the tenant list.
enum IamFlutterMobileAdminTenantStatus {
  /// Nothing requested yet.
  idle,

  /// The first page is in flight.
  loading,

  /// Rows are available.
  ready,

  /// The first page failed; [IamFlutterMobileAdminTenantState.errorMessage] says why.
  error,
}

/// State of the `admin_tenant` capability.
class IamFlutterMobileAdminTenantState {
  const IamFlutterMobileAdminTenantState({
    this.status = IamFlutterMobileAdminTenantStatus.idle,
    this.items = const <IamFlutterMobileAdminTenantRow>[],
    this.hasMore = false,
    this.loadingMore = false,
    this.errorMessage,
    this.search = '',
  });

  /// Current lifecycle stage.
  final IamFlutterMobileAdminTenantStatus status;

  /// Rows loaded so far.
  final List<IamFlutterMobileAdminTenantRow> items;

  /// Whether the server reported another page.
  final bool hasMore;

  /// True while a follow-up page is in flight.
  final bool loadingMore;

  /// User-safe failure text.
  final String? errorMessage;

  /// Current server-side search term.
  final String search;

  /// A copy that keeps every field.
  IamFlutterMobileAdminTenantState copyWith({
    IamFlutterMobileAdminTenantStatus? status,
    List<IamFlutterMobileAdminTenantRow>? items,
    bool? hasMore,
    bool? loadingMore,
    String? errorMessage,
    String? search,
  }) {
    return IamFlutterMobileAdminTenantState(
      status: status ?? this.status,
      items: items ?? this.items,
      hasMore: hasMore ?? this.hasMore,
      loadingMore: loadingMore ?? this.loadingMore,
      errorMessage: errorMessage ?? this.errorMessage,
      search: search ?? this.search,
    );
  }

  /// A copy for a fresh first-page load with the given term.
  IamFlutterMobileAdminTenantState reloading(String term) {
    return IamFlutterMobileAdminTenantState(
      search: term,
      status: IamFlutterMobileAdminTenantStatus.loading,
    );
  }

  /// A copy that records a failure, keeping the rows already loaded.
  IamFlutterMobileAdminTenantState failed(String message) {
    return IamFlutterMobileAdminTenantState(
      errorMessage: message,
      hasMore: hasMore,
      items: items,
      search: search,
      status: items.isEmpty
          ? IamFlutterMobileAdminTenantStatus.error
          : IamFlutterMobileAdminTenantStatus.ready,
    );
  }
}
