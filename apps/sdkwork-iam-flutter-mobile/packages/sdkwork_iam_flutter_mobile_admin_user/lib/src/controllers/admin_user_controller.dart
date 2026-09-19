// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_admin_user`.
 *
 * Controllers call services and emit immutable state. They never construct SDK
 * clients, never read runtime configuration and never call platform plugins
 * (section 5).
 */

import '../services/admin_user_service.dart';
import '../state/admin_user_state.dart';

/// Presentation controller of the `admin_user` capability.
class IamFlutterMobileAdminUserController {
  IamFlutterMobileAdminUserController({IamFlutterMobileAdminUserService? service})
      : _service = service ?? const IamFlutterMobileAdminUserService();

  final IamFlutterMobileAdminUserService _service;
  final List<void Function(IamFlutterMobileAdminUserState)> _listeners = <void Function(IamFlutterMobileAdminUserState)>[];

  IamFlutterMobileAdminUserState _state = const IamFlutterMobileAdminUserState();

  /// Current state.
  IamFlutterMobileAdminUserState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileAdminUserState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileAdminUserState next) {
    _state = next;
    for (final void Function(IamFlutterMobileAdminUserState) listener
        in List<void Function(IamFlutterMobileAdminUserState)>.of(_listeners)) {
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
