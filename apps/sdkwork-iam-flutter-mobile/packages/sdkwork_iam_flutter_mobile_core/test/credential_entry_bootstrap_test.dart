import 'dart:convert';

import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';
import 'package:test/test.dart';

void main() {
  test('production accepts a trusted host token without embedded credentials',
      () {
    expect(
      resolveSdkworkFlutterCredentialEntryBootstrapAccessToken(
        hostAccessToken: ' host-bootstrap-token ',
        environment: 'production',
        compileTimeAccessToken: '',
      ),
      'host-bootstrap-token',
    );
  });

  test('development may use a compile-time bootstrap handoff', () {
    expect(
      resolveSdkworkFlutterCredentialEntryBootstrapAccessToken(
        environment: 'development',
        compileTimeAccessToken: ' development-token ',
      ),
      'development-token',
    );
  });

  test('staging and production accept the public application token', () {
    final String token = publicApplicationToken();
    for (final environment in ['staging', 'production', 'prod']) {
      expect(
        resolveSdkworkFlutterCredentialEntryBootstrapAccessToken(
          environment: environment,
          compileTimeAccessToken: ' $token ',
        ),
        token,
        reason: 'the public application token may be embedded in $environment',
      );
    }
  });

  test('staging and production reject any non-public credential', () {
    final List<String> credentials = <String>[
      'embedded-token',
      publicApplicationToken(tokenClass: 'session'),
      publicApplicationToken(issuer: 'sdkwork-iam'),
      'two.parts',
    ];
    for (final environment in ['staging', 'production', 'prod']) {
      for (final credential in credentials) {
        expect(
          () => resolveSdkworkFlutterCredentialEntryBootstrapAccessToken(
            hostAccessToken: 'host-bootstrap-token',
            environment: environment,
            compileTimeAccessToken: credential,
          ),
          throwsStateError,
          reason: '$credential must not be embedded in $environment',
        );
      }
    }
  });

  test('the public application token predicate matches APP_ACCESS_TOKEN_SPEC', () {
    expect(isSdkworkPublicApplicationAccessToken(publicApplicationToken()), isTrue);
    for (final candidate in <String>[
      '',
      'two.parts',
      'one.two.three.four',
      publicApplicationToken(tokenClass: 'operator'),
      publicApplicationToken(issuer: 'sdkwork-iam'),
      '${base64UrlToken(<String, Object?>{'alg': 'none'})}.${base64UrlToken(<String, Object?>{})}.public',
    ]) {
      expect(isSdkworkPublicApplicationAccessToken(candidate), isFalse, reason: candidate);
    }
  });

  test('a missing bootstrap credential fails closed naming the profile file', () {
    expect(
      resolveSdkworkFlutterCredentialEntryBootstrapAccessToken(
        compileTimeAccessToken: '',
      ),
      isNull,
    );
    expect(
      () => requireSdkworkFlutterCredentialEntryBootstrapAccessToken(null),
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
    expect(
      () => requireSdkworkFlutterCredentialEntryBootstrapAccessToken(
        null,
        profileId: 'staging',
      ),
      throwsA(
        isA<StateError>().having(
          (StateError error) => error.message,
          'message',
          allOf(
            contains(sdkworkAccessTokenEnvironmentKey),
            contains('env/sdkwork.staging.json'),
          ),
        ),
      ),
    );
    expect(sdkworkFlutterCredentialEntryBootstrapProfileFile('standalone.production'),
        'env/sdkwork.standalone.production.json');
  });
}

/// Builds a public application access token shaped like the committed profiles.
String publicApplicationToken({
  String tokenClass = 'application',
  String issuer = 'sdkwork-iam-public',
}) {
  final String header = base64UrlToken(<String, Object?>{
    'alg': 'none',
    'kid': 'public-app-token',
    'typ': 'JWT',
  });
  final String payload = base64UrlToken(<String, Object?>{
    'app_id': 'sdkwork-iam',
    'aud': 'sdkwork-iam',
    'iss': issuer,
    'token_class': tokenClass,
    'token_type': 'access',
    'token_version': 1,
    'session_id': 'bootstrap-public-sdkwork-iam-standalone.development',
    'tenant_id': '100001',
    'user_id': '0',
  });
  return '$header.$payload.public';
}

String base64UrlToken(Map<String, Object?> value) {
  return base64Url.encode(utf8.encode(jsonEncode(value))).replaceAll('=', '');
}
