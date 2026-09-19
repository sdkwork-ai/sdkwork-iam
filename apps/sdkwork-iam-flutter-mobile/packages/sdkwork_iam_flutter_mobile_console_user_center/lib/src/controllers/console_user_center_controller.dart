// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_console_user_center`.
 *
 * Controllers call services and emit immutable state. They never construct SDK
 * clients, never read runtime configuration and never call platform plugins
 * (section 5).
 */

import '../services/console_user_center_service.dart';
import '../state/console_user_center_state.dart';

/// Presentation controller of the `console_user_center` capability.
class IamFlutterMobileConsoleUserCenterController {
  IamFlutterMobileConsoleUserCenterController({IamFlutterMobileConsoleUserCenterService? service})
      : _service = service ?? const IamFlutterMobileConsoleUserCenterService();

  final IamFlutterMobileConsoleUserCenterService _service;
  final List<void Function(IamFlutterMobileConsoleUserCenterState)> _listeners = <void Function(IamFlutterMobileConsoleUserCenterState)>[];

  IamFlutterMobileConsoleUserCenterState _state = const IamFlutterMobileConsoleUserCenterState();

  /// Current state.
  IamFlutterMobileConsoleUserCenterState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileConsoleUserCenterState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileConsoleUserCenterState next) {
    _state = next;
    for (final void Function(IamFlutterMobileConsoleUserCenterState) listener
        in List<void Function(IamFlutterMobileConsoleUserCenterState)>.of(_listeners)) {
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
