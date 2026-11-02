// SDKWORK-IAM-FLUTTER-SHELL: authored shell assembly.
/**
 * Shell the root mounts: it loads the copy the mounted screens need, decides
 * whether the session gate opens, and builds the MaterialApp with the route table.
 *
 * Two capabilities have real screens today (auth and tenant), so both are
 * registered: `/auth/login` is the gate, `/tenant` is the signed-in home. Adding a
 * capability means adding an entry here; its route contribution is already in the
 * tier registry.
 */

import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_account_binding/sdkwork_iam_flutter_mobile_account_binding.dart';
import 'package:sdkwork_iam_flutter_mobile_auth/sdkwork_iam_flutter_mobile_auth.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';
import 'package:sdkwork_iam_flutter_mobile_organization/sdkwork_iam_flutter_mobile_organization.dart';
import 'package:sdkwork_iam_flutter_mobile_shell/sdkwork_iam_flutter_mobile_shell.dart';
import 'package:sdkwork_iam_flutter_mobile_tenant/sdkwork_iam_flutter_mobile_tenant.dart';

import 'account_binding_data_source.dart';
import 'auth_data_source.dart';
import 'organization_data_source.dart';
import 'tenant_data_source.dart';

/// Shell the root mounts.
class IamHomeShell extends StatefulWidget {
  const IamHomeShell({
    super.key,
    this.accountBindingDataSource,
    this.accountBindingMessages,
    this.authController,
    this.authMessages,
    this.organizationDataSource,
    this.organizationMessages,
    this.tenantDataSource,
    this.tenantMessages,
  });

  /// Overrides the app-api account-binding data source.
  final IamFlutterMobileAccountBindingDataSource? accountBindingDataSource;

  /// Overrides the account-binding copy.
  final Map<String, String>? accountBindingMessages;

  /// Overrides the auth controller; a widget test injects a signed-in double.
  final IamFlutterMobileAuthController? authController;

  /// Overrides the auth copy.
  final Map<String, String>? authMessages;

  /// Overrides the app-api tenant data source.
  final IamFlutterMobileTenantDataSource? tenantDataSource;

  /// Overrides the tenant copy.
  final Map<String, String>? tenantMessages;

  /// Overrides the app-api organization data source.
  final IamFlutterMobileOrganizationDataSource? organizationDataSource;

  /// Overrides the organization copy.
  final Map<String, String>? organizationMessages;

  @override
  State<IamHomeShell> createState() => _IamHomeShellState();
}

class _IamHomeShellState extends State<IamHomeShell> {
  late final Future<_IamShellCopy> _copy = _loadCopy();
  late final IamFlutterMobileAuthController _auth =
      widget.authController ?? IamFlutterMobileAuthController(
        service: IamFlutterMobileAuthService(dataSource: IamAuthAppSdkDataSource()),
      );

  late final void Function() _unsubscribeAuth;
  bool _authenticated = false;

  @override
  void initState() {
    super.initState();
    _authenticated = _auth.state.authenticated;
    _unsubscribeAuth = _auth.addListener((IamFlutterMobileAuthState _) {
      if (!mounted) return;
      setState(() => _authenticated = _auth.state.authenticated);
    });
  }

  @override
  void dispose() {
    _unsubscribeAuth();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_IamShellCopy>(
      future: _copy,
      builder: (BuildContext context, AsyncSnapshot<_IamShellCopy> snapshot) {
        final _IamShellCopy? copy = snapshot.data;
        if (copy == null) {
          // The first frame must not be an empty app: while the fragments load the
          // shell shows the shared loading state under its own MaterialApp.
          return MaterialApp(
            theme: ThemeData(colorSchemeSeed: const Color(0xFF17202A), useMaterial3: true),
            home: const Scaffold(body: SdkworkLoadingView()),
          );
        }

        final Widget authScreen = IamFlutterMobileAuthScreen(
          controller: _auth,
          messages: copy.auth,
        );
        final Widget tenantScreen = Builder(
          builder: (BuildContext screenContext) => IamFlutterMobileTenantScreen(
            controller: IamFlutterMobileTenantController(
              service: IamFlutterMobileTenantService(
                dataSource: widget.tenantDataSource ?? IamTenantAppSdkDataSource(),
              ),
            ),
            messages: copy.tenant,
            onOpenOrganizations: () => Navigator.of(screenContext).pushNamed('/organizations'),
          ),
        );
        final Widget organizationScreen = IamFlutterMobileOrganizationScreen(
          controller: IamFlutterMobileOrganizationController(
            service: IamFlutterMobileOrganizationService(
              dataSource: widget.organizationDataSource ?? IamOrganizationAppSdkDataSource(),
            ),
          ),
          messages: copy.organization,
        );
        final Widget accountBindingScreen = IamFlutterMobileAccountBindingScreen(
          controller: IamFlutterMobileAccountBindingController(
            service: IamFlutterMobileAccountBindingService(
              dataSource: widget.accountBindingDataSource ?? IamAccountBindingAppSdkDataSource(),
            ),
          ),
          messages: copy.accountBinding,
        );

        return IamFlutterMobileCoreShell(
          home: _authenticated ? tenantScreen : authScreen,
          routeEntries: <SdkworkRouteEntry>[
            SdkworkRouteEntry(
              builder: (_) => authScreen,
              path: '/auth/login',
              routeId: IamFlutterMobileAuthRoutes.loginRouteId,
            ),
            SdkworkRouteEntry(
              builder: (_) => tenantScreen,
              path: '/tenant',
              routeId: IamFlutterMobileTenantRoutes.overviewRouteId,
            ),
            SdkworkRouteEntry(
              builder: (_) => organizationScreen,
              path: '/organizations',
              routeId: IamFlutterMobileOrganizationRoutes.directoryRouteId,
            ),
            SdkworkRouteEntry(
              builder: (_) => accountBindingScreen,
              path: '/user/account-binding',
              routeId: IamFlutterMobileAccountBindingRoutes.listRouteId,
            ),
          ],
          title: copy.tenant['title'] ?? 'SDKWork IAM',
        );
      },
    );
  }

  /// Loads both fragments for the device locale.
  ///
  /// Package assets are addressed as `packages/<package>/<path>`: a path relative
  /// to the package alone resolves in tests but not in the bundled application.
  Future<_IamShellCopy> _loadCopy() async {
    final String locale = _resolveLocale();
    final Map<String, String> auth =
        widget.authMessages ?? await _loadFragment('sdkwork_iam_flutter_mobile_auth', 'auth', locale);
    final Map<String, String> tenant = widget.tenantMessages ??
        await _loadFragment('sdkwork_iam_flutter_mobile_tenant', 'tenant', locale);
    final Map<String, String> organization = widget.organizationMessages ??
        await _loadFragment(
          'sdkwork_iam_flutter_mobile_organization',
          'organization',
          locale,
        );
    final Map<String, String> accountBinding = widget.accountBindingMessages ??
        await _loadFragment(
          'sdkwork_iam_flutter_mobile_account_binding',
          'account_binding',
          locale,
        );
    return _IamShellCopy(
      accountBinding: accountBinding,
      auth: auth,
      organization: organization,
      tenant: tenant,
    );
  }

  Future<Map<String, String>> _loadFragment(String package, String capability, String locale) {
    final SdkworkArbBundle bundle = SdkworkArbBundle(
      assetPathBuilder: (String requested) =>
          'packages/$package/lib/src/i18n/$requested/iam/$capability/$capability.arb',
    );
    return bundle.messages(locale);
  }

  /// Maps the platform locale onto one of the two fragments this build ships.
  String _resolveLocale() {
    final String language = PlatformDispatcher.instance.locale.languageCode.toLowerCase();
    return language == 'zh' ? 'zh-CN' : 'en-US';
  }
}

/// The fragments the shell mounts.
class _IamShellCopy {
  const _IamShellCopy({
    required this.accountBinding,
    required this.auth,
    required this.organization,
    required this.tenant,
  });

  final Map<String, String> accountBinding;
  final Map<String, String> auth;
  final Map<String, String> organization;
  final Map<String, String> tenant;
}
