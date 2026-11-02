// SDKWORK-IAM-FLUTTER-AUTH: authored controller.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_auth`.
 *
 * Controllers call services and emit immutable state. They never construct SDK
 * clients, never read runtime configuration and never call platform plugins
 * (section 5).
 */

import '../services/auth_service.dart';
import '../state/auth_state.dart';

/// Presentation controller of the `auth` capability.
class IamFlutterMobileAuthController {
  IamFlutterMobileAuthController({IamFlutterMobileAuthService? service})
      : _service = service ?? const IamFlutterMobileAuthService() {
    if (_service.isAuthenticated) {
      final IamFlutterMobileAuthSession? session = _service.currentSession;
      if (session != null) {
        _state = _state.signedIn(session);
      }
    }
  }

  final IamFlutterMobileAuthService _service;
  final List<void Function(IamFlutterMobileAuthState)> _listeners =
      <void Function(IamFlutterMobileAuthState)>[];

  IamFlutterMobileAuthState _state = const IamFlutterMobileAuthState();

  /// Current state.
  IamFlutterMobileAuthState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileAuthState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileAuthState next) {
    _state = next;
    for (final void Function(IamFlutterMobileAuthState) listener
        in List<void Function(IamFlutterMobileAuthState)>.of(_listeners)) {
      listener(next);
    }
  }

  /// Signs in with a username and password.
  ///
  /// The failure is recorded in state rather than rethrown: the screen renders
  /// [IamFlutterMobileAuthState.errorMessage], so a form submit needs no try/catch.
  Future<bool> signIn({required String password, required String username}) async {
    _emit(_state.asSubmitting());
    try {
      final IamFlutterMobileAuthSession session =
          await _service.signInWithPassword(password: password, username: username);
      _emit(_state.signedIn(session));
      return true;
    } catch (error) {
      _emit(_state.failed('$error'));
      return false;
    }
  }

  /// Signs out and returns to the signed-out state.
  Future<void> signOut() async {
    await _service.signOut();
    _emit(const IamFlutterMobileAuthState());
  }

  /// Resolves the cross-client route id for a physical Flutter location.
  String? routeIdForPath(String path) => _service.routeIdForPath(path);
}
