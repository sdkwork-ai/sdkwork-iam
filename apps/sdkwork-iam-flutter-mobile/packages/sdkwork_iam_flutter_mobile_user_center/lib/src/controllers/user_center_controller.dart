// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_user_center`.
 *
 * Controllers call services and emit immutable state. They never construct SDK
 * clients, never read runtime configuration and never call platform plugins
 * (section 5).
 */

import '../services/user_center_service.dart';
import '../state/user_center_state.dart';

/// Presentation controller of the `user_center` capability.
class IamFlutterMobileUserCenterController {
  IamFlutterMobileUserCenterController({IamFlutterMobileUserCenterService? service})
      : _service = service ?? const IamFlutterMobileUserCenterService();

  final IamFlutterMobileUserCenterService _service;
  final List<void Function(IamFlutterMobileUserCenterState)> _listeners = <void Function(IamFlutterMobileUserCenterState)>[];

  IamFlutterMobileUserCenterState _state = const IamFlutterMobileUserCenterState();

  /// Current state.
  IamFlutterMobileUserCenterState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileUserCenterState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileUserCenterState next) {
    _state = next;
    for (final void Function(IamFlutterMobileUserCenterState) listener
        in List<void Function(IamFlutterMobileUserCenterState)>.of(_listeners)) {
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
