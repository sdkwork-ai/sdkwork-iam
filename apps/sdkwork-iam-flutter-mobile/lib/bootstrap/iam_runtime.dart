// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';

import 'environment.dart';

/// Resolves the public application access token this build carries.
///
/// Bootstrap supplies the dart-define implementation; a test supplies a constant
/// so seed, restore and clear are exercised without platform channels.
typedef IamBootstrapAccessTokenResolver = String Function();

/// Secure-storage keys of the session fields persisted at login.
///
/// The values are session tokens and identifiers, never the public application
/// access token: that one is rebuilt from the committed profile at launch.
const String iamSessionAccessTokenStorageKey = 'sdkwork.iam.session.access_token';
const String iamSessionRefreshTokenStorageKey = 'sdkwork.iam.session.refresh_token';
const String iamSessionUserIdStorageKey = 'sdkwork.iam.session.user_id';
const String iamSessionTenantIdStorageKey = 'sdkwork.iam.session.tenant_id';
const String iamSessionOrganizationIdStorageKey = 'sdkwork.iam.session.organization_id';
const String iamSessionIdStorageKey = 'sdkwork.iam.session.session_id';

const List<String> iamSessionStorageKeys = <String>[
  iamSessionAccessTokenStorageKey,
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
  })  : secureStorage = secureStorage ?? const FlutterSecureStorage(),
        _resolveBootstrapAccessToken =
            bootstrapAccessTokenResolver ?? _resolveDartDefineBootstrapAccessToken;

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
  }) =>
      _instance = IamRuntime._(
        secureStorage: secureStorage,
        bootstrapAccessTokenResolver: bootstrapAccessTokenResolver,
      );

  /// Global token manager shared by every tier client.
  final SdkworkTokenManager tokenManager = SdkworkTokenManager();

  /// Session context store of the default app tier.
  final IamFlutterMobileCoreContextStore contextStore = IamFlutterMobileCoreContextStore();

  /// Secure platform storage, so a session survives a process restart.
  final FlutterSecureStorage secureStorage;

  final IamBootstrapAccessTokenResolver _resolveBootstrapAccessToken;

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
    String? refreshToken,
    required String userId,
    String? tenantId,
    String? organizationId,
    String? sessionId,
  }) async {
    final String? normalizedAccessToken = sdkworkNormalizeOptionalString(accessToken);
    final String? normalizedUserId = sdkworkNormalizeOptionalString(userId);
    if (normalizedAccessToken == null) {
      throw StateError('A session access token is required to establish a session.');
    }
    if (normalizedUserId == null) {
      throw StateError('A user id is required to establish a session.');
    }
    final IamFlutterMobileCoreSessionContext context = IamFlutterMobileCoreSessionContext(
      accessToken: normalizedAccessToken,
      refreshToken: sdkworkNormalizeOptionalString(refreshToken),
      organizationId: sdkworkNormalizeOptionalString(organizationId),
      sessionId: sdkworkNormalizeOptionalString(sessionId),
      tenantId: sdkworkNormalizeOptionalString(tenantId),
      userId: normalizedUserId,
    );
    await _persistSession(context);
    tokenManager.setTokens(
      accessToken: context.accessToken,
      refreshToken: context.refreshToken,
    );
    contextStore.set(context);
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
    final String? accessToken =
        sdkworkNormalizeOptionalString(await secureStorage.read(key: iamSessionAccessTokenStorageKey));
    final String? userId =
        sdkworkNormalizeOptionalString(await secureStorage.read(key: iamSessionUserIdStorageKey));
    if (accessToken == null || userId == null) {
      // A partial record is not a session; drop it so the next launch starts from
      // a clean bootstrap state instead of restoring half a session.
      await _deletePersistedSession();
      return;
    }
    final IamFlutterMobileCoreSessionContext context = IamFlutterMobileCoreSessionContext(
      accessToken: accessToken,
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
      userId: userId,
    );
    tokenManager.setTokens(
      accessToken: context.accessToken,
      refreshToken: context.refreshToken,
    );
    contextStore.set(context);
  }

  Future<void> _persistSession(IamFlutterMobileCoreSessionContext context) async {
    await _writeOrDelete(iamSessionAccessTokenStorageKey, context.accessToken);
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
