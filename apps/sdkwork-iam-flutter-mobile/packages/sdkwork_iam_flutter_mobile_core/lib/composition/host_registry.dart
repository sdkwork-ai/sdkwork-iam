// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Host adapter registry of the `app` tier.
 *
 * Section 7: widgets and services depend on adapter interfaces, never on plugin
 * classes or method-channel strings. A Flutter root owns no host package, so the
 * bootstrap registers the implementations.
 */

import '../src/host/host_adapter.dart';

/// Registry of the platform adapters available to the `app` tier.
class IamFlutterMobileCoreHostRegistry {
  IamFlutterMobileCoreHostRegistry(List<SdkworkHostAdapter> adapters)
      : _adapters = Map<String, SdkworkHostAdapter>.unmodifiable(
          <String, SdkworkHostAdapter>{
            for (final SdkworkHostAdapter adapter in adapters) adapter.capability: adapter,
          },
        );

  final Map<String, SdkworkHostAdapter> _adapters;

  /// The adapter for [capability], or null when this platform lacks it.
  SdkworkHostAdapter? adapterFor(String capability) => _adapters[capability];

  /// Capabilities this platform actually provides.
  List<String> get capabilities => _adapters.keys.toList(growable: false);
}
