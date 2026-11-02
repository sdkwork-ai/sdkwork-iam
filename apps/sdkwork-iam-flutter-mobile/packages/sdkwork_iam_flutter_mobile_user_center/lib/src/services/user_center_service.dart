// SDKWORK-IAM-FLUTTER-USER-CENTER: authored service layer.
/**
 * Use-case orchestration of `sdkwork_iam_flutter_mobile_user_center`.
 *
 * Section 6: this package consumes `/app/v3/api` through generated Dart SDK
 * clients that the bootstrap injected. The service receives its collaborators, so
 * it never constructs a client and never composes raw HTTP or manual authorization
 * headers.
 *
 * The data dependency is an explicit port: the capability compiles and tests
 * without a network, and the root bootstrap supplies the generated-SDK
 * implementation together with the token store.
 */

/// Minimum password length, matched to the H5 and PC validators.
const int iamFlutterMobileMinPasswordLength = 8;

/// The signed-in user's own profile.
class IamFlutterMobileUserProfile {
  const IamFlutterMobileUserProfile({
    this.displayName,
    this.email,
    this.phone,
    this.userId,
  });

  /// User id, when reported.
  final String? userId;

  /// Display name, when reported.
  final String? displayName;

  /// Bound email, when reported.
  final String? email;

  /// Bound phone, when reported.
  final String? phone;
}

/// The editable fields of the profile.
class IamFlutterMobileUserProfileDraft {
  const IamFlutterMobileUserProfileDraft({
    this.displayName = '',
    this.email = '',
    this.phone = '',
  });

  /// Display name as typed.
  final String displayName;

  /// Email as typed.
  final String email;

  /// Phone as typed.
  final String phone;

  /// True when nothing was typed; the screen disables saving rather than sending
  /// a request with no field in it.
  bool get isEmpty =>
      displayName.trim().isEmpty && email.trim().isEmpty && phone.trim().isEmpty;
}

/// The three fields of a password change.
class IamFlutterMobileUserPasswordDraft {
  const IamFlutterMobileUserPasswordDraft({
    this.confirmPassword = '',
    this.newPassword = '',
    this.oldPassword = '',
  });

  /// Current password.
  final String oldPassword;

  /// New password.
  final String newPassword;

  /// Repetition of the new password.
  final String confirmPassword;
}

/// Why a password draft cannot be submitted.
enum IamFlutterMobileUserPasswordProblem {
  /// The current password is empty.
  oldPasswordRequired,

  /// The new password is shorter than [iamFlutterMobileMinPasswordLength].
  newPasswordTooShort,

  /// The confirmation does not match.
  confirmMismatch,
}

/// Validates a password draft before it reaches the network.
///
/// Order matters: an empty current password is reported first because the server
/// would reject on it anyway, and reporting a rule the server never reached would
/// send the user to fix the wrong field.
IamFlutterMobileUserPasswordProblem? validateIamFlutterMobileUserPasswordDraft(
  IamFlutterMobileUserPasswordDraft draft,
) {
  if (draft.oldPassword.trim().isEmpty) {
    return IamFlutterMobileUserPasswordProblem.oldPasswordRequired;
  }
  if (draft.newPassword.length < iamFlutterMobileMinPasswordLength) {
    return IamFlutterMobileUserPasswordProblem.newPasswordTooShort;
  }
  if (draft.newPassword != draft.confirmPassword) {
    return IamFlutterMobileUserPasswordProblem.confirmMismatch;
  }
  return null;
}

/// The data port the capability depends on.
abstract class IamFlutterMobileUserCenterDataSource {
  /// Changes the current password.
  Future<void> changePassword(IamFlutterMobileUserPasswordDraft draft);

  /// Reads the current profile.
  Future<IamFlutterMobileUserProfile> loadProfile();

  /// Saves the editable profile fields.
  Future<IamFlutterMobileUserProfile> updateProfile(IamFlutterMobileUserProfileDraft draft);
}

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> iamFlutterMobileUserCenterRoutePaths = <String, String>{
  'app.iam.user-center.profile': '/user/profile',
  'app.iam.user-center.password': '/user/password',
};

/// Validation and error mapping of the `user_center` capability.
class IamFlutterMobileUserCenterService {
  const IamFlutterMobileUserCenterService({
    IamFlutterMobileUserCenterDataSource? dataSource,
  }) : _dataSource = dataSource;

  final IamFlutterMobileUserCenterDataSource? _dataSource;

  /// Reads the current profile.
  Future<IamFlutterMobileUserProfile> loadProfile() => _requireDataSource().loadProfile();

  /// Saves the editable profile fields.
  Future<IamFlutterMobileUserProfile> updateProfile(IamFlutterMobileUserProfileDraft draft) {
    if (draft.isEmpty) {
      throw StateError('Nothing to save: every profile field is empty.');
    }
    return _requireDataSource().updateProfile(draft);
  }

  /// Changes the current password.
  ///
  /// An invalid draft is refused here as well as on the screen, so a caller that
  /// skipped the screen-level check still cannot send a request the server would
  /// only reject.
  Future<void> changePassword(IamFlutterMobileUserPasswordDraft draft) {
    final IamFlutterMobileUserPasswordProblem? problem =
        validateIamFlutterMobileUserPasswordDraft(draft);
    if (problem != null) {
      throw StateError(_problemMessage(problem));
    }
    return _requireDataSource().changePassword(draft);
  }

  /// Maps a physical Flutter location back to its cross-client route id.
  ///
  /// Section 8 resolves a deep link to a route id before converting it into a
  /// navigation action, so the reverse lookup lives beside the forward one.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry in iamFlutterMobileUserCenterRoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }

  IamFlutterMobileUserCenterDataSource _requireDataSource() {
    final IamFlutterMobileUserCenterDataSource? source = _dataSource;
    if (source == null) {
      throw StateError(
        'IamFlutterMobileUserCenterService requires an '
        'IamFlutterMobileUserCenterDataSource; the root bootstrap must inject one.',
      );
    }
    return source;
  }

  String _problemMessage(IamFlutterMobileUserPasswordProblem problem) {
    switch (problem) {
      case IamFlutterMobileUserPasswordProblem.oldPasswordRequired:
        return 'The current password is required.';
      case IamFlutterMobileUserPasswordProblem.newPasswordTooShort:
        return 'The new password must be at least $iamFlutterMobileMinPasswordLength characters.';
      case IamFlutterMobileUserPasswordProblem.confirmMismatch:
        return 'The confirmation does not match the new password.';
    }
  }
}
