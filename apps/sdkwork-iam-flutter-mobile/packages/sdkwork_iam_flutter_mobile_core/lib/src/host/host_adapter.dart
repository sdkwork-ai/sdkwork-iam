// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Platform adapter contracts (section 7).
 *
 * Widgets and services depend on these interfaces; only the bootstrap registers
 * implementations, and only the bootstrap may touch a plugin.
 */

/// One platform capability an adapter may provide.
class SdkworkHostCapability {
  const SdkworkHostCapability._();

  static const String camera = 'camera';
  static const String qrScanner = 'qrScanner';
  static const String pushNotifications = 'pushNotifications';
  static const String deepLinks = 'deepLinks';
  static const String secureStorage = 'secureStorage';
  static const String biometric = 'biometric';
  static const String shareSheet = 'shareSheet';
  static const String networkStatus = 'networkStatus';
  static const String appLifecycle = 'appLifecycle';
  static const String clipboard = 'clipboard';
  static const String filePicker = 'filePicker';
  static const String filesystemSandbox = 'filesystemSandbox';
  static const String geolocation = 'geolocation';
  static const String deviceInfo = 'deviceInfo';
  static const String haptics = 'haptics';
}

/// User-safe error surfaced by a platform adapter.
class SdkworkHostError {
  const SdkworkHostError({required this.code, required this.message});

  /// Stable machine-readable code.
  final String code;

  /// User-safe message.
  final String message;
}

/// Typed platform adapter. Implementations never expose plugin types.
abstract class SdkworkHostAdapter {
  /// The capability this adapter provides.
  String get capability;

  /// True when the current platform can actually provide the capability.
  bool isAvailable();
}
