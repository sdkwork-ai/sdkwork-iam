// SDKWORK-IAM-FLUTTER-AUTH: authored controller.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_auth`.
 *
 * Controllers call services and emit immutable state. They never construct SDK
 * clients, never read runtime configuration and never call platform plugins
 * (section 5).
 */

import '../auth_session_controller.dart';
import '../login_context.dart';
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
  void Function() addListener(
      void Function(IamFlutterMobileAuthState) listener) {
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
  Future<bool> signIn(
      {required String password, required String username}) async {
    _emit(_state.asSubmitting());
    try {
      final IamFlutterMobileLoginResult result = await _service
          .signInWithPassword(password: password, username: username);
      return _applyLoginResult(result);
    } catch (error) {
      _emit(_state.failed('$error'));
      return false;
    }
  }

  /// Signs in with a verification code sent to [account].
  ///
  /// Mirrors [signIn]: the failure is recorded in state and the returned flag
  /// tells the screen whether a session was established.
  Future<bool> signInWithCode({
    required String account,
    required String code,
  }) async {
    _emit(_state.asSubmitting());
    try {
      final IamFlutterMobileLoginResult result = await _service
          .signInWithCode(account: account, code: code);
      return _applyLoginResult(result);
    } catch (error) {
      _emit(_state.failed(_describe(error)));
      return false;
    }
  }

  /// Registers [draft] and applies the resulting session or context challenge.
  Future<bool> register(
    IamFlutterMobileRegisterDraft draft, {
    bool verificationRequired = false,
  }) async {
    _emit(_state.asSubmitting());
    try {
      final IamFlutterMobileLoginResult result = await _service.register(
        draft,
        verificationRequired: verificationRequired,
      );
      return _applyLoginResult(result);
    } catch (error) {
      _emit(_state.failed(_describe(error)));
      return false;
    }
  }

  bool _applyLoginResult(IamFlutterMobileLoginResult result) {
    switch (result) {
      case IamFlutterMobileLoginSessionResult():
        _emit(_state.signedIn(result.session));
        return true;
      case IamFlutterMobileLoginContextSelectionRequiredResult():
        _emit(_state.contextSelectionRequired(result.challenge));
        return false;
    }
  }

  /// Asks for a verification code of [scene] for [account].
  ///
  /// The failure is recorded in state rather than rethrown, so the form needs no
  /// try/catch; the returned flag lets the screen keep the code field enabled.
  Future<bool> requestVerificationCode({
    required String account,
    required IamFlutterMobileVerificationScene scene,
  }) async {
    _emit(_state.asSendingCode());
    try {
      await _service.requestVerificationCode(account: account, scene: scene);
      _emit(_state.succeeded('code-sent'));
      return true;
    } catch (error) {
      _emit(_state.failed(_describe(error)));
      return false;
    }
  }

  /// Continues the stored challenge using only an explicit user choice.
  Future<bool> selectPersonalContext() async {
    final IamLoginContextSelectionChallenge? challenge = _state.challenge;
    if (challenge == null) return false;
    return _continueContext(
        buildPersonalLoginContextSelectionBody(challenge.continuationToken));
  }

  /// Continues the stored challenge for a chosen, non-sentinel organization.
  Future<bool> selectOrganizationContext(String organizationId) async {
    final IamLoginContextSelectionChallenge? challenge = _state.challenge;
    if (challenge == null) return false;
    if (!challenge.organizations.any(
        (IamLoginContextOrganizationChoice choice) =>
            choice.organizationId == organizationId)) {
      _emit(_state
          .failed('The selected organization is not part of this challenge.'));
      return false;
    }
    return _continueContext(buildOrganizationLoginContextSelectionBody(
      challenge.continuationToken,
      organizationId,
    ));
  }

  Future<bool> _continueContext(Map<String, String> body) async {
    _emit(_state.asSubmitting());
    try {
      final IamFlutterMobileAuthSession session =
          await _service.selectLoginContext(body);
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

  /// Asks for a password-reset code.
  ///
  /// The failure is recorded in state rather than rethrown, so the form needs no
  /// try/catch; the returned flag lets the screen keep the code field enabled.
  Future<bool> requestResetCode(String account) async {
    _emit(_state.asSendingCode());
    try {
      await _service.requestPasswordResetCode(account);
      _emit(_state.succeeded('code-sent'));
      return true;
    } catch (error) {
      _emit(_state.failed(_describe(error)));
      return false;
    }
  }

  /// Sets a new password with a code the user received.
  Future<bool> resetPassword(IamFlutterMobileAuthResetDraft draft) async {
    _emit(_state.asResetting());
    try {
      await _service.resetPassword(draft);
      _emit(_state.succeeded('password-reset'));
      return true;
    } catch (error) {
      _emit(_state.failed(_describe(error)));
      return false;
    }
  }

  /// Renders a thrown value as user-safe text.
  String _describe(Object error) =>
      error is StateError ? error.message : '$error';

  /// Resolves the cross-client route id for a physical Flutter location.
  String? routeIdForPath(String path) => _service.routeIdForPath(path);
}
