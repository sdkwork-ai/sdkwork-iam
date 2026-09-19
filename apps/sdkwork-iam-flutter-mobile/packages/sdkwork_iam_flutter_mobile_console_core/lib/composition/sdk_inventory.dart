// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Generated Dart SDK inventory of the `console` tier.
 *
 * Section 6: the bootstrap constructs the clients named here from the resolved
 * runtime configuration and injects them; this file is the declaration the
 * bootstrap is checked against.
 */

/// One generated SDK client class this tier expects to be injected.
class SdkClientDescriptor {
  const SdkClientDescriptor({
    required this.sdkPackage,
    required this.clientClass,
    required this.surface,
  });

  /// Dart package name of the generated family.
  final String sdkPackage;

  /// Client class the family publishes.
  final String clientClass;

  /// API surface the client serves.
  final String surface;
}

/// SDK clients the `console` tier consumes.
const List<SdkClientDescriptor> iamFlutterMobileConsoleCoreSdkClients = <SdkClientDescriptor>[
  SdkClientDescriptor(
    sdkPackage: 'sdkwork_iam_app_sdk',
    clientClass: 'SdkworkAppClient',
    surface: 'app-api',
  ),
];
