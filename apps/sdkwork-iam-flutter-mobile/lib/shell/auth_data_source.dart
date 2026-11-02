// SDKWORK-IAM-FLUTTER-SHELL: authored capability adapter.
/**
 * App-api implementation of the auth capability's data port.
 *
 * It is the one place that knows the generated SDK's session command and the
 * three places a session lives (token manager, context store, secure storage), so
 * the capability package stays network-free and storage-free.
 */

import 'package:sdkwork_iam_app_sdk/sdkwork_iam_app_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile_auth/sdkwork_iam_flutter_mobile_auth.dart';

import '../bootstrap/iam_runtime.dart';
import '../bootstrap/sdk_clients.dart';

/// Reads and writes the session through the generated app-api client.
class IamAuthAppSdkDataSource implements IamFlutterMobileAuthDataSource {
  /// Creates the adapter. A client may be injected for tests.
  IamAuthAppSdkDataSource({SdkworkAppClient? client, IamRuntime? runtime})
      : _client = client ?? getSdkClients().iamFlutterMobileCore,
        _runtime = runtime ?? IamRuntime.instance;

  final SdkworkAppClient _client;
  final IamRuntime _runtime;

  @override
  IamFlutterMobileAuthSession? get currentSession {
    final String? token = _runtime.tokenManager.currentAccessToken;
    if (token == null || token.isEmpty) return null;
    return IamFlutterMobileAuthSession(
      accessToken: token,
      refreshToken: _runtime.tokenManager.currentRefreshToken,
    );
  }

  @override
  Future<IamFlutterMobileAuthSession> signInWithPassword({
    required String password,
    required String username,
  }) async {
    // The generated Dart command carries no `grantType`; the app-api infers the
    // password grant from `username` + `password`. The TypeScript client sends an
    // explicit `grantType`, which is recorded in the completeness ledger as a
    // generated-SDK drift to reconcile.
    final SdkWorkResourceResponse? response = await _client.auth.sessionsCreate(
      AppbaseSessionCreateCommand(password: password, username: username),
    );
    final Map<String, dynamic> data = _sessionData(response);
    final String? accessToken =
        _readString(data['accessToken']) ?? _readString(data['access_token']);
    if (accessToken == null) {
      throw StateError('The sign-in response carried no access token.');
    }
    final String? refreshToken =
        _readString(data['refreshToken']) ?? _readString(data['refresh_token']);
    _runtime.tokenManager.setTokens(accessToken: accessToken, refreshToken: refreshToken);
    _client.setAccessToken(accessToken);
    return IamFlutterMobileAuthSession(
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
  }

  @override
  Future<void> requestPasswordResetCode(String account) async {
    // The server sends the code; the response body carries no token the client
    // needs, so only a transport failure can end this call badly.
    await _client.auth.passwordResetRequestsCreate(<String, dynamic>{'account': account});
  }

  @override
  Future<void> resetPassword(IamFlutterMobileAuthResetDraft draft) async {
    await _client.auth.passwordResetsCreate(<String, dynamic>{
      'account': draft.account.trim(),
      'code': draft.code.trim(),
      'confirmPassword': draft.confirmPassword,
      'newPassword': draft.newPassword,
    });
  }

  @override
  Future<void> signOut() async {
    try {
      await _client.auth.sessionsCurrentDelete();
    } catch (_) {
      // A failed server-side sign-out must not keep the local session alive: the
      // local credentials are cleared in `clearSession` regardless.
    }
    await _runtime.clearSession();
  }
}

Map<String, dynamic> _sessionData(SdkWorkResourceResponse? response) {
  final Object? data = response?.data;
  if (data is Map) return Map<String, dynamic>.from(data);
  throw StateError('The sign-in response carried no data object.');
}

String? _readString(Object? value) {
  if (value is String) {
    final String trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }
  return null;
}
