// SDKWORK-IAM-FLUTTER-CONSOLE-USER-CENTER: authored controller.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_console_user_center`.
 *
 * Controllers call services and emit immutable state. They never construct SDK clients,
 * never read runtime configuration and never call platform plugins (section 5).
 */

import '../services/console_user_center_service.dart';
import '../state/console_user_center_state.dart';

/// Presentation controller of the `console_user_center` capability.
class IamFlutterMobileConsoleUserCenterController {
  IamFlutterMobileConsoleUserCenterController({
    IamFlutterMobileConsoleUserCenterService? service,
  }) : _service = service ?? const IamFlutterMobileConsoleUserCenterService();

  final IamFlutterMobileConsoleUserCenterService _service;
  final List<void Function(IamFlutterMobileConsoleUserCenterState)> _listeners =
      <void Function(IamFlutterMobileConsoleUserCenterState)>[];

  IamFlutterMobileConsoleUserCenterState _state = const IamFlutterMobileConsoleUserCenterState();

  /// Bumped per load so a slow answer cannot overwrite a newer one.
  int _requestId = 0;

  /// Current state.
  IamFlutterMobileConsoleUserCenterState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileConsoleUserCenterState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileConsoleUserCenterState next) {
    _state = next;
    for (final void Function(IamFlutterMobileConsoleUserCenterState) listener
        in List<void Function(IamFlutterMobileConsoleUserCenterState)>.of(_listeners)) {
      listener(next);
    }
  }

  /// Loads the account and the verification policy.
  ///
  /// The policy is loaded through the service, which treats an unpublished policy as
  /// "nothing required": the account is why the operator opened the screen, and losing it
  /// because a policy resource is absent would be the wrong trade.
  Future<void> load() async {
    final int requestId = _requestId + 1;
    _requestId = requestId;
    _emit(_state.asLoading());
    try {
      final IamFlutterMobileConsoleUserAccount account = await _service.loadAccount();
      final IamFlutterMobileConsoleUserVerificationPolicy policy =
          await _service.loadVerificationPolicy();
      if (requestId != _requestId) return;
      _emit(_state.loaded(nextAccount: account, nextPolicy: policy));
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
