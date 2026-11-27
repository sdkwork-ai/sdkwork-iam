// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Session and context store of the `app` tier.
 *
 * Section 6: logout and refresh failure must clear the token manager, this context
 * store and the sensitive session state together.
 */

/// Authenticated session context.
class IamFlutterMobileCoreSessionContext {
  const IamFlutterMobileCoreSessionContext({
    this.userId,
    this.tenantId,
    this.organizationId,
    this.sessionId,
    this.accessToken,
    this.authToken,
    this.refreshToken,
    this.loginScope,
  });

  /// Authenticated user id.
  final String? userId;

  /// Active tenant id.
  final String? tenantId;

  /// Active organization id.
  final String? organizationId;

  /// Server-side session id of this session.
  final String? sessionId;

  /// Access token of this session, mirrored from the token manager.
  final String? accessToken;

  /// User authentication token sent as `Authorization: Bearer`.
  final String? authToken;

  /// Refresh token of this session, mirrored from the token manager.
  final String? refreshToken;

  /// Login scope (`TENANT` or `ORGANIZATION`) selected for this session.
  final String? loginScope;

  /// True only for a complete, coherent user session.
  ///
  /// Both session tokens and the user/tenant context are mandatory. Organization
  /// `0` is the personal-login sentinel, never an organization session.
  bool get isComplete {
    if (userId == null || tenantId == null || accessToken == null || authToken == null) {
      return false;
    }
    final String organization = organizationId ?? '';
    if (loginScope == 'ORGANIZATION') {
      return organization.isNotEmpty && organization != '0';
    }
    if (loginScope == 'TENANT') return organization.isEmpty || organization == '0';
    return loginScope == null && (organization.isEmpty || organization == '0');
  }
}

/// In-memory context store of the `app` tier.
class IamFlutterMobileCoreContextStore {
  IamFlutterMobileCoreSessionContext? _context;

  /// Current context, or null when signed out.
  IamFlutterMobileCoreSessionContext? get current => _context;

  /// Replaces the current context.
  void set(IamFlutterMobileCoreSessionContext context) {
    _context = context;
  }

  /// Clears the current context.
  void clear() {
    _context = null;
  }
}
