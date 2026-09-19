// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Navigation assembly of the `console` tier.
 *
 * Section 8: Flutter named routes map to SDKWork route ids, so one workflow keeps
 * one identity across PC, H5, mini program, Harmony and Flutter.
 */

import 'package:flutter/material.dart';

/// One named route of the `console` tier.
class SdkworkRouteEntry {
  const SdkworkRouteEntry({
    required this.routeId,
    required this.path,
    required this.builder,
  });

  /// Cross-client route id this entry serves.
  final String routeId;

  /// Physical Flutter path.
  final String path;

  /// Builder of the route's screen.
  final WidgetBuilder builder;
}

/// Builds the named-route table of the `console` tier.
Map<String, WidgetBuilder> buildIamFlutterMobileConsoleCoreRouteTable(List<SdkworkRouteEntry> entries) {
  return <String, WidgetBuilder>{
    for (final SdkworkRouteEntry entry in entries) entry.path: entry.builder,
  };
}

/// Resolves a physical path back to its cross-client route id.
String? resolveIamFlutterMobileConsoleCoreRouteId(List<SdkworkRouteEntry> entries, String path) {
  for (final SdkworkRouteEntry entry in entries) {
    if (entry.path == path) return entry.routeId;
  }
  return null;
}
