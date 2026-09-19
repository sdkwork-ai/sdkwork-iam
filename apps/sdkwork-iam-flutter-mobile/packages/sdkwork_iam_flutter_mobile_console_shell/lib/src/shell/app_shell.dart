// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Shell assembly of the `console` tier.
 *
 * Section 3 gives the shell family the MaterialApp/router assembly, AuthGate
 * integration and app route composition. It owns no business service.
 */

import 'package:flutter/material.dart';

import 'router.dart';

/// Root widget of the `console` tier.
class IamFlutterMobileConsoleCoreShell extends StatelessWidget {
  const IamFlutterMobileConsoleCoreShell({
    super.key,
    required this.title,
    required this.home,
    this.routeEntries = const <SdkworkRouteEntry>[],
  });

  /// Application title.
  final String title;

  /// Widget mounted before any named route is pushed.
  final Widget home;

  /// Named routes of this tier.
  final List<SdkworkRouteEntry> routeEntries;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: title,
      theme: ThemeData(colorSchemeSeed: const Color(0xFF17202A), useMaterial3: true),
      routes: buildIamFlutterMobileConsoleCoreRouteTable(routeEntries),
      home: home,
    );
  }
}
