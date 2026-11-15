// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * The root's global token-manager equivalent (section 6).
 *
 * One instance is shared by every authenticated app-api client and the explicit
 * backend-admin client, so a refresh in one tier cannot leave another tier holding
 * a stale token.
 */

/// Single access/refresh token owner of the application root.
class SdkworkTokenManager {
  SdkworkTokenManager({String? accessToken, String? refreshToken})
      : _accessToken = normalizeAccessToken(accessToken),
        _refreshToken = normalizeAccessToken(refreshToken);

  String? _accessToken;
  String? _refreshToken;

  final List<void Function(String?)> _listeners = <void Function(String?)>[];

  /// Normalized form of one credential value: trimmed, with empty as null.
  static String? normalizeAccessToken(String? value) {
    final String trimmed = value?.trim() ?? '';
    return trimmed.isEmpty ? null : trimmed;
  }

  /// Current access token, or null when the session was cleared.
  String? get currentAccessToken => _accessToken;

  /// Current refresh token, or null.
  String? get currentRefreshToken => _refreshToken;

  /// True when an access token is held.
  ///
  /// This answers "can a credential-entry request be dispatched", not "is a user
  /// signed in": the public application access token is present before login.
  bool get hasAccessToken => _accessToken != null;

  /// Seeds the public application access token exactly once.
  ///
  /// Bootstrap calls this before any SDK client is constructed. It is
  /// idempotent and never replaces an existing credential, so a restored or
  /// signed-in session is not overwritten by the bootstrap token; an empty
  /// [accessToken] is ignored instead of clearing the manager.
  void seedBootstrapAccessToken(String accessToken) {
    if (hasAccessToken) return;
    final String? normalized = normalizeAccessToken(accessToken);
    if (normalized == null) return;
    setTokens(accessToken: normalized);
  }

  /// Replaces the credential pair after a successful login or refresh.
  void setTokens({String? accessToken, String? refreshToken}) {
    _accessToken = normalizeAccessToken(accessToken);
    _refreshToken = normalizeAccessToken(refreshToken);
    for (final void Function(String?) listener in List<void Function(String?)>.of(_listeners)) {
      listener(_accessToken);
    }
  }

  /// Clears every credential.
  ///
  /// Section 6: logout and refresh failure must clear the token manager, the
  /// context store and the sensitive session state together.
  void clear() {
    setTokens();
  }

  /// Notifies the listener whenever the access token changes.
  void Function() addListener(void Function(String?) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }
}
