// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * SDK factory contract of the `console` tier (section 3: the core owns SDK
 * factories, not business workflows).
 *
 * The concrete clients are constructed by the runtime/bootstrap, which is where
 * section 6 puts construction; this contract is what the bootstrap implements and
 * what feature packages are typed against, so a capability package can receive a
 * client without ever naming the generated SDK family.
 */

import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';
import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';

/// Builds one generated SDK client for this tier.
abstract class IamFlutterMobileConsoleCoreSdkClientFactory<TClient> {
  /// Builds a client bound to the resolved runtime configuration and the root's
  /// single token manager.
  TClient create({
    required SdkworkRuntimeEnv env,
    required SdkworkTokenManager tokenManager,
  });

  /// Client class the injected implementation must return.
  String get clientClass => 'SdkworkAppClient';
}
