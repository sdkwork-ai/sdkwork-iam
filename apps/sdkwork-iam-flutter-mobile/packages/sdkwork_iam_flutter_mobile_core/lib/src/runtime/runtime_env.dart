// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Runtime configuration boundary of the application root.
 *
 * Section 9: the Flutter root reads non-secret runtime configuration from
 * `env/sdkwork.<deploymentProfile>.<environment>.json` through
 * `--dart-define-from-file`, so these arrive as compile-time constants and no
 * endpoint is hard-coded here.
 */

/// Non-secret runtime configuration of the application root.
class SdkworkRuntimeEnv {
  const SdkworkRuntimeEnv({
    required this.environment,
    required this.deploymentProfile,
    required this.profileId,
    required this.runtimeTarget,
    required this.appId,
    required this.apiBaseUrl,
    required this.appApiBaseUrl,
    required this.openApiBaseUrl,
    required this.iamIssuer,
  });

  /// Lifecycle environment (`development`, `test`, ...).
  final String environment;

  /// Deployment profile (`standalone` or `cloud`).
  final String deploymentProfile;

  /// Canonical profile id, `<deploymentProfile>.<environment>`.
  final String profileId;

  /// Runtime target of this build (`flutter-android`, `flutter-ios`, ...).
  final String runtimeTarget;

  /// Application id.
  final String appId;

  /// Platform API origin.
  final String apiBaseUrl;

  /// Application API origin.
  final String appApiBaseUrl;

  /// Open API origin.
  final String openApiBaseUrl;

  /// IAM issuer of this deployment profile.
  final String iamIssuer;

  /// True when this build targets a locally owned standalone gateway.
  bool get isStandalone => deploymentProfile == 'standalone';
}

/// Resolves runtime configuration from the dart-define environment.
SdkworkRuntimeEnv resolveSdkworkRuntimeEnv() {
  return const SdkworkRuntimeEnv(
    environment: String.fromEnvironment('SDKWORK_ENVIRONMENT'),
    deploymentProfile: String.fromEnvironment('SDKWORK_DEPLOYMENT_PROFILE'),
    profileId: String.fromEnvironment('SDKWORK_PROFILE_ID'),
    runtimeTarget: String.fromEnvironment('SDKWORK_RUNTIME_TARGET'),
    appId: String.fromEnvironment('SDKWORK_APP_ID'),
    apiBaseUrl: String.fromEnvironment('SDKWORK_API_BASE_URL'),
    appApiBaseUrl: String.fromEnvironment('SDKWORK_APP_API_BASE_URL'),
    openApiBaseUrl: String.fromEnvironment('SDKWORK_OPEN_API_BASE_URL'),
    iamIssuer: String.fromEnvironment('SDKWORK_IAM_ISSUER'),
  );
}
