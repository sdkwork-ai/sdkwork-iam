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
      : _accessToken = accessToken,
        _refreshToken = refreshToken;

  String? _accessToken;
  String? _refreshToken;

  final List<void Function(String?)> _listeners = <void Function(String?)>[];

  /// Current access token, or null when the session was cleared.
  String? get currentAccessToken => _accessToken;

  /// Current refresh token, or null.
  String? get currentRefreshToken => _refreshToken;

  /// Replaces the credential pair after a successful login or refresh.
  void setTokens({String? accessToken, String? refreshToken}) {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
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
