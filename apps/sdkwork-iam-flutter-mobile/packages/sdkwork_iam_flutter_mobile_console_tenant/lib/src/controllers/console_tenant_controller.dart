// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_console_tenant`.
 *
 * Controllers call services and emit immutable state. They never construct SDK
 * clients, never read runtime configuration and never call platform plugins
 * (section 5).
 */

import '../services/console_tenant_service.dart';
import '../state/console_tenant_state.dart';

/// Presentation controller of the `console_tenant` capability.
class IamFlutterMobileConsoleTenantController {
  IamFlutterMobileConsoleTenantController({IamFlutterMobileConsoleTenantService? service})
      : _service = service ?? const IamFlutterMobileConsoleTenantService();

  final IamFlutterMobileConsoleTenantService _service;
  final List<void Function(IamFlutterMobileConsoleTenantState)> _listeners = <void Function(IamFlutterMobileConsoleTenantState)>[];

  IamFlutterMobileConsoleTenantState _state = const IamFlutterMobileConsoleTenantState();

  /// Current state.
  IamFlutterMobileConsoleTenantState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileConsoleTenantState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileConsoleTenantState next) {
    _state = next;
    for (final void Function(IamFlutterMobileConsoleTenantState) listener
        in List<void Function(IamFlutterMobileConsoleTenantState)>.of(_listeners)) {
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
