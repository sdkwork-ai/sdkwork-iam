// SDKWORK-IAM-FLUTTER-AUTH: authored service layer.
/**
 * Use-case orchestration of `sdkwork_iam_flutter_mobile_auth`.
 *
 * Section 6: this package consumes `/app/v3/api` through generated Dart SDK
 * clients that the bootstrap injected. The service receives its collaborators, so
 * it never constructs a client and never composes raw HTTP or manual authorization
 * headers.
 *
 * The data dependency is an explicit port: the capability compiles and tests
 * without a network, and the root bootstrap supplies the generated-SDK
 * implementation together with the token/session store.
 *
 * The session value type is the one `auth_session_controller.dart` already
 * declares. This file used to define a second `IamFlutterMobileAuthSession`; two
 * classes with one name made every implementation in the app fail to typecheck.
 */

import '../auth_session_controller.dart';

// The session type belongs to `auth_session_controller.dart`, but every consumer of
// this service names it in the same breath as the port, so re-export it here rather
// than making each state/controller file import two libraries for one concept.
export '../auth_session_controller.dart' show IamFlutterMobileAuthSession;

/// The data port the capability depends on.
abstract class IamFlutterMobileAuthDataSource {
  /// Current session, or null when nobody is signed in.
  IamFlutterMobileAuthSession? get currentSession;

  /// Exchanges a username and password for a session.
  Future<IamFlutterMobileAuthSession> signInWithPassword({
    required String password,
    required String username,
  });

  /// Clears the session everywhere it is stored.
  Future<void> signOut();
}

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> iamFlutterMobileAuthRoutePaths = <String, String>{
  'app.iam.auth.login': '/auth/login',
  'app.iam.auth.register': '/auth/register',
  'app.iam.auth.forgot-password': '/auth/forgot-password',
  'app.iam.auth.oauth-callback': '/auth/oauth/callback',
  'app.iam.auth.context-selection': '/auth/login/context',
};

/// Validation and error mapping of the `auth` capability.
class IamFlutterMobileAuthService {
  const IamFlutterMobileAuthService({IamFlutterMobileAuthDataSource? dataSource})
      : _dataSource = dataSource;

  final IamFlutterMobileAuthDataSource? _dataSource;

  /// True when a session exists.
  bool get isAuthenticated => _requireDataSource().currentSession != null;

  /// Current session, if any.
  IamFlutterMobileAuthSession? get currentSession => _requireDataSource().currentSession;

  /// Signs in with a username and password.
  Future<IamFlutterMobileAuthSession> signInWithPassword({
    required String password,
    required String username,
  }) {
    return _requireDataSource().signInWithPassword(password: password, username: username);
  }

  /// Signs out.
  Future<void> signOut() => _requireDataSource().signOut();

  /// Maps a physical Flutter location back to its cross-client route id.
  ///
  /// Section 8 resolves a deep link to a route id before converting it into a
  /// navigation action, so the reverse lookup lives beside the forward one.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry in iamFlutterMobileAuthRoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }

  IamFlutterMobileAuthDataSource _requireDataSource() {
    final IamFlutterMobileAuthDataSource? source = _dataSource;
    if (source == null) {
      throw StateError(
        'IamFlutterMobileAuthService requires an IamFlutterMobileAuthDataSource; '
        'the root bootstrap must inject one.',
      );
    }
    return source;
  }
}
