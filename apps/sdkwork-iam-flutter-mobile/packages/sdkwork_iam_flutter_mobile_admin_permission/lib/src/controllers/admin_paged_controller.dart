// SDKWORK-IAM-FLUTTER-ADMIN-PERMISSION: authored generic paged controller.
/**
 * Paged catalog controller shared by the permission-family lists.
 *
 * The fetch step is injected as a function so each catalog supplies its own service call
 * without this class knowing which resource it reads.
 */

import '../state/admin_paged_state.dart';

/// One page as the paged controller consumes it.
class IamFlutterMobileAdminPagedPage<T> {
  const IamFlutterMobileAdminPagedPage({
    this.items = const <Never>[],
    this.hasMore = false,
  });

  /// Records of this page.
  final List<T> items;

  /// Whether the server reported another page.
  final bool hasMore;
}

/// Fetches one page of a catalog.
typedef IamFlutterMobileAdminPagedFetch<T> = Future<IamFlutterMobileAdminPagedPage<T>> Function({
  required int page,
  required int pageSize,
  String? q,
});

/// Presentation controller of one paged admin catalog.
class IamFlutterMobileAdminPagedController<T> {
  IamFlutterMobileAdminPagedController({required IamFlutterMobileAdminPagedFetch<T> fetch})
      : _fetch = fetch;

  final IamFlutterMobileAdminPagedFetch<T> _fetch;
  final List<void Function(IamFlutterMobileAdminPagedState<T>)> _listeners =
      <void Function(IamFlutterMobileAdminPagedState<T>)>[];

  /// A non-const instance: `const IamFlutterMobileAdminPagedState<T>()` is not allowed
  /// because a constant creation cannot take a type parameter.
  IamFlutterMobileAdminPagedState<T> _state = IamFlutterMobileAdminPagedState<T>();

  /// Page size of one request.
  static const int pageSize = 20;

  /// Index of the next page to request.
  int _nextPage = 0;

  /// Bumped per first-page load so a slow answer cannot overwrite a newer search.
  int _requestId = 0;

  /// Current state.
  IamFlutterMobileAdminPagedState<T> get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileAdminPagedState<T>) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileAdminPagedState<T> next) {
    _state = next;
    for (final void Function(IamFlutterMobileAdminPagedState<T>) listener
        in List<void Function(IamFlutterMobileAdminPagedState<T>)>.of(_listeners)) {
      listener(next);
    }
  }

  /// Loads the first page for [search], replacing whatever is displayed.
  Future<void> load({String search = ''}) async {
    final int requestId = _requestId + 1;
    _requestId = requestId;
    _nextPage = 0;
    final String term = search.trim();
    _emit(_state.reloading(term));
    try {
      final IamFlutterMobileAdminPagedPage<T> page = await _fetch(
        page: 0,
        pageSize: pageSize,
        q: term.isEmpty ? null : term,
      );
      if (requestId != _requestId) return;
      _nextPage = 1;
      _emit(
        _state.reloading(term).copyWith(
              hasMore: page.hasMore,
              items: page.items,
              status: IamFlutterMobileAdminPagedStatus.ready,
            ),
      );
    } catch (error) {
      if (requestId != _requestId) return;
      _emit(_state.reloading(term).failed(_describe(error)));
    }
  }

  /// Appends the next page, keeping the rows already on screen.
  Future<void> loadMore() async {
    if (_state.loadingMore || !_state.hasMore) return;
    final int requestId = _requestId;
    _emit(_state.copyWith(loadingMore: true, errorMessage: null));
    try {
      final IamFlutterMobileAdminPagedPage<T> page = await _fetch(
        page: _nextPage,
        pageSize: pageSize,
        q: _state.search.isEmpty ? null : _state.search,
      );
      if (requestId != _requestId) return;
      _nextPage += 1;
      _emit(
        _state.copyWith(
          hasMore: page.hasMore,
          items: <T>[..._state.items, ...page.items],
          loadingMore: false,
          status: IamFlutterMobileAdminPagedStatus.ready,
        ),
      );
    } catch (error) {
      if (requestId != _requestId) return;
      // A failed next page keeps the rows the operator already has.
      _emit(_state.copyWith(loadingMore: false).failed(_describe(error)));
    }
  }

  /// Renders a thrown value as user-safe text.
  String _describe(Object error) => error is StateError ? error.message : '$error';
}
