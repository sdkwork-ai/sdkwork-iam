// SDKWORK-IAM-FLUTTER-BOOTSTRAP: authored bootstrap order.
import 'host_adapters.dart';
import 'iam_runtime.dart';
import 'routes.dart';
import 'sdk_clients.dart';

/// Boots the root in the order section 6 requires: resolve and seed the public
/// application access token, restore a persisted session, build the SDK clients,
/// register the platform adapters, then assemble routes.
///
/// `IamRuntime.createIamRuntime()` is the static constructor, not a top-level
/// function: `createSdkClients()` reads `IamRuntime.instance.tokenManager`, so the
/// runtime has to exist first and a missing call surfaces as a `StateError` naming
/// the bootstrap step that was skipped.
///
/// `initialize()` is awaited before `createSdkClients()` on purpose: a client
/// constructed while the token manager is empty caches a null `Access-Token`, and
/// every credential-entry route would then fail before dispatch.
Future<void> bootstrap() async {
  final IamRuntime runtime = IamRuntime.createIamRuntime();
  await runtime.initialize();
  createSdkClients();
  await registerHostAdapters();
  createRoutes();
}
