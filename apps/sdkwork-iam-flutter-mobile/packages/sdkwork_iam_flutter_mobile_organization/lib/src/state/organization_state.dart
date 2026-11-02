// SDKWORK-IAM-FLUTTER-ORGANIZATION: authored state.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_organization`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this
 * root uses controllers, so state objects stay immutable and controllers emit them.
 */

import '../services/organization_service.dart';

/// Lifecycle of the directory list.
enum IamFlutterMobileOrganizationStatus {
  /// Nothing requested yet.
  idle,

  /// The first page is in flight.
  loading,

  /// Rows are available.
  ready,

  /// The first page failed; [IamFlutterMobileOrganizationState.errorMessage] says why.
  error,
}

/// State of the `organization` capability.
class IamFlutterMobileOrganizationState {
  const IamFlutterMobileOrganizationState({
    this.status = IamFlutterMobileOrganizationStatus.idle,
    this.items = const <IamFlutterMobileOrganizationRow>[],
    this.hasMore = false,
    this.loadingMore = false,
    this.errorMessage,
    this.search = '',
  });

  /// Current lifecycle stage.
  final IamFlutterMobileOrganizationStatus status;

  /// Rows loaded so far, in server order.
  final List<IamFlutterMobileOrganizationRow> items;

  /// Whether the server reported another page.
  final bool hasMore;

  /// True while a follow-up page is in flight.
  final bool loadingMore;

  /// User-safe failure text: the first page's failure, or the next page's.
  final String? errorMessage;

  /// Current server-side search term.
  final String search;

  /// A copy that keeps every field.
  IamFlutterMobileOrganizationState copyWith({
    IamFlutterMobileOrganizationStatus? status,
    List<IamFlutterMobileOrganizationRow>? items,
    bool? hasMore,
    bool? loadingMore,
    String? errorMessage,
    String? search,
  }) {
    return IamFlutterMobileOrganizationState(
      status: status ?? this.status,
      items: items ?? this.items,
      hasMore: hasMore ?? this.hasMore,
      loadingMore: loadingMore ?? this.loadingMore,
      errorMessage: errorMessage ?? this.errorMessage,
      search: search ?? this.search,
    );
  }

  /// A copy for a fresh first-page load with the given term.
  ///
  /// Clears the rows and the error together: a new search that kept the previous
  /// rows would show results for a term the user no longer has typed.
  IamFlutterMobileOrganizationState reloading(String term) {
    return IamFlutterMobileOrganizationState(
      search: term,
      status: IamFlutterMobileOrganizationStatus.loading,
    );
  }

  /// A copy that appends one page.
  IamFlutterMobileOrganizationState appended(
    List<IamFlutterMobileOrganizationRow> page,
    bool more,
  ) {
    return copyWith(
      hasMore: more,
      items: <IamFlutterMobileOrganizationRow>[...items, ...page],
      loadingMore: false,
      status: IamFlutterMobileOrganizationStatus.ready,
    );
  }

  /// A copy that records a failure, keeping the rows already loaded.
  IamFlutterMobileOrganizationState failed(String message) {
    return IamFlutterMobileOrganizationState(
      errorMessage: message,
      hasMore: hasMore,
      items: items,
      search: search,
      status: items.isEmpty
          ? IamFlutterMobileOrganizationStatus.error
          : IamFlutterMobileOrganizationStatus.ready,
    );
  }
}
