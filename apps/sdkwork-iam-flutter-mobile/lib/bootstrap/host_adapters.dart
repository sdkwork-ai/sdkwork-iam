// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';

/// Secure-storage adapter over the platform keystore.
///
/// Section 7: only the bootstrap registers implementations, and an adapter exposes
/// no plugin type to a widget or service.
class SdkworkSecureStorageAdapter implements SdkworkHostAdapter {
  SdkworkSecureStorageAdapter({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  @override
  String get capability => SdkworkHostCapability.secureStorage;

  @override
  bool isAvailable() => true;

  /// Reads one secret, or null when it was never written.
  Future<String?> read(String key) => _storage.read(key: key);

  /// Writes one secret.
  Future<void> write(String key, String value) => _storage.write(key: key, value: value);

  /// Removes one secret.
  Future<void> delete(String key) => _storage.delete(key: key);
}

final Map<String, SdkworkHostAdapter> _adapters = <String, SdkworkHostAdapter>{};

/// Registers the platform adapters this build provides.
///
/// Section 7 lists fifteen adapter categories; the Flutter root starts with the
/// one the IAM credential lifecycle actually needs, and the rest are registered
/// here as their implementations land.
Future<void> registerHostAdapters() async {
  _adapters.clear();
  _adapters[SdkworkHostCapability.secureStorage] = SdkworkSecureStorageAdapter();
}

/// The adapter for [capability], or null when this platform lacks it.
SdkworkHostAdapter? hostAdapterFor(String capability) => _adapters[capability];
