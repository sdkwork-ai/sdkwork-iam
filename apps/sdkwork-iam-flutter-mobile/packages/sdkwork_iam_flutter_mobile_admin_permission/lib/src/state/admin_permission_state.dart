// SDKWORK-IAM-FLUTTER-ADMIN-PERMISSION: authored state.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_admin_permission`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this root uses
 * controllers, so state objects stay immutable and controllers emit them.
 */

import '../services/admin_permission_service.dart';

/// Lifecycle of the permission catalog.
enum IamFlutterMobileAdminPermissionStatus {
  /// Nothing requested yet.
  idle,

  /// The first page is in flight.
  loading,

  /// Rows are available.
  ready,

  /// The first page failed; [IamFlutterMobileAdminPermissionState.errorMessage] says why.
  error,
}

/// State of the `admin_permission` capability.
class IamFlutterMobileAdminPermissionState {
  const IamFlutterMobileAdminPermissionState({
    this.status = IamFlutterMobileAdminPermissionStatus.idle,
    this.items = const <IamFlutterMobileAdminPermissionRow>[],
    this.hasMore = false,
    this.loadingMore = false,
    this.errorMessage,
    this.search = '',
  });

  /// Current lifecycle stage.
  final IamFlutterMobileAdminPermissionStatus status;

  /// Rows loaded so far.
  final List<IamFlutterMobileAdminPermissionRow> items;

  /// Whether the server reported another page.
  final bool hasMore;

  /// True while a follow-up page is in flight.
  final bool loadingMore;

  /// User-safe failure text.
  final String? errorMessage;

  /// Current server-side search term.
  final String search;

  /// A copy that keeps every field.
  IamFlutterMobileAdminPermissionState copyWith({
    IamFlutterMobileAdminPermissionStatus? status,
    List<IamFlutterMobileAdminPermissionRow>? items,
    bool? hasMore,
    bool? loadingMore,
    String? errorMessage,
    String? search,
  }) {
    return IamFlutterMobileAdminPermissionState(
      status: status ?? this.status,
      items: items ?? this.items,
      hasMore: hasMore ?? this.hasMore,
      loadingMore: loadingMore ?? this.loadingMore,
      errorMessage: errorMessage ?? this.errorMessage,
      search: search ?? this.search,
    );
  }

  /// A copy for a fresh first-page load with the given term.
  IamFlutterMobileAdminPermissionState reloading(String term) {
    return IamFlutterMobileAdminPermissionState(
      search: term,
      status: IamFlutterMobileAdminPermissionStatus.loading,
    );
  }

  /// A copy that records a failure, keeping the rows already loaded.
  IamFlutterMobileAdminPermissionState failed(String message) {
    return IamFlutterMobileAdminPermissionState(
      errorMessage: message,
      hasMore: hasMore,
      items: items,
      search: search,
      status: items.isEmpty
          ? IamFlutterMobileAdminPermissionStatus.error
          : IamFlutterMobileAdminPermissionStatus.ready,
    );
  }
}
