import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';

import 'login_context.dart';

class IamFlutterMobileAuthSession {
  const IamFlutterMobileAuthSession({
    this.accessToken,
    this.authToken,
    this.refreshToken,
    this.sessionId,
    this.userId,
    this.tenantId,
    this.organizationId,
    this.loginScope,
  });

  final String? accessToken;
  final String? authToken;
  final String? refreshToken;
  final String? sessionId;
  final String? userId;
  final String? tenantId;
  final String? organizationId;
  final String? loginScope;

  /// True only when this value is a complete dual-token user session.
  bool get isComplete =>
      userId != null &&
      tenantId != null &&
      accessToken != null &&
      authToken != null;
}

class IamFlutterMobileLoginCredentials {
  const IamFlutterMobileLoginCredentials({
    required this.password,
    required this.username,
  });

  final String password;
  final String username;
}

typedef IamFlutterMobileAuthSessionCreator = Future<Map<String, dynamic>>
    Function(
  IamFlutterMobileLoginCredentials credentials,
);

typedef IamFlutterMobileLoginContextSelectionCreator
    = Future<Map<String, dynamic>> Function(
  Map<String, String> body,
);

typedef IamFlutterMobileOAuthSessionCreator = Future<Map<String, dynamic>>
    Function(
  Map<String, String> body,
);

typedef IamFlutterMobileAuthLogout = Future<void> Function();

sealed class IamFlutterMobileLoginResult {
  const IamFlutterMobileLoginResult();
}

class IamFlutterMobileLoginSessionResult extends IamFlutterMobileLoginResult {
  const IamFlutterMobileLoginSessionResult(this.session);

  final IamFlutterMobileAuthSession session;
}

class IamFlutterMobileLoginContextSelectionRequiredResult
    extends IamFlutterMobileLoginResult {
  const IamFlutterMobileLoginContextSelectionRequiredResult(this.challenge);

  final IamLoginContextSelectionChallenge challenge;
}

/// Framework-independent auth session controller for Flutter host apps.
class IamFlutterMobileAuthSessionController {
  IamFlutterMobileAuthSessionController({
    required IamFlutterMobileAuthSessionCreator createSession,
    required IamFlutterMobileAuthLogout logout,
    IamFlutterMobileLoginContextSelectionCreator? createLoginContextSelection,
    IamFlutterMobileOAuthSessionCreator? createOAuthSession,
    IamFlutterMobileOAuthSessionCreator? createMiniProgramSession,
  })  : _createSession = createSession,
        _createLoginContextSelection = createLoginContextSelection,
        _createOAuthSession = createOAuthSession,
        _createMiniProgramSession = createMiniProgramSession,
        _logout = logout;

  final IamFlutterMobileAuthSessionCreator _createSession;
  final IamFlutterMobileLoginContextSelectionCreator?
      _createLoginContextSelection;
  final IamFlutterMobileOAuthSessionCreator? _createOAuthSession;
  final IamFlutterMobileOAuthSessionCreator? _createMiniProgramSession;
  final IamFlutterMobileAuthLogout _logout;

  IamFlutterMobileAuthSession? _session;
  IamLoginContextSelectionChallenge? _challenge;

  IamFlutterMobileAuthSession? get session => _session;

  IamLoginContextSelectionChallenge? get challenge => _challenge;

  Future<IamFlutterMobileLoginResult> login(
    IamFlutterMobileLoginCredentials credentials,
  ) async {
    final payload = await _createSession(credentials);
    final parsedChallenge = parseIamLoginContextSelectionChallenge(payload);
    if (parsedChallenge != null || isIamLoginContextSelectionPayload(payload)) {
      _challenge =
          parsedChallenge ?? parseIamLoginContextSelectionChallenge(payload);
      _session = null;
      return IamFlutterMobileLoginContextSelectionRequiredResult(_challenge!);
    }

    _challenge = null;
    _session = parseIamFlutterMobileAuthSession(payload);
    return IamFlutterMobileLoginSessionResult(_session!);
  }

  Future<IamFlutterMobileAuthSession> loginWithOAuth({
    required String provider,
    required String code,
    required String state,
    String? redirectUri,
  }) async {
    final creator = _createOAuthSession;
    if (creator == null) {
      throw StateError('OAuth session creation is not configured');
    }
    final payload = await creator({
      'provider': provider,
      'code': code,
      'state': state,
      if (sdkworkNormalizeOptionalString(redirectUri) case final value?)
        'redirectUri': value,
    });
    _challenge = null;
    _session = parseIamFlutterMobileAuthSession(payload);
    return _session!;
  }

  Future<IamFlutterMobileAuthSession> loginWithMiniProgram({
    required String jsCode,
    String? surfaceCode,
  }) async {
    final creator = _createMiniProgramSession;
    if (creator == null) {
      throw StateError('mini program session creation is not configured');
    }
    final payload = await creator({
      'jsCode': jsCode,
      'providerCode': 'wechat_mini_program',
      if (sdkworkNormalizeOptionalString(surfaceCode) case final value?)
        'surfaceCode': value,
    });
    _challenge = null;
    _session = parseIamFlutterMobileAuthSession(payload);
    return _session!;
  }

  Future<IamFlutterMobileAuthSession> selectPersonalLogin(
      String continuationToken) async {
    final creator = _createLoginContextSelection;
    if (creator == null) {
      throw StateError('login context selection is not configured');
    }

    final payload = await creator(
        buildPersonalLoginContextSelectionBody(continuationToken));
    _challenge = null;
    _session = parseIamFlutterMobileAuthSession(payload);
    return _session!;
  }

  Future<IamFlutterMobileAuthSession> selectOrganization({
    required String continuationToken,
    required String organizationId,
  }) async {
    final creator = _createLoginContextSelection;
    if (creator == null) {
      throw StateError('login context selection is not configured');
    }

    final payload = await creator(
      buildOrganizationLoginContextSelectionBody(
        continuationToken,
        organizationId,
      ),
    );
    _challenge = null;
    _session = parseIamFlutterMobileAuthSession(payload);
    return _session!;
  }

  Future<void> signOut() async {
    await _logout();
    _session = null;
    _challenge = null;
  }
}

IamFlutterMobileAuthSession parseIamFlutterMobileAuthSession(
  Map<String, dynamic> payload,
) {
  final Map<String, dynamic> context = payload['context'] is Map
      ? Map<String, dynamic>.from(payload['context'] as Map)
      : <String, dynamic>{};
  final Map<String, dynamic> user = payload['user'] is Map
      ? Map<String, dynamic>.from(payload['user'] as Map)
      : <String, dynamic>{};
  String? read(Iterable<Object?> keys) {
    for (final Object? key in keys) {
      final String? value = _optionalString(payload[key]);
      if (value != null) return value;
    }
    return null;
  }

  String? contextRead(Iterable<Object?> keys) {
    for (final Object? key in keys) {
      final String? value = _optionalString(context[key]);
      if (value != null) return value;
    }
    return null;
  }

  final String? organizationId =
      contextRead(<Object?>['organizationId', 'organization_id']);
  final session = IamFlutterMobileAuthSession(
    accessToken: read(<Object?>['accessToken', 'access_token']),
    authToken: read(<Object?>['authToken', 'auth_token']),
    refreshToken: read(<Object?>['refreshToken', 'refresh_token']),
    sessionId: contextRead(<Object?>['sessionId', 'session_id']) ??
        read(<Object?>['sessionId', 'session_id']),
    userId: contextRead(<Object?>['userId', 'user_id']) ??
        read(<Object?>['userId', 'user_id']) ??
        _optionalString(user['userId']) ??
        _optionalString(user['id']),
    tenantId: contextRead(<Object?>['tenantId', 'tenant_id']) ??
        read(<Object?>['tenantId', 'tenant_id']) ??
        _optionalString(user['tenantId']) ??
        _optionalString(user['tenant_id']),
    organizationId: organizationId,
    loginScope: contextRead(<Object?>['loginScope', 'login_scope']) ??
        read(<Object?>['loginScope', 'login_scope']),
  );
  if (!session.isComplete ||
      (organizationId != null &&
          organizationId != '0' &&
          session.loginScope == null) ||
      (organizationId != null &&
          organizationId != '0' &&
          session.loginScope != 'ORGANIZATION') ||
      ((organizationId == null || organizationId == '0') &&
          session.loginScope != null &&
          session.loginScope != 'TENANT')) {
    throw const FormatException(
        'The sign-in response did not contain a complete dual-token session.');
  }
  return session;
}

String? _optionalString(Object? value) => sdkworkNormalizeOptionalString(value);
