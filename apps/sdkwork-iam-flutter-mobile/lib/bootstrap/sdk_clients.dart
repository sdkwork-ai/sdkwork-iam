// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import 'package:sdkwork_iam_app_sdk/sdkwork_iam_app_sdk.dart';
import 'package:sdkwork_iam_backend_sdk/sdkwork_iam_backend_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';
import 'package:sdkwork_iam_flutter_mobile_console_core/sdkwork_iam_flutter_mobile_console_core.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_core/sdkwork_iam_flutter_mobile_admin_core.dart';

import 'environment.dart';
import 'iam_runtime.dart';

/// Realizes the tier factory contracts over the generated Dart SDK clients.
class IamSdkClientFactory<TClient>
    implements IamFlutterMobileCoreSdkClientFactory<TClient>, IamFlutterMobileConsoleCoreSdkClientFactory<TClient>, IamFlutterMobileAdminCoreSdkClientFactory<TClient> {
  IamSdkClientFactory(this._build);

  final TClient Function(SdkworkRuntimeEnv env, SdkworkTokenManager tokenManager) _build;

  /// Class name the tier contracts require an injected factory to return.
  ///
  /// Declared explicitly because all three factory interfaces expose it as an
  /// abstract getter; without it the class is not concrete and the root does not
  /// compile.
  @override
  String get clientClass => 'SdkworkAppClient';

  @override
  TClient create({
    required SdkworkRuntimeEnv env,
    required SdkworkTokenManager tokenManager,
  }) =>
      _build(env, tokenManager);
}

/// Applies one access-token change to every constructed SDK client.
///
/// Extracted from the token-manager listener so the clearing contract is
/// testable without a network or a platform channel: the generated clients take
/// a non-null token, and the empty string is how a cleared token is expressed.
/// A cleared token makes an access-token-only request fail closed before
/// dispatch instead of sending a stale `Access-Token`.
void applyIamAccessTokenToClients(
  String? token, {
  required void Function(String token) setAppClientAccessToken,
  required void Function(String token) setConsoleClientAccessToken,
  required void Function(String token) setAdminClientAccessToken,
}) {
  final String accessToken = token ?? '';
  setAppClientAccessToken(accessToken);
  setConsoleClientAccessToken(accessToken);
  setAdminClientAccessToken(accessToken);
}

/// Every SDK client the root constructed, per tier.
class IamSdkClients {
  const IamSdkClients({
    required this.iamFlutterMobileCore,
    required this.iamFlutterMobileConsoleCore,
    required this.iamFlutterMobileAdminCore,
  });

  /// App-tier client over `/app/v3/api`.
  final SdkworkAppClient iamFlutterMobileCore;

  /// User-facing console client over `/app/v3/api`.
  final SdkworkAppClient iamFlutterMobileConsoleCore;

  /// Approved operator client over `/backend/v3/api`.
  final SdkworkBackendClient iamFlutterMobileAdminCore;
}

IamSdkClients? _clients;

/// Builds the per-tier clients from the resolved runtime configuration.
///
/// Section 6: every authenticated client shares the one token manager, and a
/// refresh in one tier is pushed to the others so no client keeps a stale token.
/// Bootstrap calls this only after the token manager holds the bootstrap (or
/// restored session) token.
IamSdkClients createSdkClients() {
  final SdkworkRuntimeEnv env = resolveEnvironment();
  final SdkworkTokenManager tokenManager = IamRuntime.instance.tokenManager;

  final SdkworkAppClient iamFlutterMobileCore = SdkworkAppClient.withBaseUrl(
    baseUrl: env.appApiBaseUrl,
    accessToken: tokenManager.currentAccessToken,
    authToken: tokenManager.currentAuthToken,
  );
  final SdkworkAppClient iamFlutterMobileConsoleCore = SdkworkAppClient.withBaseUrl(
    baseUrl: env.appApiBaseUrl,
    accessToken: tokenManager.currentAccessToken,
    authToken: tokenManager.currentAuthToken,
  );
  final SdkworkBackendClient iamFlutterMobileAdminCore = SdkworkBackendClient.withBaseUrl(
    baseUrl: env.apiBaseUrl,
    accessToken: tokenManager.currentAccessToken,
    authToken: tokenManager.currentAuthToken,
  );

  tokenManager.addListener((String? token) {
    applyIamAccessTokenToClients(
      token,
      setAppClientAccessToken: iamFlutterMobileCore.setAccessToken,
      setConsoleClientAccessToken: iamFlutterMobileConsoleCore.setAccessToken,
      setAdminClientAccessToken: iamFlutterMobileAdminCore.setAccessToken,
    );
  });
  tokenManager.addAuthTokenListener((String? token) {
    final String authToken = token ?? '';
    iamFlutterMobileCore.setAuthToken(authToken);
    iamFlutterMobileConsoleCore.setAuthToken(authToken);
    iamFlutterMobileAdminCore.setAuthToken(authToken);
  });

  final IamSdkClients clients = IamSdkClients(
    iamFlutterMobileCore: iamFlutterMobileCore,
    iamFlutterMobileConsoleCore: iamFlutterMobileConsoleCore,
    iamFlutterMobileAdminCore: iamFlutterMobileAdminCore,
  );
  _clients = clients;
  return clients;
}

/// Active SDK clients, building them on first use.
IamSdkClients getSdkClients() => _clients ?? createSdkClients();

/// Closes and drops the constructed clients so logout cannot reuse them.
void resetSdkClients() {
  _clients?.iamFlutterMobileCore.close();
  _clients?.iamFlutterMobileConsoleCore.close();
  _clients?.iamFlutterMobileAdminCore.close();
  _clients = null;
}
