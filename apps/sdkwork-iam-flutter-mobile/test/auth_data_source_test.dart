// SDKWORK-IAM-FLUTTER: authored auth data-source test.
// The auth data source is the boundary that used to infer "signed in" from the
// token manager. These cases pin the corrected source of truth: `currentSession`
// comes from the context store, so the public application access token alone
// never opens the shell, and a real session exposes the restored fields.

import 'dart:async';
import 'dart:collection';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_app_sdk/sdkwork_iam_app_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile/bootstrap/iam_runtime.dart';
import 'package:sdkwork_iam_flutter_mobile/shell/auth_data_source.dart';
import 'package:sdkwork_iam_flutter_mobile_auth/sdkwork_iam_flutter_mobile_auth.dart';

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
      authToken: 'session-auth-token',
      organizationId: '42',
      loginScope: 'ORGANIZATION',
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

  test(
      'destroying the session clears both the source of truth and the credential',
      () async {
    final IamRuntime runtime = _runtime();
    await runtime.initialize();
    await runtime.establishSession(
      accessToken: 'session-access-token',
      authToken: 'session-auth-token',
      refreshToken: 'session-refresh-token',
      tenantId: 'tenant-1',
      userId: 'user-1',
    );
    final IamAuthAppSdkDataSource dataSource = _dataSource(runtime);
    expect(dataSource.currentSession, isNotNull);

    await runtime.clearSession();

    expect(dataSource.currentSession, isNull);
    expect(runtime.tokenManager.currentAccessToken, _bootstrapToken);
  });

  test(
      'credential entry uses the bootstrap token and rejects a second challenge',
      () async {
    final Queue<Map<String, dynamic>> responses =
        Queue<Map<String, dynamic>>.of(
      <Map<String, dynamic>>[
        <String, dynamic>{
          'challengeType': 'LOGIN_CONTEXT_SELECTION',
          'continuationToken': 'first-continuation-token',
          'organizations': <Map<String, dynamic>>[
            <String, dynamic>{
              'organizationId': '42',
              'displayName': 'Engineering',
            },
          ],
        },
        <String, dynamic>{
          'challengeType': 'LOGIN_CONTEXT_SELECTION',
          'continuationToken': 'second-continuation-token',
          'organizations': <Map<String, dynamic>>[
            <String, dynamic>{
              'organizationId': '42',
              'displayName': 'Engineering',
            },
          ],
        },
      ],
    );
    final List<({String path, String? accessToken, String? authorization})>
        requests =
        <({String path, String? accessToken, String? authorization})>[];
    final HttpServer server =
        await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    final StreamSubscription<HttpRequest> subscription = server.listen(
      (HttpRequest request) async {
        requests.add((
          path: request.uri.path,
          accessToken: request.headers.value('access-token'),
          authorization: request.headers.value('authorization'),
        ));
        await request.drain<void>();
        request.response.headers.contentType = ContentType.json;
        request.response.write(jsonEncode(<String, dynamic>{
          'code': 0,
          'data': responses.removeFirst(),
          'traceId': 'trace-1',
        }));
        await request.response.close();
      },
    );
    addTearDown(() async {
      await subscription.cancel();
      await server.close(force: true);
    });

    final IamRuntime runtime = _runtime();
    await runtime.initialize();
    final SdkworkAppClient client = SdkworkAppClient.withBaseUrl(
      baseUrl: 'http://127.0.0.1:${server.port}',
    );
    addTearDown(client.close);
    final IamAuthAppSdkDataSource dataSource = IamAuthAppSdkDataSource(
      client: client,
      runtime: runtime,
    );

    final IamFlutterMobileLoginResult result =
        await dataSource.signInWithPassword(
      password: 'password-123',
      username: 'user@example.com',
    );
    expect(result, isA<IamFlutterMobileLoginContextSelectionRequiredResult>());
    expect(runtime.hasSession, isFalse);

    await expectLater(
      dataSource.selectLoginContext(
        buildPersonalLoginContextSelectionBody('first-continuation-token'),
      ),
      throwsStateError,
    );
    expect(runtime.hasSession, isFalse);
    expect(runtime.tokenManager.currentAccessToken, _bootstrapToken);
    expect(requests, hasLength(2));
    expect(requests.first.path, endsWith('/auth/sessions'));
    expect(
        requests.last.path, endsWith('/auth/sessions/login_context_selection'));
    for (final request in requests) {
      expect(request.accessToken, _bootstrapToken);
      expect(request.authorization, isNull);
    }
  });

  test('sign-out clears local authentication when remote revocation fails',
      () async {
    final HttpServer server =
        await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    final StreamSubscription<HttpRequest> subscription = server.listen(
      (HttpRequest request) async {
        await request.drain<void>();
        request.response.statusCode = HttpStatus.internalServerError;
        request.response.write('revocation failed');
        await request.response.close();
      },
    );
    addTearDown(() async {
      await subscription.cancel();
      await server.close(force: true);
    });

    final IamRuntime runtime = _runtime();
    await runtime.initialize();
    await runtime.establishSession(
      accessToken: 'session-access-token',
      authToken: 'session-auth-token',
      tenantId: 'tenant-1',
      userId: 'user-1',
    );
    final SdkworkAppClient client = SdkworkAppClient.withBaseUrl(
      baseUrl: 'http://127.0.0.1:${server.port}',
    );
    addTearDown(client.close);
    final IamAuthAppSdkDataSource dataSource = IamAuthAppSdkDataSource(
      client: client,
      runtime: runtime,
    );

    await dataSource.signOut();

    expect(runtime.hasSession, isFalse);
    expect(runtime.tokenManager.currentAccessToken, _bootstrapToken);
    expect(runtime.tokenManager.currentAuthToken, isNull);
  });
}
