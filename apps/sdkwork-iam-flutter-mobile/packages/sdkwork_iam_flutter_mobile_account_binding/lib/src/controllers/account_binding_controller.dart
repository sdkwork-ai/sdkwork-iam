// SDKWORK-IAM-FLUTTER-ACCOUNT-BINDING: authored controller.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_account_binding`.
 *
 * Controllers call services and emit immutable state. They never construct SDK
 * clients, never read runtime configuration and never call platform plugins
 * (section 5).
 */

import '../services/account_binding_service.dart';
import '../state/account_binding_state.dart';

/// Presentation controller of the `account_binding` capability.
class IamFlutterMobileAccountBindingController {
  IamFlutterMobileAccountBindingController({IamFlutterMobileAccountBindingService? service})
      : _service = service ?? const IamFlutterMobileAccountBindingService();

  final IamFlutterMobileAccountBindingService _service;
  final List<void Function(IamFlutterMobileAccountBindingState)> _listeners =
      <void Function(IamFlutterMobileAccountBindingState)>[];

  IamFlutterMobileAccountBindingState _state = const IamFlutterMobileAccountBindingState();

  /// Page size of one request.
  static const int pageSize = 20;

  /// Index of the next page to request.
  int _nextPage = 0;

  /// Bumped per first load so a slow answer cannot overwrite a newer one.
  int _requestId = 0;

  /// Current state.
  IamFlutterMobileAccountBindingState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileAccountBindingState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileAccountBindingState next) {
    _state = next;
    for (final void Function(IamFlutterMobileAccountBindingState) listener
        in List<void Function(IamFlutterMobileAccountBindingState)>.of(_listeners)) {
      listener(next);
    }
  }

  /// Loads the policy and the first page of links.
  ///
  /// Both are read together: the policy decides whether the unlink action exists,
  /// so rendering links without it would flash an action the tenant forbids.
  Future<void> load() async {
    final int requestId = _requestId + 1;
    _requestId = requestId;
    _nextPage = 0;
    _emit(_state.asLoading());
    try {
      final IamFlutterMobileAccountBindingPolicy policy = await _service.loadPolicy();
      final IamFlutterMobileAccountLinkPage page =
          await _service.fetchLinksPage(page: 0, pageSize: pageSize);
      if (requestId != _requestId) return;
      _nextPage = 1;
      _emit(_state.loaded(nextPolicy: policy, nextLinks: page.items, more: page.hasMore));
    } catch (error) {
      if (requestId != _requestId) return;
      _emit(_state.failed(_describe(error)));
    }
  }

  /// Appends the next page of links.
  Future<void> loadMore() async {
    if (!_state.hasMore || _state.status != IamFlutterMobileAccountBindingStatus.ready) return;
    final int requestId = _requestId;
    try {
      final IamFlutterMobileAccountLinkPage page =
          await _service.fetchLinksPage(page: _nextPage, pageSize: pageSize);
      if (requestId != _requestId) return;
      _nextPage += 1;
      _emit(
        _state.loaded(
          more: page.hasMore,
          nextLinks: <IamFlutterMobileAccountLink>[..._state.links, ...page.items],
          nextPolicy: _state.policy,
        ),
      );
    } catch (error) {
      if (requestId != _requestId) return;
      _emit(_state.failed(_describe(error)));
    }
  }

  /// Removes one linked identity.
  ///
  /// The row is dropped only after the server accepts: an optimistic removal that
  /// failed would leave the user believing a sign-in method is gone while it still
  /// works.
  Future<bool> unlink(String accountLinkId) async {
    final String id = accountLinkId.trim();
    if (id.isEmpty || _state.unlinkingId != null) return false;
    _emit(_state.copyWith(unlinkingId: id, errorMessage: null));
    try {
      await _service.unlink(id);
      _emit(
        _state
            .copyWith(
              links: _state.links
                  .where((IamFlutterMobileAccountLink link) => link.accountLinkId != id)
                  .toList(growable: false),
              status: IamFlutterMobileAccountBindingStatus.ready,
            )
            .copyWith(unlinkingId: null),
      );
      return true;
    } catch (error) {
      _emit(_state.copyWith(unlinkingId: null).failed(_describe(error)));
      return false;
    }
  }

  /// Renders a thrown value as user-safe text.
  String _describe(Object error) => error is StateError ? error.message : '$error';

  /// Resolves the cross-client route id for a physical Flutter location.
  String? routeIdForPath(String path) => _service.routeIdForPath(path);
}
