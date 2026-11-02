// SDKWORK-IAM-FLUTTER-AUTH: authored state.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_auth`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this
 * root uses controllers, so state objects stay immutable and controllers emit them.
 */

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
}

/// State of the `auth` capability.
class IamFlutterMobileAuthState {
  const IamFlutterMobileAuthState({
    this.status = IamFlutterMobileAuthStatus.idle,
    this.session,
    this.errorMessage,
  });

  /// Current lifecycle stage.
  final IamFlutterMobileAuthStatus status;

  /// Session, when [status] is authenticated.
  final IamFlutterMobileAuthSession? session;

  /// User-safe failure text, when [status] is error.
  final String? errorMessage;

  /// True while a sign-in request is in flight.
  bool get submitting => status == IamFlutterMobileAuthStatus.submitting;

  /// True when a session exists.
  bool get authenticated => status == IamFlutterMobileAuthStatus.authenticated;

  /// A copy that keeps every field.
  IamFlutterMobileAuthState copyWith({
    IamFlutterMobileAuthStatus? status,
    IamFlutterMobileAuthSession? session,
    String? errorMessage,
  }) {
    return IamFlutterMobileAuthState(
      status: status ?? this.status,
      session: session ?? this.session,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  /// A copy that clears the error and the session, for a fresh attempt.
  IamFlutterMobileAuthState asSubmitting() {
    return const IamFlutterMobileAuthState(status: IamFlutterMobileAuthStatus.submitting);
  }

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
      errorMessage: message,
      status: IamFlutterMobileAuthStatus.error,
    );
  }
}
