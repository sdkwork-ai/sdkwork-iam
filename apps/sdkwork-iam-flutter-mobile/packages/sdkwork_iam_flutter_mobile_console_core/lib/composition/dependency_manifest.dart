// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Declared dependency surface of the `console` tier core.
 *
 * Mirrors `specs/component.spec.json` `contracts.sdkDependencies` so the runtime
 * and the contract cannot disagree about which generated Dart SDK family this tier
 * consumes.
 */

/// One generated SDK family consumed by this tier.
class SdkDependency {
  const SdkDependency({
    required this.workspace,
    required this.surface,
    required this.credentialMode,
  });

  /// Workspace directory name of the generated family.
  final String workspace;

  /// API surface the family serves.
  final String surface;

  /// Credential mode every authenticated call of this tier uses.
  final String credentialMode;
}

/// SDK families the `console` tier consumes.
const List<SdkDependency> iamFlutterMobileConsoleCoreSdkDependencies = <SdkDependency>[
  SdkDependency(
    workspace: 'sdkwork-iam-app-sdk',
    surface: 'app-api',
    credentialMode: 'authenticated-app-api',
  ),
];
