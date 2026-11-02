// SDKWORK-IAM-FLUTTER-SHELL: authored shell assembly.
/**
 * Shell the root mounts: it loads the copy the mounted screens need, then builds
 * the MaterialApp with the route table.
 *
 * The tenant screen is the only capability with a real screen today, so it is both
 * the home widget and the `/tenant` named route. Adding a capability means adding
 * an entry here and its route contribution is already in the tier registry.
 */

import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';
import 'package:sdkwork_iam_flutter_mobile_shell/sdkwork_iam_flutter_mobile_shell.dart';
import 'package:sdkwork_iam_flutter_mobile_tenant/sdkwork_iam_flutter_mobile_tenant.dart';

import 'tenant_data_source.dart';

/// Shell the root mounts once a session exists.
class IamHomeShell extends StatefulWidget {
  const IamHomeShell({super.key, this.dataSource, this.messages});

  /// Overrides the app-api data source; a widget test injects a double here so the
  /// shell can be exercised without a network or a running backend.
  final IamFlutterMobileTenantDataSource? dataSource;

  /// Overrides the loaded copy; the real shell reads the `.arb` fragment, a test
  /// passes the map directly.
  final Map<String, String>? messages;

  @override
  State<IamHomeShell> createState() => _IamHomeShellState();
}

class _IamHomeShellState extends State<IamHomeShell> {
  late final Future<Map<String, String>> _tenantMessages =
      widget.messages == null ? _loadTenantMessages() : Future<Map<String, String>>.value(widget.messages!);

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, String>>(
      future: _tenantMessages,
      builder: (BuildContext context, AsyncSnapshot<Map<String, String>> snapshot) {
        final Map<String, String>? messages = snapshot.data;
        if (messages == null) {
          // The first frame must not be an empty app: while the fragment loads the
          // shell shows the shared loading state under the shell's own MaterialApp.
          return MaterialApp(
            theme: ThemeData(colorSchemeSeed: const Color(0xFF17202A), useMaterial3: true),
            home: const Scaffold(body: SdkworkLoadingView()),
          );
        }
        final Widget tenantScreen = IamFlutterMobileTenantScreen(
          controller: IamFlutterMobileTenantController(
            service: IamFlutterMobileTenantService(
              dataSource: widget.dataSource ?? IamTenantAppSdkDataSource(),
            ),
          ),
          messages: messages,
        );
        return IamFlutterMobileCoreShell(
          home: tenantScreen,
          routeEntries: <SdkworkRouteEntry>[
            SdkworkRouteEntry(
              builder: (_) => tenantScreen,
              path: '/tenant',
              routeId: IamFlutterMobileTenantRoutes.overviewRouteId,
            ),
          ],
          title: messages['title'] ?? 'SDKWork IAM',
        );
      },
    );
  }

  /// Loads the tenant fragment for the device locale.
  ///
  /// Package assets are addressed as `packages/<package>/<path>`: a path relative
  /// to the package alone resolves in tests but not in the bundled application.
  Future<Map<String, String>> _loadTenantMessages() {
    final String locale = _resolveLocale();
    final SdkworkArbBundle bundle = SdkworkArbBundle(
      assetPathBuilder: (String requested) =>
          'packages/sdkwork_iam_flutter_mobile_tenant/${iamFlutterMobileTenantFragmentAssetPath(requested)}',
    );
    return bundle.messages(locale);
  }

  /// Maps the platform locale onto one of the two fragments this build ships.
  String _resolveLocale() {
    final String language = PlatformDispatcher.instance.locale.languageCode.toLowerCase();
    return language == 'zh' ? 'zh-CN' : 'en-US';
  }
}
