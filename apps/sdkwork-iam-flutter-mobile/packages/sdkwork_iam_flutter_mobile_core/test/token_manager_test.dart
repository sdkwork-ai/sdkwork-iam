// SDKWORK-IAM-FLUTTER: authored token-manager test.
// Pins the two contracts the Flutter bootstrap depends on: an access token can be
// seeded exactly once before login, and a cleared token is observable so every
// SDK client can drop its stale credential.

import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';
import 'package:test/test.dart';

void main() {
  test('hasAccessToken reports credential availability, not a signed-in session', () {
    final SdkworkTokenManager tokenManager = SdkworkTokenManager();
    expect(tokenManager.hasAccessToken, isFalse);

    tokenManager.setTokens(accessToken: 'public-application-token');

    expect(tokenManager.hasAccessToken, isTrue);
  });

  test('bootstrap seeding is idempotent and never overwrites a session token', () {
    final SdkworkTokenManager tokenManager = SdkworkTokenManager();
    tokenManager.seedBootstrapAccessToken(' public-application-token ');
    expect(tokenManager.currentAccessToken, 'public-application-token');

    tokenManager.setTokens(accessToken: 'session-access-token', refreshToken: 'refresh');
    tokenManager.seedBootstrapAccessToken('another-public-token');

    expect(tokenManager.currentAccessToken, 'session-access-token');
    expect(tokenManager.currentRefreshToken, 'refresh');
  });

  test('blank credentials normalize to null instead of an empty token', () {
    final SdkworkTokenManager tokenManager = SdkworkTokenManager();

    tokenManager.setTokens(accessToken: '  ', refreshToken: '');

    expect(tokenManager.currentAccessToken, isNull);
    expect(tokenManager.currentRefreshToken, isNull);
    expect(tokenManager.hasAccessToken, isFalse);
  });

  test('a cleared token is delivered to the listener', () {
    final SdkworkTokenManager tokenManager = SdkworkTokenManager();
    final List<String?> observed = <String?>[];
    tokenManager.addListener(observed.add);
    tokenManager.setTokens(accessToken: 'session-access-token');

    tokenManager.clear();

    expect(observed, <String?>['session-access-token', null]);
  });
}
