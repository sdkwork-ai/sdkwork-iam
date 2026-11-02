// SDKWORK-IAM-FLUTTER-CONSOLE-ACCOUNT-BINDING: authored controller.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_console_account_binding`.
 *
 * Controllers call services and emit immutable state. They never construct SDK clients,
 * never read runtime configuration and never call platform plugins (section 5).
 */

import '../services/console_account_binding_service.dart';
import '../state/console_account_binding_state.dart';

/// Presentation controller of the `console_account_binding` capability.
class IamFlutterMobileConsoleAccountBindingController {
  IamFlutterMobileConsoleAccountBindingController({
    IamFlutterMobileConsoleAccountBindingService? service,
  }) : _service = service ?? const IamFlutterMobileConsoleAccountBindingService();

  final IamFlutterMobileConsoleAccountBindingService _service;
  final List<void Function(IamFlutterMobileConsoleAccountBindingState)> _listeners =
      <void Function(IamFlutterMobileConsoleAccountBindingState)>[];

  IamFlutterMobileConsoleAccountBindingState _state =
      const IamFlutterMobileConsoleAccountBindingState();

  /// Page size of one request.
  static const int pageSize = 20;

  /// Bumped per load so a slow answer cannot overwrite a newer one.
  int _requestId = 0;

  /// Current state.
  IamFlutterMobileConsoleAccountBindingState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileConsoleAccountBindingState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileConsoleAccountBindingState next) {
    _state = next;
    for (final void Function(IamFlutterMobileConsoleAccountBindingState) listener
        in List<void Function(IamFlutterMobileConsoleAccountBindingState)>.of(_listeners)) {
      listener(next);
    }
  }

  /// Loads the policy and the first page of links.
  ///
  /// Both are read together: the policy decides whether the removal action exists, so
  /// rendering links without it would flash an action the tenant forbids.
  Future<void> load() async {
    final int requestId = _requestId + 1;
    _requestId = requestId;
    _emit(_state.asLoading());
    try {
      final IamFlutterMobileConsoleAccountBindingPolicy policy = await _service.loadPolicy();
      final IamFlutterMobileConsoleAccountLinkPage page =
          await _service.fetchLinksPage(page: 0, pageSize: pageSize);
      if (requestId != _requestId) return;
      _emit(_state.loaded(nextLinks: page.items, nextPolicy: policy));
    } catch (error) {
      if (requestId != _requestId) return;
      _emit(_state.failed(_describe(error)));
    }
  }

  /// Removes one linked identity.
  ///
  /// The row is dropped only after the server accepts: an optimistic removal that failed
  /// would leave the operator believing a sign-in method is gone while it still works.
  Future<bool> unlink(String accountLinkId) async {
    final String id = accountLinkId.trim();
    if (id.isEmpty || _state.unlinkingId != null) return false;
    _emit(_state.copyWith(errorMessage: null, unlinkingId: id));
    try {
      await _service.unlink(id);
      _emit(
        _state.copyWith(
          links: _state.links
              .where((IamFlutterMobileConsoleAccountLink link) => link.accountLinkId != id)
              .toList(growable: false),
          status: IamFlutterMobileConsoleAccountBindingStatus.ready,
        ).copyWith(unlinkingId: null),
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
