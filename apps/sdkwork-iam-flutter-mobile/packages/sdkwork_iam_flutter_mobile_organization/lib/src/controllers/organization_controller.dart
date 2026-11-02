// SDKWORK-IAM-FLUTTER-ORGANIZATION: authored controller.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_organization`.
 *
 * Controllers call services and emit immutable state. They never construct SDK
 * clients, never read runtime configuration and never call platform plugins
 * (section 5).
 */

import '../services/organization_service.dart';
import '../state/organization_state.dart';

/// Presentation controller of the `organization` capability.
class IamFlutterMobileOrganizationController {
  IamFlutterMobileOrganizationController({IamFlutterMobileOrganizationService? service})
      : _service = service ?? const IamFlutterMobileOrganizationService();

  final IamFlutterMobileOrganizationService _service;
  final List<void Function(IamFlutterMobileOrganizationState)> _listeners =
      <void Function(IamFlutterMobileOrganizationState)>[];

  IamFlutterMobileOrganizationState _state = const IamFlutterMobileOrganizationState();

  /// Page size of one request.
  static const int pageSize = 20;

  /// Index of the next page to request.
  int _nextPage = 0;

  /// Bumped per first-page load so a slow answer cannot overwrite a newer search.
  int _requestId = 0;

  /// Current state.
  IamFlutterMobileOrganizationState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileOrganizationState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileOrganizationState next) {
    _state = next;
    for (final void Function(IamFlutterMobileOrganizationState) listener
        in List<void Function(IamFlutterMobileOrganizationState)>.of(_listeners)) {
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
      final IamFlutterMobileOrganizationPage page = await _service.fetchPage(
        page: 0,
        pageSize: pageSize,
        q: search.trim().isEmpty ? null : search.trim(),
      );
      if (requestId != _requestId) return;
      _nextPage = 1;
      _emit(_state.reloading(search.trim()).appended(page.items, page.hasMore));
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
      final IamFlutterMobileOrganizationPage page = await _service.fetchPage(
        page: _nextPage,
        pageSize: pageSize,
        q: _state.search.isEmpty ? null : _state.search,
      );
      if (requestId != _requestId) return;
      _nextPage += 1;
      _emit(_state.appended(page.items, page.hasMore));
    } catch (error) {
      if (requestId != _requestId) return;
      // A failed next page must not empty the list: the failure is reported on top
      // of the rows the user already has.
      _emit(_state.copyWith(loadingMore: false).failed(_describe(error)));
    }
  }

  /// Renders a thrown value as user-safe text.
  ///
  /// A `StateError` message is authored for people (missing data source, malformed
  /// response), so it is shown as-is; anything else keeps the `Type: message` shape
  /// because losing the type would make a transport failure unreadable.
  String _describe(Object error) => error is StateError ? error.message : '$error';

  /// Resolves the cross-client route id for a physical Flutter location.
  String? routeIdForPath(String path) => _service.routeIdForPath(path);
}
