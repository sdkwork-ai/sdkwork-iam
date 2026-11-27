// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:sdkwork_iam_app_sdk/sdkwork_iam_app_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';

import 'environment.dart';

/// Resolves the public application access token this build carries.
///
/// Bootstrap supplies the dart-define implementation; a test supplies a constant
/// so seed, restore and clear are exercised without platform channels.
typedef IamBootstrapAccessTokenResolver = String Function();

/// Validates a persisted session through the generated current-session API.
typedef IamCurrentSessionValidator = Future<Map<String, dynamic>> Function(
  IamFlutterMobileCoreSessionContext session,
);

/// Secure-storage keys of the session fields persisted at login.
///
/// The values are session tokens and identifiers, never the public application
/// access token: that one is rebuilt from the committed profile at launch.
const String iamSessionAccessTokenStorageKey = 'sdkwork.iam.session.access_token';
const String iamSessionAuthTokenStorageKey = 'sdkwork.iam.session.auth_token';
const String iamSessionLoginScopeStorageKey = 'sdkwork.iam.session.login_scope';
const String iamSessionRefreshTokenStorageKey = 'sdkwork.iam.session.refresh_token';
const String iamSessionUserIdStorageKey = 'sdkwork.iam.session.user_id';
const String iamSessionTenantIdStorageKey = 'sdkwork.iam.session.tenant_id';
const String iamSessionOrganizationIdStorageKey = 'sdkwork.iam.session.organization_id';
const String iamSessionIdStorageKey = 'sdkwork.iam.session.session_id';

const List<String> iamSessionStorageKeys = <String>[
  iamSessionAccessTokenStorageKey,
  iamSessionAuthTokenStorageKey,
  iamSessionLoginScopeStorageKey,
  iamSessionRefreshTokenStorageKey,
  iamSessionUserIdStorageKey,
  iamSessionTenantIdStorageKey,
  iamSessionOrganizationIdStorageKey,
  iamSessionIdStorageKey,
];

/// The root's IAM runtime: one token manager, one context store and the secure
/// storage the session is mirrored into (section 6).
class IamRuntime {
  IamRuntime._({
    FlutterSecureStorage? secureStorage,
    IamBootstrapAccessTokenResolver? bootstrapAccessTokenResolver,
    IamCurrentSessionValidator? currentSessionValidator,
  })  : secureStorage = secureStorage ?? const FlutterSecureStorage(),
        _resolveBootstrapAccessToken =
            bootstrapAccessTokenResolver ?? _resolveDartDefineBootstrapAccessToken,
        _validateCurrentSession = currentSessionValidator ?? _validateWithGeneratedSdk;

  static IamRuntime? _instance;

  /// The process-wide runtime instance.
  static IamRuntime get instance {
    final IamRuntime? current = _instance;
    if (current == null) {
      throw StateError('IamRuntime was read before bootstrap() created it.');
    }
    return current;
  }

  /// Creates the runtime instance during bootstrap.
  ///
  /// [secureStorage] and [bootstrapAccessTokenResolver] are injection points for
  /// tests; production uses the platform keystore and the dart-define profile.
  static IamRuntime createIamRuntime({
    FlutterSecureStorage? secureStorage,
    IamBootstrapAccessTokenResolver? bootstrapAccessTokenResolver,
    IamCurrentSessionValidator? currentSessionValidator,
  }) =>
      _instance = IamRuntime._(
        secureStorage: secureStorage,
        bootstrapAccessTokenResolver: bootstrapAccessTokenResolver,
        currentSessionValidator: currentSessionValidator,
      );

  /// Global token manager shared by every tier client.
  final SdkworkTokenManager tokenManager = SdkworkTokenManager();

  /// Session context store of the default app tier.
  final IamFlutterMobileCoreContextStore contextStore = IamFlutterMobileCoreContextStore();

  /// Secure platform storage, so a session survives a process restart.
  final FlutterSecureStorage secureStorage;

  final IamBootstrapAccessTokenResolver _resolveBootstrapAccessToken;
  final IamCurrentSessionValidator _validateCurrentSession;

  String? _bootstrapAccessToken;
  bool _initialized = false;

  /// True when a complete session is available.
  ///
  /// This is the context store's answer, never the token manager's: the public
  /// application access token is present before anyone signs in.
  bool get hasSession => contextStore.current?.isComplete ?? false;

  /// Public application access token of this launch, or null before
  /// [initialize] resolves it.
  String? get bootstrapAccessToken => _bootstrapAccessToken;

  /// Resolves and seeds the public application access token, then restores a
  /// persisted session.
  ///
  /// Section 6 order: the token exists in the one token manager before any SDK
  /// client is constructed, so a credential-entry call cannot dispatch without
  /// `Access-Token`. The public token is not a session: [hasSession] stays false
  /// until a real login (or a restored one) writes the context store.
  ///
  /// Throws [StateError] naming `SDKWORK_ACCESS_TOKEN` and the profile file when
  /// the build carries no application access token.
  Future<void> initialize() async {
    if (_initialized) return;
    final String bootstrapAccessToken = _resolveBootstrapAccessToken();
    _bootstrapAccessToken = bootstrapAccessToken;
    tokenManager.seedBootstrapAccessToken(bootstrapAccessToken);
    await _restorePersistedSession();
    _initialized = true;
  }

  /// Replaces the bootstrap credential with a real session and persists it.
  ///
  /// Called after a successful login. [userId] is required because the context
  /// store is what decides [hasSession]; a response without a user id is not a
  /// complete session.
  Future<void> establishSession({
    required String accessToken,
    required String authToken,
    String? refreshToken,
    required String userId,
    required String tenantId,
    String? organizationId,
    String? sessionId,
    String? loginScope,
  }) async {
    final String? normalizedAccessToken = sdkworkNormalizeOptionalString(accessToken);
    final String? normalizedAuthToken = sdkworkNormalizeOptionalString(authToken);
    final String? normalizedUserId = sdkworkNormalizeOptionalString(userId);
    final String? normalizedTenantId = sdkworkNormalizeOptionalString(tenantId);
    if (normalizedAccessToken == null || normalizedAuthToken == null) {
      throw StateError('Both session access and auth tokens are required to establish a session.');
    }
    if (normalizedUserId == null || normalizedTenantId == null) {
      throw StateError('A user id and tenant id are required to establish a session.');
    }
    final IamFlutterMobileCoreSessionContext context = IamFlutterMobileCoreSessionContext(
      accessToken: normalizedAccessToken,
      authToken: normalizedAuthToken,
      refreshToken: sdkworkNormalizeOptionalString(refreshToken),
      organizationId: sdkworkNormalizeOptionalString(organizationId),
      loginScope: sdkworkNormalizeOptionalString(loginScope),
      sessionId: sdkworkNormalizeOptionalString(sessionId),
      tenantId: normalizedTenantId,
      userId: normalizedUserId,
    );
    if (!context.isComplete) {
      throw StateError('The session context is incomplete or incoherent.');
    }
    final IamFlutterMobileCoreSessionContext? previous = contextStore.current;
    try {
      await _persistSession(context);
      tokenManager.setTokens(
        accessToken: context.accessToken,
        authToken: context.authToken,
        refreshToken: context.refreshToken,
      );
      contextStore.set(context);
    } catch (_) {
      tokenManager.setTokens(
        accessToken: previous?.accessToken ?? _bootstrapAccessToken,
        authToken: previous?.authToken,
        refreshToken: previous?.refreshToken,
      );
      if (previous == null) {
        contextStore.clear();
      } else {
        contextStore.set(previous);
      }
      rethrow;
    }
  }

  /// Restores the public application access token after the session ends.
  ///
  /// Logout and a refresh failure both call this (through [clearSession]) so the
  /// sign-in screen keeps a working credential-entry token instead of none.
  void restoreBootstrapAccessToken() {
    tokenManager.setTokens(accessToken: _bootstrapAccessToken);
  }

  /// Clears the session everywhere and restores the bootstrap credential.
  ///
  /// Section 6: logout and refresh failure clear the token manager's session
  /// tokens, the context store and the persisted session together — and leave
  /// the public application token behind, because credential entry needs it.
  Future<void> clearSession() async {
    restoreBootstrapAccessToken();
    contextStore.clear();
    await _deletePersistedSession();
  }

  Future<void> _restorePersistedSession() async {
    final IamFlutterMobileCoreSessionContext context = IamFlutterMobileCoreSessionContext(
      accessToken: sdkworkNormalizeOptionalString(
        await secureStorage.read(key: iamSessionAccessTokenStorageKey),
      ),
      authToken: sdkworkNormalizeOptionalString(
        await secureStorage.read(key: iamSessionAuthTokenStorageKey),
      ),
      loginScope: sdkworkNormalizeOptionalString(
        await secureStorage.read(key: iamSessionLoginScopeStorageKey),
      ),
      organizationId: sdkworkNormalizeOptionalString(
        await secureStorage.read(key: iamSessionOrganizationIdStorageKey),
      ),
      refreshToken: sdkworkNormalizeOptionalString(
        await secureStorage.read(key: iamSessionRefreshTokenStorageKey),
      ),
      sessionId: sdkworkNormalizeOptionalString(
        await secureStorage.read(key: iamSessionIdStorageKey),
      ),
      tenantId: sdkworkNormalizeOptionalString(
        await secureStorage.read(key: iamSessionTenantIdStorageKey),
      ),
      userId: sdkworkNormalizeOptionalString(
        await secureStorage.read(key: iamSessionUserIdStorageKey),
      ),
    );
    // Legacy single-token records cannot be authenticated. Drop them before any
    // client or context store can observe a partial session.
    if (!context.isComplete) {
      await _deletePersistedSession();
      return;
    }
    try {
      final Map<String, dynamic> current = await _validateCurrentSession(context);
      final IamFlutterMobileCoreSessionContext validated = _contextFromPayload(
        current,
        fallbackRefreshToken: context.refreshToken,
      );
      if (!validated.isComplete) throw StateError('The current session is incomplete.');
      await establishSession(
        accessToken: validated.accessToken!,
        authToken: validated.authToken!,
        refreshToken: validated.refreshToken,
        userId: validated.userId!,
        tenantId: validated.tenantId!,
        organizationId: validated.organizationId,
        loginScope: validated.loginScope,
        sessionId: validated.sessionId,
      );
    } catch (_) {
      // Offline, revoked, malformed and incomplete sessions all fail closed.
      await clearSession();
    }
  }

  IamFlutterMobileCoreSessionContext _contextFromPayload(
    Map<String, dynamic> payload, {
    String? fallbackRefreshToken,
  }) {
    final Map<String, dynamic> context = _map(payload['context']);
    final Map<String, dynamic> user = _map(payload['user']);
    String? read(Iterable<String> keys) {
      for (final String key in keys) {
        final String? value = _string(payload[key]) ?? _string(context[key]);
        if (value != null) return value;
      }
      return null;
    }

    return IamFlutterMobileCoreSessionContext(
      accessToken: read(<String>['accessToken', 'access_token']),
      authToken: read(<String>['authToken', 'auth_token']),
      refreshToken: read(<String>['refreshToken', 'refresh_token']) ?? fallbackRefreshToken,
      userId: read(<String>['userId', 'user_id', 'id']) ?? _string(user['userId']) ?? _string(user['id']),
      tenantId: read(<String>['tenantId', 'tenant_id']) ?? _string(user['tenantId']) ?? _string(user['tenant_id']),
      organizationId: read(<String>['organizationId', 'organization_id']),
      sessionId: read(<String>['sessionId', 'session_id']),
      loginScope: read(<String>['loginScope', 'login_scope']),
    );
  }

  static Map<String, dynamic> _map(Object? value) =>
      value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};

  static String? _string(Object? value) =>
      value is String && value.trim().isNotEmpty ? value.trim() : null;

  Future<void> _persistSession(IamFlutterMobileCoreSessionContext context) async {
    await _writeOrDelete(iamSessionAccessTokenStorageKey, context.accessToken);
    await _writeOrDelete(iamSessionAuthTokenStorageKey, context.authToken);
    await _writeOrDelete(iamSessionLoginScopeStorageKey, context.loginScope);
    await _writeOrDelete(iamSessionRefreshTokenStorageKey, context.refreshToken);
    await _writeOrDelete(iamSessionUserIdStorageKey, context.userId);
    await _writeOrDelete(iamSessionTenantIdStorageKey, context.tenantId);
    await _writeOrDelete(iamSessionOrganizationIdStorageKey, context.organizationId);
    await _writeOrDelete(iamSessionIdStorageKey, context.sessionId);
  }

  Future<void> _writeOrDelete(String key, String? value) async {
    final String? normalized = sdkworkNormalizeOptionalString(value);
    if (normalized == null) {
      await secureStorage.delete(key: key);
      return;
    }
    await secureStorage.write(key: key, value: normalized);
  }

  Future<void> _deletePersistedSession() async {
    for (final String key in iamSessionStorageKeys) {
      await secureStorage.delete(key: key);
    }
  }

  static Future<Map<String, dynamic>> _validateWithGeneratedSdk(
    IamFlutterMobileCoreSessionContext session,
  ) async {
    final SdkworkRuntimeEnv env = resolveEnvironment();
    final SdkworkAppClient client = SdkworkAppClient.withBaseUrl(
      baseUrl: env.appApiBaseUrl,
      authToken: session.authToken,
      accessToken: session.accessToken,
    );
    try {
      final Object? data = (await client.auth.sessionsCurrentRetrieve())?.data;
      if (data is! Map) throw StateError('The current-session response carried no data.');
      return Map<String, dynamic>.from(data);
    } finally {
      client.close();
    }
  }

  /// Reads the token from the dart-define profile of this build.
  static String _resolveDartDefineBootstrapAccessToken() {
    final SdkworkRuntimeEnv env = resolveEnvironment();
    final String? resolved = resolveSdkworkFlutterCredentialEntryBootstrapAccessToken(
      environment: env.environment,
    );
    return requireSdkworkFlutterCredentialEntryBootstrapAccessToken(
      resolved,
      profileId: env.profileId,
    );
  }
}
