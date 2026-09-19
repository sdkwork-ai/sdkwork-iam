// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_admin_tenant`.
 *
 * Controllers call services and emit immutable state. They never construct SDK
 * clients, never read runtime configuration and never call platform plugins
 * (section 5).
 */

import '../services/admin_tenant_service.dart';
import '../state/admin_tenant_state.dart';

/// Presentation controller of the `admin_tenant` capability.
class IamFlutterMobileAdminTenantController {
  IamFlutterMobileAdminTenantController({IamFlutterMobileAdminTenantService? service})
      : _service = service ?? const IamFlutterMobileAdminTenantService();

  final IamFlutterMobileAdminTenantService _service;
  final List<void Function(IamFlutterMobileAdminTenantState)> _listeners = <void Function(IamFlutterMobileAdminTenantState)>[];

  IamFlutterMobileAdminTenantState _state = const IamFlutterMobileAdminTenantState();

  /// Current state.
  IamFlutterMobileAdminTenantState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileAdminTenantState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileAdminTenantState next) {
    _state = next;
    for (final void Function(IamFlutterMobileAdminTenantState) listener
        in List<void Function(IamFlutterMobileAdminTenantState)>.of(_listeners)) {
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
