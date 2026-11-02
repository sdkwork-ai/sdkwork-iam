// SDKWORK-IAM-FLUTTER-USER-CENTER: authored state.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_user_center`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this
 * root uses controllers, so state objects stay immutable and controllers emit them.
 */

import '../services/user_center_service.dart';

/// Lifecycle of the profile load.
enum IamFlutterMobileUserCenterStatus {
  /// Nothing requested yet.
  idle,

  /// The profile is in flight.
  loading,

  /// The profile is available.
  ready,

  /// The load failed; [IamFlutterMobileUserCenterState.errorMessage] says why.
  error,
}

/// State of the `user_center` capability.
class IamFlutterMobileUserCenterState {
  const IamFlutterMobileUserCenterState({
    this.status = IamFlutterMobileUserCenterStatus.idle,
    this.profile,
    this.errorMessage,
    this.savingProfile = false,
    this.savingPassword = false,
    this.notice,
  });

  /// Current lifecycle stage.
  final IamFlutterMobileUserCenterStatus status;

  /// Loaded profile, when [status] is ready.
  final IamFlutterMobileUserProfile? profile;

  /// User-safe failure text.
  final String? errorMessage;

  /// True while a profile save is in flight.
  final bool savingProfile;

  /// True while a password change is in flight.
  final bool savingPassword;

  /// User-safe success text of the last completed action.
  final String? notice;

  /// A copy that keeps every field.
  IamFlutterMobileUserCenterState copyWith({
    IamFlutterMobileUserCenterStatus? status,
    IamFlutterMobileUserProfile? profile,
    String? errorMessage,
    bool? savingProfile,
    bool? savingPassword,
    String? notice,
  }) {
    return IamFlutterMobileUserCenterState(
      status: status ?? this.status,
      profile: profile ?? this.profile,
      errorMessage: errorMessage ?? this.errorMessage,
      savingProfile: savingProfile ?? this.savingProfile,
      savingPassword: savingPassword ?? this.savingPassword,
      notice: notice ?? this.notice,
    );
  }

  /// A copy for a fresh load, clearing the error and the notice.
  IamFlutterMobileUserCenterState asLoading() {
    return const IamFlutterMobileUserCenterState(
      status: IamFlutterMobileUserCenterStatus.loading,
    );
  }

  /// A copy that records a loaded profile.
  IamFlutterMobileUserCenterState loaded(IamFlutterMobileUserProfile value) {
    return IamFlutterMobileUserCenterState(
      profile: value,
      status: IamFlutterMobileUserCenterStatus.ready,
    );
  }

  /// A copy that records a failure, keeping the profile already shown.
  IamFlutterMobileUserCenterState failed(String message) {
    return copyWith(
      errorMessage: message,
      savingPassword: false,
      savingProfile: false,
      status: profile == null
          ? IamFlutterMobileUserCenterStatus.error
          : IamFlutterMobileUserCenterStatus.ready,
    );
  }

  /// A copy that records a completed action.
  IamFlutterMobileUserCenterState succeeded(String message) {
    return copyWith(
      errorMessage: null,
      notice: message,
      savingPassword: false,
      savingProfile: false,
      status: IamFlutterMobileUserCenterStatus.ready,
    );
  }
}
