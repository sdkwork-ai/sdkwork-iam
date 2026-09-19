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

  @override
  TClient create({
    required SdkworkRuntimeEnv env,
    required SdkworkTokenManager tokenManager,
  }) =>
      _build(env, tokenManager);
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
IamSdkClients createSdkClients() {
  final SdkworkRuntimeEnv env = resolveEnvironment();
  final SdkworkTokenManager tokenManager = IamRuntime.instance.tokenManager;

  final SdkworkAppClient iamFlutterMobileCore = SdkworkAppClient.withBaseUrl(
    baseUrl: env.appApiBaseUrl,
    accessToken: tokenManager.currentAccessToken,
  );
  final SdkworkAppClient iamFlutterMobileConsoleCore = SdkworkAppClient.withBaseUrl(
    baseUrl: env.appApiBaseUrl,
    accessToken: tokenManager.currentAccessToken,
  );
  final SdkworkBackendClient iamFlutterMobileAdminCore = SdkworkBackendClient.withBaseUrl(
    baseUrl: env.apiBaseUrl,
    accessToken: tokenManager.currentAccessToken,
  );

  tokenManager.addListener((String? token) {
    if (token == null) return;
    iamFlutterMobileCore.setAccessToken(token);
    iamFlutterMobileConsoleCore.setAccessToken(token);
    iamFlutterMobileAdminCore.setAccessToken(token);
  });

  _clients = IamSdkClients(
    iamFlutterMobileCore: iamFlutterMobileCore,
    iamFlutterMobileConsoleCore: iamFlutterMobileConsoleCore,
    iamFlutterMobileAdminCore: iamFlutterMobileAdminCore,
  );
  return _clients!;
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
