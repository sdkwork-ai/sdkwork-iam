// SDKWORK-IAM-FLUTTER-ADMIN-PERMISSION: authored generic paged state.
/**
 * Paged catalog state shared by the permission-family lists.
 *
 * The roles and policies catalogs differ only in their row type, so one generic state keeps
 * the three rules every paged admin list here obeys in one place:
 * - a new search clears the rows and the error together;
 * - a failed next page keeps the rows already read;
 * - a stale answer cannot overwrite a newer search (the controller guards that, but the
 *   state carries the term so the guard has something to compare).
 */

/// Lifecycle of a paged catalog.
enum IamFlutterMobileAdminPagedStatus {
  /// Nothing requested yet.
  idle,

  /// The first page is in flight.
  loading,

  /// Rows are available.
  ready,

  /// The first page failed; [IamFlutterMobileAdminPagedState.errorMessage] says why.
  error,
}

/// State of a paged catalog.
class IamFlutterMobileAdminPagedState<T> {
  const IamFlutterMobileAdminPagedState({
    this.status = IamFlutterMobileAdminPagedStatus.idle,
    this.items = const <Never>[],
    this.hasMore = false,
    this.loadingMore = false,
    this.errorMessage,
    this.search = '',
  });

  /// Current lifecycle stage.
  final IamFlutterMobileAdminPagedStatus status;

  /// Rows loaded so far.
  final List<T> items;

  /// Whether the server reported another page.
  final bool hasMore;

  /// True while a follow-up page is in flight.
  final bool loadingMore;

  /// User-safe failure text.
  final String? errorMessage;

  /// Current server-side search term.
  final String search;

  /// A copy that keeps every field.
  IamFlutterMobileAdminPagedState<T> copyWith({
    IamFlutterMobileAdminPagedStatus? status,
    List<T>? items,
    bool? hasMore,
    bool? loadingMore,
    String? errorMessage,
    String? search,
  }) {
    return IamFlutterMobileAdminPagedState<T>(
      status: status ?? this.status,
      items: items ?? this.items,
      hasMore: hasMore ?? this.hasMore,
      loadingMore: loadingMore ?? this.loadingMore,
      errorMessage: errorMessage ?? this.errorMessage,
      search: search ?? this.search,
    );
  }

  /// A copy for a fresh first-page load with the given term.
  IamFlutterMobileAdminPagedState<T> reloading(String term) {
    return IamFlutterMobileAdminPagedState<T>(
      search: term,
      status: IamFlutterMobileAdminPagedStatus.loading,
    );
  }

  /// A copy that records a failure, keeping the rows already loaded.
  IamFlutterMobileAdminPagedState<T> failed(String message) {
    return IamFlutterMobileAdminPagedState<T>(
      errorMessage: message,
      hasMore: hasMore,
      items: items,
      search: search,
      status: items.isEmpty
          ? IamFlutterMobileAdminPagedStatus.error
          : IamFlutterMobileAdminPagedStatus.ready,
    );
  }
}
