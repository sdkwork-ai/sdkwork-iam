// SDKWORK-IAM-FLUTTER-ADMIN-OAUTH: authored state.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_admin_oauth`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this root uses
 * controllers, so state objects stay immutable and controllers emit them.
 */

import '../services/admin_oauth_service.dart';

/// Lifecycle of the provider catalog.
enum IamFlutterMobileAdminOAuthStatus {
  /// Nothing requested yet.
  idle,

  /// The first page is in flight.
  loading,

  /// Rows are available.
  ready,

  /// The first page failed; [IamFlutterMobileAdminOAuthState.errorMessage] says why.
  error,
}

/// State of the `admin_oauth` capability.
class IamFlutterMobileAdminOAuthState {
  const IamFlutterMobileAdminOAuthState({
    this.status = IamFlutterMobileAdminOAuthStatus.idle,
    this.items = const <IamFlutterMobileAdminOAuthProviderRow>[],
    this.hasMore = false,
    this.loadingMore = false,
    this.errorMessage,
    this.search = '',
  });

  /// Current lifecycle stage.
  final IamFlutterMobileAdminOAuthStatus status;

  /// Rows loaded so far.
  final List<IamFlutterMobileAdminOAuthProviderRow> items;

  /// Whether the server reported another page.
  final bool hasMore;

  /// True while a follow-up page is in flight.
  final bool loadingMore;

  /// User-safe failure text.
  final String? errorMessage;

  /// Current server-side search term.
  final String search;

  /// A copy that keeps every field.
  IamFlutterMobileAdminOAuthState copyWith({
    IamFlutterMobileAdminOAuthStatus? status,
    List<IamFlutterMobileAdminOAuthProviderRow>? items,
    bool? hasMore,
    bool? loadingMore,
    String? errorMessage,
    String? search,
  }) {
    return IamFlutterMobileAdminOAuthState(
      status: status ?? this.status,
      items: items ?? this.items,
      hasMore: hasMore ?? this.hasMore,
      loadingMore: loadingMore ?? this.loadingMore,
      errorMessage: errorMessage ?? this.errorMessage,
      search: search ?? this.search,
    );
  }

  /// A copy for a fresh first-page load with the given term.
  IamFlutterMobileAdminOAuthState reloading(String term) {
    return IamFlutterMobileAdminOAuthState(
      search: term,
      status: IamFlutterMobileAdminOAuthStatus.loading,
    );
  }

  /// A copy that records a failure, keeping the rows already loaded.
  IamFlutterMobileAdminOAuthState failed(String message) {
    return IamFlutterMobileAdminOAuthState(
      errorMessage: message,
      hasMore: hasMore,
      items: items,
      search: search,
      status: items.isEmpty
          ? IamFlutterMobileAdminOAuthStatus.error
          : IamFlutterMobileAdminOAuthStatus.ready,
    );
  }
}
