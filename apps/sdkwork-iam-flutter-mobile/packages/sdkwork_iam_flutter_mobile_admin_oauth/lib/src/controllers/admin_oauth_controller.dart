// SDKWORK-IAM-FLUTTER-ADMIN-OAUTH: authored controller.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_admin_oauth`.
 *
 * Controllers call services and emit immutable state. They never construct SDK clients,
 * never read runtime configuration and never call platform plugins (section 5).
 */

import '../services/admin_oauth_service.dart';
import '../state/admin_oauth_state.dart';

/// Presentation controller of the `admin_oauth` capability.
class IamFlutterMobileAdminOAuthController {
  IamFlutterMobileAdminOAuthController({IamFlutterMobileAdminOAuthService? service})
      : _service = service ?? const IamFlutterMobileAdminOAuthService();

  final IamFlutterMobileAdminOAuthService _service;
  final List<void Function(IamFlutterMobileAdminOAuthState)> _listeners =
      <void Function(IamFlutterMobileAdminOAuthState)>[];

  IamFlutterMobileAdminOAuthState _state = const IamFlutterMobileAdminOAuthState();

  /// Page size of one request.
  static const int pageSize = 20;

  /// Index of the next page to request.
  int _nextPage = 0;

  /// Bumped per first-page load so a slow answer cannot overwrite a newer search.
  int _requestId = 0;

  /// Current state.
  IamFlutterMobileAdminOAuthState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileAdminOAuthState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileAdminOAuthState next) {
    _state = next;
    for (final void Function(IamFlutterMobileAdminOAuthState) listener
        in List<void Function(IamFlutterMobileAdminOAuthState)>.of(_listeners)) {
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
      final IamFlutterMobileAdminOAuthProviderPage page = await _service.fetchProvidersPage(
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
              status: IamFlutterMobileAdminOAuthStatus.ready,
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
      final IamFlutterMobileAdminOAuthProviderPage page = await _service.fetchProvidersPage(
        page: _nextPage,
        pageSize: pageSize,
        q: _state.search.isEmpty ? null : _state.search,
      );
      if (requestId != _requestId) return;
      _nextPage += 1;
      _emit(
        _state.copyWith(
          hasMore: page.hasMore,
          items: <IamFlutterMobileAdminOAuthProviderRow>[..._state.items, ...page.items],
          loadingMore: false,
          status: IamFlutterMobileAdminOAuthStatus.ready,
        ),
      );
    } catch (error) {
      if (requestId != _requestId) return;
      // A failed next page keeps the providers the operator already has.
      _emit(_state.copyWith(loadingMore: false).failed(_describe(error)));
    }
  }

  /// Renders a thrown value as user-safe text.
  String _describe(Object error) => error is StateError ? error.message : '$error';

  /// Resolves the cross-client route id for a physical Flutter location.
  String? routeIdForPath(String path) => _service.routeIdForPath(path);
}
