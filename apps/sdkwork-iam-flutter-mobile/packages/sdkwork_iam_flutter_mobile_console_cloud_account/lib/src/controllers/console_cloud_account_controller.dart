// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_console_cloud_account`.
 *
 * Controllers call services and emit immutable state. They never construct SDK
 * clients, never read runtime configuration and never call platform plugins
 * (section 5).
 */

import '../services/console_cloud_account_service.dart';
import '../state/console_cloud_account_state.dart';

/// Presentation controller of the `console_cloud_account` capability.
class IamFlutterMobileConsoleCloudAccountController {
  IamFlutterMobileConsoleCloudAccountController({IamFlutterMobileConsoleCloudAccountService? service})
      : _service = service ?? const IamFlutterMobileConsoleCloudAccountService();

  final IamFlutterMobileConsoleCloudAccountService _service;
  final List<void Function(IamFlutterMobileConsoleCloudAccountState)> _listeners = <void Function(IamFlutterMobileConsoleCloudAccountState)>[];

  IamFlutterMobileConsoleCloudAccountState _state = const IamFlutterMobileConsoleCloudAccountState();

  /// Current state.
  IamFlutterMobileConsoleCloudAccountState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileConsoleCloudAccountState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileConsoleCloudAccountState next) {
    _state = next;
    for (final void Function(IamFlutterMobileConsoleCloudAccountState) listener
        in List<void Function(IamFlutterMobileConsoleCloudAccountState)>.of(_listeners)) {
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
