// SDKWORK-IAM-FLUTTER-CONSOLE-ORGANIZATION: authored state.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_console_organization`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this root uses
 * controllers, so state objects stay immutable and controllers emit them.
 */

import '../services/console_organization_service.dart';

/// Lifecycle of the console organization list.
enum IamFlutterMobileConsoleOrganizationStatus {
  /// Nothing requested yet.
  idle,

  /// The first page is in flight.
  loading,

  /// Rows are available.
  ready,

  /// The first page failed; [IamFlutterMobileConsoleOrganizationState.errorMessage] says why.
  error,
}

/// State of the `console_organization` capability.
class IamFlutterMobileConsoleOrganizationState {
  const IamFlutterMobileConsoleOrganizationState({
    this.status = IamFlutterMobileConsoleOrganizationStatus.idle,
    this.items = const <IamFlutterMobileConsoleOrganizationRow>[],
    this.hasMore = false,
    this.loadingMore = false,
    this.errorMessage,
    this.search = '',
  });

  /// Current lifecycle stage.
  final IamFlutterMobileConsoleOrganizationStatus status;

  /// Rows loaded so far.
  final List<IamFlutterMobileConsoleOrganizationRow> items;

  /// Whether the server reported another page.
  final bool hasMore;

  /// True while a follow-up page is in flight.
  final bool loadingMore;

  /// User-safe failure text.
  final String? errorMessage;

  /// Current server-side search term.
  final String search;

  /// A copy that keeps every field.
  IamFlutterMobileConsoleOrganizationState copyWith({
    IamFlutterMobileConsoleOrganizationStatus? status,
    List<IamFlutterMobileConsoleOrganizationRow>? items,
    bool? hasMore,
    bool? loadingMore,
    String? errorMessage,
    String? search,
  }) {
    return IamFlutterMobileConsoleOrganizationState(
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
  /// Clears the rows and the error together: a new search that kept the previous rows
  /// would show results for a term the operator no longer has typed.
  IamFlutterMobileConsoleOrganizationState reloading(String term) {
    return IamFlutterMobileConsoleOrganizationState(
      search: term,
      status: IamFlutterMobileConsoleOrganizationStatus.loading,
    );
  }

  /// A copy that records a failure, keeping the rows already loaded.
  IamFlutterMobileConsoleOrganizationState failed(String message) {
    return IamFlutterMobileConsoleOrganizationState(
      errorMessage: message,
      hasMore: hasMore,
      items: items,
      search: search,
      status: items.isEmpty
          ? IamFlutterMobileConsoleOrganizationStatus.error
          : IamFlutterMobileConsoleOrganizationStatus.ready,
    );
  }
}
