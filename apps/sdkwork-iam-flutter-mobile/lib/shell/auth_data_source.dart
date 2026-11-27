// SDKWORK-IAM-FLUTTER-SHELL: authored capability adapter.
/**
 * App-api implementation of the auth capability's data port.
 *
 * Credential-entry calls use only the public bootstrap Access-Token. A context
 * challenge never updates the token manager, context store or secure storage;
 * only a final complete dual-token session establishes authenticated state.
 */

import 'package:sdkwork_iam_app_sdk/sdkwork_iam_app_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile_auth/sdkwork_iam_flutter_mobile_auth.dart';
import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';

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
    final IamFlutterMobileCoreSessionContext? context =
        _runtime.contextStore.current;
    if (context == null || !context.isComplete) return null;
    return IamFlutterMobileAuthSession(
      accessToken: context.accessToken,
      authToken: context.authToken,
      refreshToken: context.refreshToken,
      sessionId: context.sessionId,
      userId: context.userId,
      tenantId: context.tenantId,
      organizationId: context.organizationId,
      loginScope: context.loginScope,
    );
  }

  @override
  Future<IamFlutterMobileLoginResult> signInWithPassword({
    required String password,
    required String username,
  }) async {
    final Map<String, dynamic> data = await _credentialEntry(
      () => _client.auth.sessionsCreate(
        AppbaseSessionCreateCommand(password: password, username: username),
      ),
    );
    final IamLoginContextSelectionChallenge? challenge =
        parseIamLoginContextSelectionChallenge(data);
    if (challenge != null) {
      return IamFlutterMobileLoginContextSelectionRequiredResult(challenge);
    }
    return IamFlutterMobileLoginSessionResult(await _commit(data));
  }

  @override
  Future<IamFlutterMobileAuthSession> selectLoginContext(
    Map<String, String> body,
  ) async {
    final String? continuationToken = body['continuationToken']?.trim();
    if (continuationToken == null || continuationToken.isEmpty) {
      throw const FormatException('A continuation token is required.');
    }
    final Map<String, dynamic> data = await _credentialEntry(
      () => _client.auth.sessionsLoginContextSelectionCreate(body),
    );
    // A second challenge is not a final session and must fail closed.
    final IamLoginContextSelectionChallenge? challenge =
        parseIamLoginContextSelectionChallenge(data);
    if (challenge != null) {
      throw StateError(
          'Login-context selection returned another challenge instead of a session.');
    }
    return _commit(data);
  }

  Future<IamFlutterMobileAuthSession> _commit(Map<String, dynamic> data) async {
    final IamFlutterMobileAuthSession session =
        parseIamFlutterMobileAuthSession(data);
    await _runtime.establishSession(
      accessToken: session.accessToken!,
      authToken: session.authToken!,
      refreshToken: session.refreshToken,
      userId: session.userId!,
      tenantId: session.tenantId!,
      organizationId: session.organizationId,
      loginScope: session.loginScope,
      sessionId: session.sessionId,
    );
    return session;
  }

  Future<Map<String, dynamic>> _credentialEntry(
    Future<SdkWorkResourceResponse?> Function() request,
  ) async {
    final String? bootstrap = _runtime.bootstrapAccessToken;
    if (bootstrap == null) {
      throw StateError('The bootstrap credential is unavailable.');
    }
    _client.setAccessToken(bootstrap);
    _client.setAuthToken('');
    try {
      return _sessionData(await request());
    } catch (_) {
      if (!_runtime.hasSession) _runtime.restoreBootstrapAccessToken();
      rethrow;
    }
  }

  @override
  Future<void> requestPasswordResetCode(String account) async {
    await _client.auth
        .passwordResetRequestsCreate(<String, dynamic>{'account': account});
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
      // Local credentials are cleared even when server-side sign-out fails.
    }
    await _runtime.clearSession();
  }
}

Map<String, dynamic> _sessionData(SdkWorkResourceResponse? response) {
  final Object? data = response?.data;
  if (data is Map) return Map<String, dynamic>.from(data);
  throw StateError('The sign-in response carried no data object.');
}
