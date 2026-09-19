// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';

/// The root's IAM runtime: one token manager, one context store and the secure
/// storage the credentials are mirrored into (section 6).
class IamRuntime {
  IamRuntime._();

  static IamRuntime? _instance;

  /// The process-wide runtime instance.
  static IamRuntime get instance {
    final IamRuntime? current = _instance;
    if (current == null) {
      throw StateError('IamRuntime was read before bootstrap() created it.');
    }
    return current;
  }

  /// Creates the runtime instance during bootstrap.
  static IamRuntime createIamRuntime() => _instance = IamRuntime._();

  /// Global token manager shared by every tier client.
  final SdkworkTokenManager tokenManager = SdkworkTokenManager();

  /// Session context store of the default app tier.
  final IamFlutterMobileCoreContextStore contextStore = IamFlutterMobileCoreContextStore();

  /// Secure platform storage, so a token survives a process restart.
  final FlutterSecureStorage secureStorage = const FlutterSecureStorage();

  /// True when a complete session is available.
  bool get hasSession => contextStore.current?.isComplete ?? false;

  /// Clears every credential and the context store.
  ///
  /// Section 6: logout and refresh failure must clear the token manager, the
  /// context store, secure platform storage and the sensitive state together.
  Future<void> clearSession() async {
    tokenManager.clear();
    contextStore.clear();
    await secureStorage.deleteAll();
    _instance = null;
  }
}
