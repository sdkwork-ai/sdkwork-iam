// SDKWORK-IAM-FLUTTER-BOOTSTRAP: authored bootstrap order.
import 'host_adapters.dart';
import 'iam_runtime.dart';
import 'routes.dart';
import 'sdk_clients.dart';

/// Boots the root in the order section 6 requires: token manager, then SDK
/// clients, then platform adapters, then route assembly.
///
/// `IamRuntime.createIamRuntime()` is the static constructor, not a top-level
/// function: `createSdkClients()` reads `IamRuntime.instance.tokenManager`, so the
/// runtime has to exist first and a missing call surfaces as a `StateError` naming
/// the bootstrap step that was skipped.
Future<void> bootstrap() async {
  IamRuntime.createIamRuntime();
  createSdkClients();
  await registerHostAdapters();
  createRoutes();
}
