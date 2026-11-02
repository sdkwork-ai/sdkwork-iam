// SDKWORK-IAM-FLUTTER-ADMIN-ACCOUNT-BINDING: authored controller.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_admin_account_binding`.
 *
 * Controllers call services and emit immutable state. They never construct SDK clients,
 * never read runtime configuration and never call platform plugins (section 5).
 */

import '../services/admin_account_binding_service.dart';
import '../state/admin_account_binding_state.dart';

/// Presentation controller of the `admin_account_binding` capability.
class IamFlutterMobileAdminAccountBindingController {
  IamFlutterMobileAdminAccountBindingController({
    IamFlutterMobileAdminAccountBindingService? service,
  }) : _service = service ?? const IamFlutterMobileAdminAccountBindingService();

  final IamFlutterMobileAdminAccountBindingService _service;
  final List<void Function(IamFlutterMobileAdminAccountBindingState)> _listeners =
      <void Function(IamFlutterMobileAdminAccountBindingState)>[];

  IamFlutterMobileAdminAccountBindingState _state =
      const IamFlutterMobileAdminAccountBindingState();

  /// Page size of one request.
  static const int pageSize = 20;

  /// Index of the next page to request.
  int _nextPage = 0;

  /// Bumped per first-page load so a slow answer cannot overwrite a newer search.
  int _requestId = 0;

  /// Current state.
  IamFlutterMobileAdminAccountBindingState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileAdminAccountBindingState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileAdminAccountBindingState next) {
    _state = next;
    for (final void Function(IamFlutterMobileAdminAccountBindingState) listener
        in List<void Function(IamFlutterMobileAdminAccountBindingState)>.of(_listeners)) {
      listener(next);
    }
  }

  /// Loads the tenant policy independently of the link list.
  ///
  /// The policy is the region an operator must trust: it decides whether users can do
  /// anything themselves. A failed policy read leaves the last one on screen and reports why,
  /// rather than silently showing "everything off".
  Future<void> loadPolicy() async {
    try {
      final IamFlutterMobileAdminAccountBindingPolicy policy = await _service.loadPolicy();
      _emit(_state.copyWith(policy: policy));
    } catch (error) {
      _emit(_state.copyWith(errorMessage: _describe(error)));
    }
  }

  /// Writes the tenant policy, replacing the displayed one only after the server accepts.
  Future<bool> savePolicy(
    IamFlutterMobileAdminAccountBindingPolicy policy, {
    bool allowAllDisabled = false,
  }) async {
    if (_state.savingPolicy) return false;
    _emit(_state.copyWith(errorMessage: null, policySaved: false, savingPolicy: true));
    try {
      await _service.savePolicy(policy, allowAllDisabled: allowAllDisabled);
      _emit(_state.copyWith(policy: policy, policySaved: true, savingPolicy: false));
      return true;
    } catch (error) {
      _emit(_state.copyWith(errorMessage: _describe(error), savingPolicy: false));
      return false;
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
      final IamFlutterMobileAdminAccountLinkPage page = await _service.fetchLinksPage(
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
              status: IamFlutterMobileAdminAccountBindingStatus.ready,
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
      final IamFlutterMobileAdminAccountLinkPage page = await _service.fetchLinksPage(
        page: _nextPage,
        pageSize: pageSize,
        q: _state.search.isEmpty ? null : _state.search,
      );
      if (requestId != _requestId) return;
      _nextPage += 1;
      _emit(
        _state.copyWith(
          hasMore: page.hasMore,
          items: <IamFlutterMobileAdminAccountLinkRow>[..._state.items, ...page.items],
          loadingMore: false,
          status: IamFlutterMobileAdminAccountBindingStatus.ready,
        ),
      );
    } catch (error) {
      if (requestId != _requestId) return;
      // A failed next page keeps the links the operator already has.
      _emit(_state.copyWith(loadingMore: false).failed(_describe(error)));
    }
  }

  /// Renders a thrown value as user-safe text.
  String _describe(Object error) => error is StateError ? error.message : '$error';

  /// Resolves the cross-client route id for a physical Flutter location.
  String? routeIdForPath(String path) => _service.routeIdForPath(path);
}
