// SDKWORK-IAM-FLUTTER-TENANT: authored controller.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_tenant`.
 *
 * Controllers call services and emit immutable state. They never construct SDK
 * clients, never read runtime configuration and never call platform plugins
 * (section 5).
 */

import '../services/tenant_service.dart';
import '../state/tenant_state.dart';

/// Presentation controller of the `tenant` capability.
class IamFlutterMobileTenantController {
  IamFlutterMobileTenantController({IamFlutterMobileTenantService? service})
      : _service = service ?? const IamFlutterMobileTenantService();

  final IamFlutterMobileTenantService _service;
  final List<void Function(IamFlutterMobileTenantState)> _listeners =
      <void Function(IamFlutterMobileTenantState)>[];

  IamFlutterMobileTenantState _state = const IamFlutterMobileTenantState();

  /// Bumped per load so a slow first answer cannot overwrite a newer one.
  int _requestId = 0;

  /// Current state.
  IamFlutterMobileTenantState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileTenantState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileTenantState next) {
    _state = next;
    for (final void Function(IamFlutterMobileTenantState) listener
        in List<void Function(IamFlutterMobileTenantState)>.of(_listeners)) {
      listener(next);
    }
  }

  /// Loads the overview and emits loading, ready or error.
  ///
  /// The failure is *not* rethrown: the screen renders [IamFlutterMobileTenantState.errorMessage],
  /// and a caller that awaits this method should never need a try/catch around a
  /// render-triggered load.
  Future<void> load() async {
    final int requestId = _requestId + 1;
    _requestId = requestId;
    _emit(_state.asLoading());
    try {
      final IamFlutterMobileTenantOverview overview = await _service.loadOverview();
      if (requestId != _requestId) return;
      _emit(_state.loaded(overview));
    } catch (error) {
      if (requestId != _requestId) return;
      _emit(_state.failed(error is StateError ? error.message : '$error'));
    }
  }

  /// Resolves the cross-client route id for a physical Flutter location.
  String? routeIdForPath(String path) => _service.routeIdForPath(path);
}
