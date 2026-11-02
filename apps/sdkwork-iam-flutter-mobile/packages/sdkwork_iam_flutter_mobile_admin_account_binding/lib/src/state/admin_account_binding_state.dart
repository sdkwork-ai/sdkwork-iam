// SDKWORK-IAM-FLUTTER-ADMIN-ACCOUNT-BINDING: authored state.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_admin_account_binding`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this root uses
 * controllers, so state objects stay immutable and controllers emit them.
 */

import '../services/admin_account_binding_service.dart';

/// Lifecycle of the tenant-wide link list.
enum IamFlutterMobileAdminAccountBindingStatus {
  /// Nothing requested yet.
  idle,

  /// The first page is in flight.
  loading,

  /// Rows are available.
  ready,

  /// The first page failed;
  /// [IamFlutterMobileAdminAccountBindingState.errorMessage] says why.
  error,
}

/// State of the `admin_account_binding` capability.
class IamFlutterMobileAdminAccountBindingState {
  const IamFlutterMobileAdminAccountBindingState({
    this.status = IamFlutterMobileAdminAccountBindingStatus.idle,
    this.items = const <IamFlutterMobileAdminAccountLinkRow>[],
    this.hasMore = false,
    this.loadingMore = false,
    this.errorMessage,
    this.search = '',
  });

  /// Current lifecycle stage.
  final IamFlutterMobileAdminAccountBindingStatus status;

  /// Rows loaded so far.
  final List<IamFlutterMobileAdminAccountLinkRow> items;

  /// Whether the server reported another page.
  final bool hasMore;

  /// True while a follow-up page is in flight.
  final bool loadingMore;

  /// User-safe failure text.
  final String? errorMessage;

  /// Current server-side search term.
  final String search;

  /// A copy that keeps every field.
  IamFlutterMobileAdminAccountBindingState copyWith({
    IamFlutterMobileAdminAccountBindingStatus? status,
    List<IamFlutterMobileAdminAccountLinkRow>? items,
    bool? hasMore,
    bool? loadingMore,
    String? errorMessage,
    String? search,
  }) {
    return IamFlutterMobileAdminAccountBindingState(
      status: status ?? this.status,
      items: items ?? this.items,
      hasMore: hasMore ?? this.hasMore,
      loadingMore: loadingMore ?? this.loadingMore,
      errorMessage: errorMessage ?? this.errorMessage,
      search: search ?? this.search,
    );
  }

  /// A copy for a fresh first-page load with the given term.
  IamFlutterMobileAdminAccountBindingState reloading(String term) {
    return IamFlutterMobileAdminAccountBindingState(
      search: term,
      status: IamFlutterMobileAdminAccountBindingStatus.loading,
    );
  }

  /// A copy that records a failure, keeping the rows already loaded.
  IamFlutterMobileAdminAccountBindingState failed(String message) {
    return IamFlutterMobileAdminAccountBindingState(
      errorMessage: message,
      hasMore: hasMore,
      items: items,
      search: search,
      status: items.isEmpty
          ? IamFlutterMobileAdminAccountBindingStatus.error
          : IamFlutterMobileAdminAccountBindingStatus.ready,
    );
  }
}
