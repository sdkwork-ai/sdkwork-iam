// SDKWORK-IAM-FLUTTER: authored runtime test.
// Pins the credential bootstrap contract of the Flutter root:
//
// - the public application access token is seeded into the one token manager
//   before any SDK client exists, and a missing token fails closed naming
//   `SDKWORK_ACCESS_TOKEN` and the profile file;
// - a bootstrap token never counts as a signed-in session;
// - a login session is persisted and restored with every field, and logout
//   restores the bootstrap token instead of clearing the credential.
//
// Secure storage and the token resolver are injected, so nothing here touches a
// platform channel.

import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile/bootstrap/iam_runtime.dart';
import 'package:sdkwork_iam_flutter_mobile/bootstrap/sdk_clients.dart';
import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';

const String _bootstrapToken = 'bootstrap-application-token';
const String _sessionToken = 'session-access-token';
const String _refreshToken = 'session-refresh-token';

class _MemorySecureStorage extends FlutterSecureStorage {
  _MemorySecureStorage([Map<String, String>? initial])
      : _values = <String, String>{...?initial};

  final Map<String, String> _values;

  Map<String, String> snapshot() => Map<String, String>.of(_values);

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
    final String? normalized = value?.trim();
    if (normalized == null || normalized.isEmpty) {
      _values.remove(key);
      return;
    }
    _values[key] = normalized;
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

  @override
  Future<void> deleteAll({
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    _values.clear();
  }
}

IamRuntime _runtime(_MemorySecureStorage storage) {
  return IamRuntime.createIamRuntime(
    secureStorage: storage,
    bootstrapAccessTokenResolver: () => _bootstrapToken,
  );
}

Map<String, String> _persistedSession() => <String, String>{
      iamSessionAccessTokenStorageKey: _sessionToken,
      iamSessionRefreshTokenStorageKey: _refreshToken,
      iamSessionOrganizationIdStorageKey: '42',
      iamSessionIdStorageKey: 'session-1',
      iamSessionTenantIdStorageKey: 'tenant-1',
      iamSessionUserIdStorageKey: 'user-1',
    };

void main() {
  test('initialize seeds the bootstrap token before any SDK client exists', () async {
    final _MemorySecureStorage storage = _MemorySecureStorage();
    final IamRuntime runtime = _runtime(storage);

    await runtime.initialize();

    expect(runtime.tokenManager.currentAccessToken, _bootstrapToken);
    expect(runtime.tokenManager.hasAccessToken, isTrue);
    expect(runtime.bootstrapAccessToken, _bootstrapToken);
  });

  test('a bootstrap token is not a signed-in session', () async {
    final IamRuntime runtime = _runtime(_MemorySecureStorage());

    await runtime.initialize();

    expect(runtime.tokenManager.currentAccessToken, _bootstrapToken);
    expect(runtime.contextStore.current, isNull);
    expect(runtime.hasSession, isFalse);
  });

  test('initialize fails closed naming the environment key and profile file', () async {
    // No resolver and no dart-define: the production default path must reject the
    // launch instead of constructing clients without an Access-Token.
    final IamRuntime runtime = IamRuntime.createIamRuntime(
      secureStorage: _MemorySecureStorage(),
    );

    await expectLater(
      runtime.initialize(),
      throwsA(
        isA<StateError>().having(
          (StateError error) => error.message,
          'message',
          allOf(
            contains(sdkworkAccessTokenEnvironmentKey),
            contains('--dart-define-from-file'),
          ),
        ),
      ),
    );
    expect(runtime.tokenManager.currentAccessToken, isNull);
  });

  test('initialize restores every persisted session field', () async {
    final _MemorySecureStorage storage = _MemorySecureStorage(_persistedSession());
    final IamRuntime runtime = _runtime(storage);

    await runtime.initialize();

    expect(runtime.tokenManager.currentAccessToken, _sessionToken);
    expect(runtime.tokenManager.currentRefreshToken, _refreshToken);
    expect(runtime.hasSession, isTrue);
    final IamFlutterMobileCoreSessionContext? context = runtime.contextStore.current;
    expect(context, isNotNull);
    expect(context?.accessToken, _sessionToken);
    expect(context?.refreshToken, _refreshToken);
    expect(context?.userId, 'user-1');
    expect(context?.tenantId, 'tenant-1');
    expect(context?.organizationId, '42');
    expect(context?.sessionId, 'session-1');
  });

  test('initialize drops a partial persisted record instead of half-signing-in', () async {
    final _MemorySecureStorage storage = _MemorySecureStorage(<String, String>{
      iamSessionAccessTokenStorageKey: _sessionToken,
    });
    final IamRuntime runtime = _runtime(storage);

    await runtime.initialize();

    expect(runtime.tokenManager.currentAccessToken, _bootstrapToken);
    expect(runtime.hasSession, isFalse);
    expect(storage.snapshot(), isEmpty);
  });

  test('establishSession persists all six fields and replaces the bootstrap token', () async {
    final _MemorySecureStorage storage = _MemorySecureStorage();
    final IamRuntime runtime = _runtime(storage);
    await runtime.initialize();

    await runtime.establishSession(
      accessToken: _sessionToken,
      organizationId: '42',
      refreshToken: _refreshToken,
      sessionId: 'session-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
    );

    expect(runtime.tokenManager.currentAccessToken, _sessionToken);
    expect(runtime.tokenManager.currentRefreshToken, _refreshToken);
    expect(runtime.hasSession, isTrue);
    expect(storage.snapshot(), _persistedSession());
  });

  test('logout restores the bootstrap token and clears the persisted session', () async {
    final _MemorySecureStorage storage = _MemorySecureStorage(_persistedSession());
    final IamRuntime runtime = _runtime(storage);
    await runtime.initialize();
    expect(runtime.hasSession, isTrue);

    await runtime.clearSession();

    expect(runtime.tokenManager.currentAccessToken, _bootstrapToken);
    expect(runtime.tokenManager.currentRefreshToken, isNull);
    expect(runtime.contextStore.current, isNull);
    expect(runtime.hasSession, isFalse);
    expect(storage.snapshot(), isEmpty);
  });

  test('the runtime survives logout so the sign-in screen keeps working', () async {
    final IamRuntime runtime = _runtime(_MemorySecureStorage());
    await runtime.initialize();
    final IamRuntime created = runtime;

    await runtime.clearSession();

    // `IamRuntime.instance` must still be the process runtime: a capability that
    // captured it before logout keeps a live token manager with the bootstrap
    // credential.
    expect(IamRuntime.instance, same(created));
    expect(IamRuntime.instance.tokenManager.currentAccessToken, _bootstrapToken);
  });

  test('every committed profile carries a public token the resolver accepts', () {
    // APP_ACCESS_TOKEN_SPEC sections 1 and 3: the public application token is the
    // only credential a profile may embed, in staging and production too.
    final List<FileSystemEntity> entries = Directory('env').listSync()..sort(
        (FileSystemEntity left, FileSystemEntity right) => left.path.compareTo(right.path));
    expect(entries, isNotEmpty);
    for (final FileSystemEntity entity in entries) {
      if (entity is! File || !entity.path.endsWith('.json')) continue;
      final Object? decoded = jsonDecode(entity.readAsStringSync());
      expect(decoded, isA<Map<String, dynamic>>(), reason: entity.path);
      if (decoded is! Map<String, dynamic>) continue;
      final String? token = _readString(decoded['SDKWORK_ACCESS_TOKEN']);
      final String? environment = _readString(decoded['SDKWORK_ENVIRONMENT']);
      expect(token, isNotNull, reason: '${entity.path} is missing SDKWORK_ACCESS_TOKEN');
      expect(environment, isNotNull, reason: '${entity.path} is missing SDKWORK_ENVIRONMENT');
      if (token == null || environment == null) continue;
      expect(isSdkworkPublicApplicationAccessToken(token), isTrue, reason: entity.path);
      expect(
        resolveSdkworkFlutterCredentialEntryBootstrapAccessToken(
          environment: environment,
          compileTimeAccessToken: token,
        ),
        token,
        reason: '${entity.path} must be accepted in $environment',
      );
    }
  });

  test('bootstrap seeding never overwrites a session credential', () {
    final SdkworkTokenManager tokenManager = SdkworkTokenManager();
    tokenManager.seedBootstrapAccessToken(_bootstrapToken);
    tokenManager.setTokens(accessToken: _sessionToken);

    tokenManager.seedBootstrapAccessToken('another-bootstrap-token');

    expect(tokenManager.currentAccessToken, _sessionToken);
  });

  test('clearing the shared token clears every SDK client', () {
    final List<String> applied = <String>[];

    applyIamAccessTokenToClients(
      null,
      setAppClientAccessToken: applied.add,
      setConsoleClientAccessToken: applied.add,
      setAdminClientAccessToken: applied.add,
    );

    expect(applied, <String>['', '', '']);
  });

  test('a session token reaches every SDK client', () {
    final List<String> applied = <String>[];

    applyIamAccessTokenToClients(
      _sessionToken,
      setAppClientAccessToken: applied.add,
      setConsoleClientAccessToken: applied.add,
      setAdminClientAccessToken: applied.add,
    );

    expect(applied, <String>[_sessionToken, _sessionToken, _sessionToken]);
  });
}

String? _readString(Object? value) {
  if (value is String) {
    final String trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }
  return null;
}
