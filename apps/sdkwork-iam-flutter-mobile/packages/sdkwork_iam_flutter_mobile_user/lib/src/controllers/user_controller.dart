// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_user`.
 *
 * Controllers call services and emit immutable state. They never construct SDK
 * clients, never read runtime configuration and never call platform plugins
 * (section 5).
 */

import '../services/user_service.dart';
import '../state/user_state.dart';

/// Presentation controller of the `user` capability.
class IamFlutterMobileUserController {
  IamFlutterMobileUserController({IamFlutterMobileUserService? service})
      : _service = service ?? const IamFlutterMobileUserService();

  final IamFlutterMobileUserService _service;
  final List<void Function(IamFlutterMobileUserState)> _listeners = <void Function(IamFlutterMobileUserState)>[];

  IamFlutterMobileUserState _state = const IamFlutterMobileUserState();

  /// Current state.
  IamFlutterMobileUserState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileUserState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileUserState next) {
    _state = next;
    for (final void Function(IamFlutterMobileUserState) listener
        in List<void Function(IamFlutterMobileUserState)>.of(_listeners)) {
      listener(next);
    }
  }

  /// Replaces the displayed records.
  void setItems(List<String> items) {
    _emit(_state.copyWith(items: items, loading: false, errorKey: null));
  }

  /// Marks the capability as loading.
  void setLoading() {
    _emit(_state.copyWith(loading: true, errorKey: null));
  }

  /// Records a user-safe failure.
  void setError(String errorKey) {
    _emit(_state.copyWith(loading: false, errorKey: errorKey));
  }

  /// Resolves the cross-client route id for a physical Flutter location.
  String? routeIdForPath(String path) => _service.routeIdForPath(path);
}
