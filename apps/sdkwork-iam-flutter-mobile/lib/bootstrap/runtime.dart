// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import 'host_adapters.dart';
import 'iam_runtime.dart';
import 'routes.dart';
import 'sdk_clients.dart';

/// Boots the root in the order section 6 requires: token manager, then SDK
/// clients, then platform adapters, then route assembly.
Future<void> bootstrap() async {
  createIamRuntime();
  createSdkClients();
  await registerHostAdapters();
  createRoutes();
}
