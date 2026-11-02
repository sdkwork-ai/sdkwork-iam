// SDKWORK-IAM-FLUTTER-CONSOLE-USER-CENTER: authored service layer.
/**
 * Use-case orchestration of `sdkwork_iam_flutter_mobile_console_user_center`.
 *
 * Section 6: this package consumes `/app/v3/api` through generated Dart SDK clients that
 * the bootstrap injected. The service receives its collaborators, so it never constructs a
 * client and never composes raw HTTP or manual authorization headers.
 *
 * The console shows the operator's own record plus the tenant verification policy: "what
 * will this user be asked to verify" is the question behind most verification tickets, and
 * the app profile screen never surfaces it.
 */

/// The caller's own record.
class IamFlutterMobileConsoleUserAccount {
  const IamFlutterMobileConsoleUserAccount({
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

/// Tenant verification policy, as far as the console shows it.
class IamFlutterMobileConsoleUserVerificationPolicy {
  const IamFlutterMobileConsoleUserVerificationPolicy({
    this.contactRequired = false,
    this.emailRequired = false,
    this.oauthRequired = false,
  });

  /// Whether contact verification is required.
  final bool contactRequired;

  /// Whether email verification is required.
  final bool emailRequired;

  /// Whether third-party sign-in is required.
  final bool oauthRequired;
}

/// The data port the capability depends on.
abstract class IamFlutterMobileConsoleUserCenterDataSource {
  /// Reads the caller's own record.
  Future<IamFlutterMobileConsoleUserAccount> loadAccount();

  /// Reads the tenant verification policy.
  Future<IamFlutterMobileConsoleUserVerificationPolicy> loadVerificationPolicy();
}

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> iamFlutterMobileConsoleUserCenterRoutePaths = <String, String>{
  'console.iam.user-center.profile': '/console/iam/user',
};

/// Validation and error mapping of the `console_user_center` capability.
class IamFlutterMobileConsoleUserCenterService {
  const IamFlutterMobileConsoleUserCenterService({
    IamFlutterMobileConsoleUserCenterDataSource? dataSource,
  }) : _dataSource = dataSource;

  final IamFlutterMobileConsoleUserCenterDataSource? _dataSource;

  /// Reads the caller's own record.
  Future<IamFlutterMobileConsoleUserAccount> loadAccount() => _requireDataSource().loadAccount();

  /// Reads the tenant verification policy.
  Future<IamFlutterMobileConsoleUserVerificationPolicy> loadVerificationPolicy() =>
      _requireDataSource().loadVerificationPolicy();

  /// Maps a physical Flutter location back to its cross-client route id.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry in iamFlutterMobileConsoleUserCenterRoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }

  IamFlutterMobileConsoleUserCenterDataSource _requireDataSource() {
    final IamFlutterMobileConsoleUserCenterDataSource? source = _dataSource;
    if (source == null) {
      throw StateError(
        'IamFlutterMobileConsoleUserCenterService requires an '
        'IamFlutterMobileConsoleUserCenterDataSource; the root bootstrap must inject one.',
      );
    }
    return source;
  }
}
