// SDKWORK-IAM-FLUTTER-CONSOLE-TENANT: authored controller.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_console_tenant`.
 *
 * Controllers call services and emit immutable state. They never construct SDK clients,
 * never read runtime configuration and never call platform plugins (section 5).
 */

import '../services/console_tenant_service.dart';
import '../state/console_tenant_state.dart';

/// Presentation controller of the `console_tenant` capability.
class IamFlutterMobileConsoleTenantController {
  IamFlutterMobileConsoleTenantController({IamFlutterMobileConsoleTenantService? service})
      : _service = service ?? const IamFlutterMobileConsoleTenantService();

  final IamFlutterMobileConsoleTenantService _service;
  final List<void Function(IamFlutterMobileConsoleTenantState)> _listeners =
      <void Function(IamFlutterMobileConsoleTenantState)>[];

  IamFlutterMobileConsoleTenantState _state = const IamFlutterMobileConsoleTenantState();

  /// Page size of one organization request.
  static const int pageSize = 20;

  /// Index of the next organization page.
  int _nextPage = 0;

  /// Bumped per load so a slow answer cannot overwrite a newer one.
  int _requestId = 0;

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

  /// Loads the identity, the policy and the first organization page.
  ///
  /// All three are read together: the identity and the policy are what the operator came
  /// for, and a workspace that showed one without the others would invite a conclusion
  /// from half the facts.
  Future<void> load() async {
    final int requestId = _requestId + 1;
    _requestId = requestId;
    _nextPage = 0;
    _emit(_state.asLoading());
    try {
      final IamFlutterMobileConsoleTenantRuntime runtime = await _service.loadRuntime();
      final IamFlutterMobileConsoleTenantPolicy policy = await _service.loadPolicy();
      final IamFlutterMobileConsoleTenantOrganizationPage page =
          await _service.fetchOrganizationsPage(page: 0, pageSize: pageSize);
      if (requestId != _requestId) return;
      _nextPage = 1;
      _emit(_state.loaded(nextPolicy: policy, nextRuntime: runtime, page: page));
    } catch (error) {
      if (requestId != _requestId) return;
      _emit(_state.failed(_describe(error)));
    }
  }

  /// Appends the next organization page.
  Future<void> loadMore() async {
    if (!_state.hasMore || _state.loadingMore) return;
    final int requestId = _requestId;
    _emit(_state.copyWith(loadingMore: true, errorMessage: null));
    try {
      final IamFlutterMobileConsoleTenantOrganizationPage page =
          await _service.fetchOrganizationsPage(page: _nextPage, pageSize: pageSize);
      if (requestId != _requestId) return;
      _nextPage += 1;
      _emit(
        _state.copyWith(
          hasMore: page.hasMore,
          loadingMore: false,
          organizations: <IamFlutterMobileConsoleTenantOrganization>[
            ..._state.organizations,
            ...page.items,
          ],
          status: IamFlutterMobileConsoleTenantStatus.ready,
        ),
      );
    } catch (error) {
      if (requestId != _requestId) return;
      // A failed next page keeps the organizations already on screen.
      _emit(_state.copyWith(loadingMore: false).failed(_describe(error)));
    }
  }

  /// Renders a thrown value as user-safe text.
  String _describe(Object error) => error is StateError ? error.message : '$error';

  /// Resolves the cross-client route id for a physical Flutter location.
  String? routeIdForPath(String path) => _service.routeIdForPath(path);
}
