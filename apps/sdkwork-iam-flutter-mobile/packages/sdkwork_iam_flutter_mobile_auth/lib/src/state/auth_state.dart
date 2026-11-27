// SDKWORK-IAM-FLUTTER-AUTH: authored state.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_auth`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this
 * root uses controllers, so state objects stay immutable and controllers emit them.
 */

import '../login_context.dart';
import '../services/auth_service.dart';

/// Lifecycle of the sign-in attempt.
enum IamFlutterMobileAuthStatus {
  /// Signed out and idle.
  idle,

  /// A sign-in request is in flight.
  submitting,

  /// A session exists.
  authenticated,

  /// The last attempt failed; [IamFlutterMobileAuthState.errorMessage] says why.
  error,

  /// A personal or organization choice is required before login can complete.
  selectingContext,
}

/// State of the `auth` capability.
class IamFlutterMobileAuthState {
  const IamFlutterMobileAuthState({
    this.status = IamFlutterMobileAuthStatus.idle,
    this.session,
    this.challenge,
    this.errorMessage,
    this.notice,
    this.resetting = false,
    this.sendingCode = false,
  });

  /// Current lifecycle stage.
  final IamFlutterMobileAuthStatus status;

  /// Session, when [status] is authenticated.
  final IamFlutterMobileAuthSession? session;

  /// Pending challenge, when [status] is selectingContext.
  final IamLoginContextSelectionChallenge? challenge;

  /// User-safe failure text, when [status] is error.
  final String? errorMessage;

  /// User-safe success text of the last completed action.
  final String? notice;

  /// True while a reset-code request is in flight.
  final bool sendingCode;

  /// True while a password reset is in flight.
  final bool resetting;

  /// True while a sign-in request is in flight.
  bool get submitting => status == IamFlutterMobileAuthStatus.submitting;

  /// True when a session exists.
  bool get authenticated => status == IamFlutterMobileAuthStatus.authenticated;

  /// A copy that keeps every field.
  ///
  /// The three flags are cleared explicitly by the named constructors below; a
  /// `copyWith` cannot express "set this boolean back to false" without a sentinel.
  IamFlutterMobileAuthState copyWith({
    IamFlutterMobileAuthStatus? status,
    IamFlutterMobileAuthSession? session,
    String? errorMessage,
    String? notice,
  }) {
    return IamFlutterMobileAuthState(
      status: status ?? this.status,
      session: session ?? this.session,
      challenge: challenge ?? this.challenge,
      errorMessage: errorMessage ?? this.errorMessage,
      notice: notice ?? this.notice,
      resetting: resetting,
      sendingCode: sendingCode,
    );
  }

  /// A copy that clears the error and the session, for a fresh attempt.
  IamFlutterMobileAuthState asSubmitting() {
    if (challenge != null) {
      return IamFlutterMobileAuthState(
        challenge: challenge,
        status: IamFlutterMobileAuthStatus.submitting,
      );
    }
    return const IamFlutterMobileAuthState(
        status: IamFlutterMobileAuthStatus.submitting);
  }

  /// A copy that marks a reset-code request as in flight.
  IamFlutterMobileAuthState asSendingCode() =>
      const IamFlutterMobileAuthState(sendingCode: true);

  /// A copy that marks a password reset as in flight.
  IamFlutterMobileAuthState asResetting() =>
      const IamFlutterMobileAuthState(resetting: true);

  /// A copy that records a completed action without changing the session.
  IamFlutterMobileAuthState succeeded(String message) =>
      IamFlutterMobileAuthState(
          notice: message, session: session, status: status);

  /// A copy that records a required context choice without authenticating.
  IamFlutterMobileAuthState contextSelectionRequired(
    IamLoginContextSelectionChallenge value,
  ) =>
      IamFlutterMobileAuthState(
        challenge: value,
        status: IamFlutterMobileAuthStatus.selectingContext,
      );

  /// A copy that records a session.
  IamFlutterMobileAuthState signedIn(IamFlutterMobileAuthSession value) {
    return IamFlutterMobileAuthState(
      session: value,
      status: IamFlutterMobileAuthStatus.authenticated,
    );
  }

  /// A copy that records a failure.
  IamFlutterMobileAuthState failed(String message) {
    return IamFlutterMobileAuthState(
      challenge: challenge,
      errorMessage: message,
      status: challenge == null
          ? IamFlutterMobileAuthStatus.error
          : IamFlutterMobileAuthStatus.selectingContext,
    );
  }
}
