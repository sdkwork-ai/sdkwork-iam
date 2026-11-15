// SDKWORK-IAM-FLUTTER: authored auth data-source test.
/**
 * The auth data source is the boundary that used to infer "signed in" from the
 * token manager. These cases pin the corrected source of truth: `currentSession`
 * comes from the context store, so the public application access token alone
 * never opens the shell, and a real session exposes the restored fields.
 */

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_app_sdk/sdkwork_iam_app_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile/bootstrap/iam_runtime.dart';
import 'package:sdkwork_iam_flutter_mobile/shell/auth_data_source.dart';

const String _bootstrapToken = 'bootstrap-application-token';

class _MemorySecureStorage extends FlutterSecureStorage {
  final Map<String, String> _values = <String, String>{};

  @override
  Future<String?> read({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async =>
      _values[key];

  @override
  Future<void> write({
    required String key,
    required String? value,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    if (value == null) {
      _values.remove(key);
      return;
    }
    _values[key] = value;
  }

  @override
  Future<void> delete({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    _values.remove(key);
  }
}

IamAuthAppSdkDataSource _dataSource(IamRuntime runtime) {
  return IamAuthAppSdkDataSource(
    client: SdkworkAppClient.withBaseUrl(baseUrl: 'http://127.0.0.1:1'),
    runtime: runtime,
  );
}

IamRuntime _runtime() {
  return IamRuntime.createIamRuntime(
    secureStorage: _MemorySecureStorage(),
    bootstrapAccessTokenResolver: () => _bootstrapToken,
  );
}

void main() {
  test('the bootstrap token alone is not a current session', () async {
    final IamRuntime runtime = _runtime();
    await runtime.initialize();

    expect(runtime.tokenManager.currentAccessToken, _bootstrapToken);
    expect(_dataSource(runtime).currentSession, isNull);
  });

  test('a session in the context store is the current session', () async {
    final IamRuntime runtime = _runtime();
    await runtime.initialize();
    await runtime.establishSession(
      accessToken: 'session-access-token',
      organizationId: '42',
      refreshToken: 'session-refresh-token',
      sessionId: 'session-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
    );

    final session = _dataSource(runtime).currentSession;
    expect(session, isNotNull);
    expect(session?.accessToken, 'session-access-token');
    expect(session?.refreshToken, 'session-refresh-token');
    expect(session?.sessionId, 'session-1');
    expect(session?.userId, 'user-1');
  });

  test('destroying the session clears both the source of truth and the credential',
      () async {
    final IamRuntime runtime = _runtime();
    await runtime.initialize();
    await runtime.establishSession(
      accessToken: 'session-access-token',
      refreshToken: 'session-refresh-token',
      userId: 'user-1',
    );
    final IamAuthAppSdkDataSource dataSource = _dataSource(runtime);
    expect(dataSource.currentSession, isNotNull);

    await runtime.clearSession();

    expect(dataSource.currentSession, isNull);
    expect(runtime.tokenManager.currentAccessToken, _bootstrapToken);
  });
}
