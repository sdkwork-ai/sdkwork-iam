// SDKWORK-IAM-FLUTTER-CONSOLE-USER-CENTER: authored state.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_console_user_center`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this root uses
 * controllers, so state objects stay immutable and controllers emit them.
 */

import '../services/console_user_center_service.dart';

/// Lifecycle of the console profile.
enum IamFlutterMobileConsoleUserCenterStatus {
  /// Nothing requested yet.
  idle,

  /// The first load is in flight.
  loading,

  /// Account and policy are available.
  ready,

  /// The first load failed; [IamFlutterMobileConsoleUserCenterState.errorMessage] says why.
  error,
}

/// State of the `console_user_center` capability.
class IamFlutterMobileConsoleUserCenterState {
  const IamFlutterMobileConsoleUserCenterState({
    this.status = IamFlutterMobileConsoleUserCenterStatus.idle,
    this.account,
    this.policy,
    this.errorMessage,
  });

  /// Current lifecycle stage.
  final IamFlutterMobileConsoleUserCenterStatus status;

  /// The caller's record, when loaded.
  final IamFlutterMobileConsoleUserAccount? account;

  /// Tenant verification policy, when loaded.
  final IamFlutterMobileConsoleUserVerificationPolicy? policy;

  /// User-safe failure text.
  final String? errorMessage;

  /// A copy for a fresh load.
  IamFlutterMobileConsoleUserCenterState asLoading() =>
      const IamFlutterMobileConsoleUserCenterState(
        status: IamFlutterMobileConsoleUserCenterStatus.loading,
      );

  /// A copy that records a completed load.
  IamFlutterMobileConsoleUserCenterState loaded({
    required IamFlutterMobileConsoleUserAccount nextAccount,
    required IamFlutterMobileConsoleUserVerificationPolicy nextPolicy,
  }) {
    return IamFlutterMobileConsoleUserCenterState(
      account: nextAccount,
      policy: nextPolicy,
      status: IamFlutterMobileConsoleUserCenterStatus.ready,
    );
  }

  /// A copy that records a failure, keeping the account already shown.
  IamFlutterMobileConsoleUserCenterState failed(String message) {
    return IamFlutterMobileConsoleUserCenterState(
      account: account,
      errorMessage: message,
      policy: policy,
      status: account == null
          ? IamFlutterMobileConsoleUserCenterStatus.error
          : IamFlutterMobileConsoleUserCenterStatus.ready,
    );
  }
}
