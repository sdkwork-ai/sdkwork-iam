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
    this.accessToken,
    this.refreshToken,
  });

  /// Authenticated user id.
  final String? userId;

  /// Active tenant id.
  final String? tenantId;

  /// Active organization id.
  final String? organizationId;

  /// Access token of this session, mirrored from the token manager.
  final String? accessToken;

  /// Refresh token of this session, mirrored from the token manager.
  final String? refreshToken;

  /// True when every field a signed-in session needs is present.
  bool get isComplete => userId != null && accessToken != null;
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
