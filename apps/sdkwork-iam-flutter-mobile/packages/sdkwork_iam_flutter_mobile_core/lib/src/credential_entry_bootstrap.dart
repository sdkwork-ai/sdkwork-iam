import 'dart:convert';

const String sdkworkAccessTokenEnvironmentKey = 'SDKWORK_ACCESS_TOKEN';

/// Issuer of the public application access token (APP_ACCESS_TOKEN_SPEC section 3).
const String sdkworkPublicApplicationTokenIssuer = 'sdkwork-iam-public';

/// Token class of the public application access token.
const String sdkworkPublicApplicationTokenClass = 'application';

/// Environments whose embedded credentials are restricted to the public token.
const List<String> sdkworkCredentialEntryRestrictedEnvironments = <String>[
  'staging',
  'production',
  'prod',
];

/// Profile file the selected build reads `SDKWORK_ACCESS_TOKEN` from, or null
/// when the profile id was not supplied.
String? sdkworkFlutterCredentialEntryBootstrapProfileFile(String? profileId) {
  final String normalized = profileId?.trim() ?? '';
  return normalized.isEmpty ? null : 'env/sdkwork.$normalized.json';
}

/// True when [token] is the public application access token.
///
/// APP_ACCESS_TOKEN_SPEC sections 1 and 3: the public application token may be
/// embedded in every profile, including staging and production. It is a
/// three-part JWT compact string carrying `token_class:application` and
/// `iss:sdkwork-iam-public`; nothing else may be embedded.
bool isSdkworkPublicApplicationAccessToken(String token) {
  final List<String> parts = token.trim().split('.');
  if (parts.length != 3 || parts.any((String part) => part.trim().isEmpty)) {
    return false;
  }
  final Map<String, dynamic>? payload = _decodeJwtPayload(parts[1]);
  if (payload == null) {
    return false;
  }
  return payload['token_class'] == sdkworkPublicApplicationTokenClass &&
      payload['iss'] == sdkworkPublicApplicationTokenIssuer;
}

Map<String, dynamic>? _decodeJwtPayload(String segment) {
  try {
    final String decoded = utf8.decode(base64Url.decode(base64Url.normalize(segment)));
    final Object? payload = jsonDecode(decoded);
    if (payload is Map<String, dynamic>) return payload;
    if (payload is Map) return Map<String, dynamic>.from(payload);
    return null;
  } catch (_) {
    // A malformed segment is simply not the public application token; the caller
    // turns that into the profile-specific failure below.
    return null;
  }
}

String? resolveSdkworkFlutterCredentialEntryBootstrapAccessToken({
  String? hostAccessToken,
  String environment = const String.fromEnvironment(
    'FLUTTER_ENV',
    defaultValue: 'development',
  ),
  String compileTimeAccessToken = const String.fromEnvironment(
    sdkworkAccessTokenEnvironmentKey,
  ),
}) {
  final String normalizedEnvironment = environment.trim().toLowerCase();
  final String? embeddedToken = _normalizeOptionalText(compileTimeAccessToken);
  if (embeddedToken != null &&
      sdkworkCredentialEntryRestrictedEnvironments.contains(normalizedEnvironment) &&
      !isSdkworkPublicApplicationAccessToken(embeddedToken)) {
    throw StateError(
      '$sdkworkAccessTokenEnvironmentKey must only embed the public application '
      'access token (token_class=$sdkworkPublicApplicationTokenClass, '
      'iss=$sdkworkPublicApplicationTokenIssuer) in $normalizedEnvironment Flutter '
      'artifacts; any other credential must come from a trusted native host channel',
    );
  }

  final String? trustedHostToken = _normalizeOptionalText(hostAccessToken);
  if (trustedHostToken != null) {
    return trustedHostToken;
  }

  return embeddedToken;
}

String requireSdkworkFlutterCredentialEntryBootstrapAccessToken(
  String? accessToken, {
  String? profileId,
}) {
  final String? normalized = _normalizeOptionalText(accessToken);
  if (normalized == null) {
    final String? profileFile =
        sdkworkFlutterCredentialEntryBootstrapProfileFile(profileId);
    final String source = profileFile == null
        ? 'the profile file passed with --dart-define-from-file'
        : profileFile;
    throw StateError(
      '$sdkworkAccessTokenEnvironmentKey is required before Flutter '
      'credential-entry SDK calls; pass it through --dart-define-from-file=$source',
    );
  }
  return normalized;
}

String? _normalizeOptionalText(String? value) {
  final String? normalized = value?.trim();
  return normalized == null || normalized.isEmpty ? null : normalized;
}
