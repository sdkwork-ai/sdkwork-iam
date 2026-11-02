// SDKWORK-IAM-FLUTTER-ADMIN-ORGANIZATION: authored controller.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_admin_organization`.
 *
 * Controllers call services and emit immutable state. They never construct SDK clients,
 * never read runtime configuration and never call platform plugins (section 5).
 */

import '../services/admin_organization_service.dart';
import '../state/admin_organization_state.dart';

/// Presentation controller of the `admin_organization` capability.
class IamFlutterMobileAdminOrganizationController {
  IamFlutterMobileAdminOrganizationController({
    IamFlutterMobileAdminOrganizationService? service,
  }) : _service = service ?? const IamFlutterMobileAdminOrganizationService();

  final IamFlutterMobileAdminOrganizationService _service;
  final List<void Function(IamFlutterMobileAdminOrganizationState)> _listeners =
      <void Function(IamFlutterMobileAdminOrganizationState)>[];

  IamFlutterMobileAdminOrganizationState _state =
      const IamFlutterMobileAdminOrganizationState();

  /// Bumped per load so a slow answer cannot overwrite a newer one.
  int _requestId = 0;

  /// Current state.
  IamFlutterMobileAdminOrganizationState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileAdminOrganizationState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileAdminOrganizationState next) {
    _state = next;
    for (final void Function(IamFlutterMobileAdminOrganizationState) listener
        in List<void Function(IamFlutterMobileAdminOrganizationState)>.of(_listeners)) {
      listener(next);
    }
  }

  /// Loads the hierarchy and flattens it for display.
  Future<void> load() async {
    final int requestId = _requestId + 1;
    _requestId = requestId;
    _emit(_state.asLoading());
    try {
      final List<IamFlutterMobileAdminOrganizationNode> nodes = await _service.loadTree();
      if (requestId != _requestId) return;
      _emit(_state.loaded(IamFlutterMobileAdminOrganizationService.flatten(nodes)));
    } catch (error) {
      if (requestId != _requestId) return;
      _emit(_state.failed(_describe(error)));
    }
  }

  /// Renders a thrown value as user-safe text.
  String _describe(Object error) => error is StateError ? error.message : '$error';

  /// Resolves the cross-client route id for a physical Flutter location.
  String? routeIdForPath(String path) => _service.routeIdForPath(path);
}
