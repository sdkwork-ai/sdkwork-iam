// SDKWORK-IAM-FLUTTER-ADMIN-AUDIT: authored controller.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_admin_audit`.
 *
 * Controllers call services and emit immutable state. They never construct SDK clients,
 * never read runtime configuration and never call platform plugins (section 5).
 */

import '../services/admin_audit_service.dart';
import '../state/admin_audit_state.dart';

/// Presentation controller of the `admin_audit` capability.
class IamFlutterMobileAdminAuditController {
  IamFlutterMobileAdminAuditController({IamFlutterMobileAdminAuditService? service})
      : _service = service ?? const IamFlutterMobileAdminAuditService();

  final IamFlutterMobileAdminAuditService _service;
  final List<void Function(IamFlutterMobileAdminAuditState)> _listeners =
      <void Function(IamFlutterMobileAdminAuditState)>[];

  IamFlutterMobileAdminAuditState _state = const IamFlutterMobileAdminAuditState();

  /// Page size of one request.
  static const int pageSize = 20;

  /// Index of the next page to request.
  int _nextPage = 0;

  /// Bumped per first-page load so a slow answer cannot overwrite a newer search.
  int _requestId = 0;

  /// Current state.
  IamFlutterMobileAdminAuditState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileAdminAuditState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileAdminAuditState next) {
    _state = next;
    for (final void Function(IamFlutterMobileAdminAuditState) listener
        in List<void Function(IamFlutterMobileAdminAuditState)>.of(_listeners)) {
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
      final IamFlutterMobileAdminAuditPage page = await _service.fetchPage(
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
              status: IamFlutterMobileAdminAuditStatus.ready,
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
      final IamFlutterMobileAdminAuditPage page = await _service.fetchPage(
        page: _nextPage,
        pageSize: pageSize,
        q: _state.search.isEmpty ? null : _state.search,
      );
      if (requestId != _requestId) return;
      _nextPage += 1;
      _emit(
        _state.copyWith(
          hasMore: page.hasMore,
          items: <IamFlutterMobileAdminAuditEvent>[..._state.items, ...page.items],
          loadingMore: false,
          status: IamFlutterMobileAdminAuditStatus.ready,
        ),
      );
    } catch (error) {
      if (requestId != _requestId) return;
      // A failed next page keeps the events the operator already has.
      _emit(_state.copyWith(loadingMore: false).failed(_describe(error)));
    }
  }

  /// Renders a thrown value as user-safe text.
  String _describe(Object error) => error is StateError ? error.message : '$error';

  /// Resolves the cross-client route id for a physical Flutter location.
  String? routeIdForPath(String path) => _service.routeIdForPath(path);
}
