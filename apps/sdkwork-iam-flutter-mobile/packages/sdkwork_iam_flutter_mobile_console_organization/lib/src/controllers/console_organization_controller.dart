// SDKWORK-IAM-FLUTTER-CONSOLE-ORGANIZATION: authored controller.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_console_organization`.
 *
 * Controllers call services and emit immutable state. They never construct SDK clients,
 * never read runtime configuration and never call platform plugins (section 5).
 */

import '../services/console_organization_service.dart';
import '../state/console_organization_state.dart';

/// Presentation controller of the `console_organization` capability.
class IamFlutterMobileConsoleOrganizationController {
  IamFlutterMobileConsoleOrganizationController({
    IamFlutterMobileConsoleOrganizationService? service,
  }) : _service = service ?? const IamFlutterMobileConsoleOrganizationService();

  final IamFlutterMobileConsoleOrganizationService _service;
  final List<void Function(IamFlutterMobileConsoleOrganizationState)> _listeners =
      <void Function(IamFlutterMobileConsoleOrganizationState)>[];

  IamFlutterMobileConsoleOrganizationState _state = const IamFlutterMobileConsoleOrganizationState();

  /// Page size of one request.
  static const int pageSize = 20;

  /// Index of the next page to request.
  int _nextPage = 0;

  /// Bumped per first-page load so a slow answer cannot overwrite a newer search.
  int _requestId = 0;

  /// Current state.
  IamFlutterMobileConsoleOrganizationState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileConsoleOrganizationState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileConsoleOrganizationState next) {
    _state = next;
    for (final void Function(IamFlutterMobileConsoleOrganizationState) listener
        in List<void Function(IamFlutterMobileConsoleOrganizationState)>.of(_listeners)) {
      listener(next);
    }
  }

  /// Loads the first page for [search], replacing whatever is displayed.
  Future<void> load({String search = ''}) async {
    final int requestId = _requestId + 1;
    _requestId = requestId;
    _nextPage = 0;
    _emit(_state.reloading(search.trim()));
    try {
      final IamFlutterMobileConsoleOrganizationPage page = await _service.fetchPage(
        page: 0,
        pageSize: pageSize,
        q: search.trim().isEmpty ? null : search.trim(),
      );
      if (requestId != _requestId) return;
      _nextPage = 1;
      _emit(
        _state.reloading(search.trim()).copyWith(
              hasMore: page.hasMore,
              items: page.items,
              status: IamFlutterMobileConsoleOrganizationStatus.ready,
            ),
      );
    } catch (error) {
      if (requestId != _requestId) return;
      _emit(_state.reloading(search.trim()).failed(_describe(error)));
    }
  }

  /// Appends the next page, keeping the rows already on screen.
  Future<void> loadMore() async {
    if (_state.loadingMore || !_state.hasMore) return;
    final int requestId = _requestId;
    _emit(_state.copyWith(loadingMore: true, errorMessage: null));
    try {
      final IamFlutterMobileConsoleOrganizationPage page = await _service.fetchPage(
        page: _nextPage,
        pageSize: pageSize,
        q: _state.search.isEmpty ? null : _state.search,
      );
      if (requestId != _requestId) return;
      _nextPage += 1;
      _emit(
        _state.copyWith(
          hasMore: page.hasMore,
          items: <IamFlutterMobileConsoleOrganizationRow>[..._state.items, ...page.items],
          loadingMore: false,
          status: IamFlutterMobileConsoleOrganizationStatus.ready,
        ),
      );
    } catch (error) {
      if (requestId != _requestId) return;
      // A failed next page keeps the rows the operator already has.
      _emit(_state.copyWith(loadingMore: false).failed(_describe(error)));
    }
  }

  /// Renders a thrown value as user-safe text.
  String _describe(Object error) => error is StateError ? error.message : '$error';

  /// Resolves the cross-client route id for a physical Flutter location.
  String? routeIdForPath(String path) => _service.routeIdForPath(path);
}
