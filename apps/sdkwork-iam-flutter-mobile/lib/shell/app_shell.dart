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
import 'package:sdkwork_iam_flutter_mobile_admin_audit/sdkwork_iam_flutter_mobile_admin_audit.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_permission/sdkwork_iam_flutter_mobile_admin_permission.dart';
import 'package:sdkwork_iam_flutter_mobile_auth/sdkwork_iam_flutter_mobile_auth.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';
import 'package:sdkwork_iam_flutter_mobile_console_account_binding/sdkwork_iam_flutter_mobile_console_account_binding.dart';
import 'package:sdkwork_iam_flutter_mobile_console_organization/sdkwork_iam_flutter_mobile_console_organization.dart';
import 'package:sdkwork_iam_flutter_mobile_console_tenant/sdkwork_iam_flutter_mobile_console_tenant.dart';
import 'package:sdkwork_iam_flutter_mobile_console_user_center/sdkwork_iam_flutter_mobile_console_user_center.dart';
import 'package:sdkwork_iam_flutter_mobile_oauth/sdkwork_iam_flutter_mobile_oauth.dart';
import 'package:sdkwork_iam_flutter_mobile_organization/sdkwork_iam_flutter_mobile_organization.dart';
import 'package:sdkwork_iam_flutter_mobile_shell/sdkwork_iam_flutter_mobile_shell.dart';
import 'package:sdkwork_iam_flutter_mobile_tenant/sdkwork_iam_flutter_mobile_tenant.dart';
import 'package:sdkwork_iam_flutter_mobile_user_center/sdkwork_iam_flutter_mobile_user_center.dart';

import 'account_binding_data_source.dart';
import 'admin_audit_data_source.dart';
import 'admin_permission_data_source.dart';
import 'auth_data_source.dart';
import 'console_account_binding_data_source.dart';
import 'console_organization_data_source.dart';
import 'console_tenant_data_source.dart';
import 'console_user_center_data_source.dart';
import 'organization_data_source.dart';
import 'oauth_data_source.dart';
import 'tenant_data_source.dart';
import 'user_center_data_source.dart';
import '../bootstrap/url_opener.dart';

/// Shell the root mounts.
class IamHomeShell extends StatefulWidget {
  const IamHomeShell({
    super.key,
    this.adminAuditDataSource,
    this.adminAuditMessages,
    this.adminPermissionDataSource,
    this.adminPermissionMessages,
    this.accountBindingDataSource,
    this.accountBindingMessages,
    this.authController,
    this.authDataSource,
    this.authMessages,
    this.consoleOrganizationDataSource,
    this.consoleOrganizationMessages,
    this.consoleAccountBindingDataSource,
    this.consoleAccountBindingMessages,
    this.consoleUserCenterDataSource,
    this.consoleUserCenterMessages,
    this.consoleTenantDataSource,
    this.consoleTenantMessages,
    this.organizationDataSource,
    this.organizationMessages,
    this.oauthDataSource,
    this.oauthMessages,
    this.tenantDataSource,
    this.tenantMessages,
    this.urlOpener,
    this.userCenterDataSource,
    this.userCenterMessages,
  });

  /// Overrides the app-api user-center data source.
  final IamFlutterMobileUserCenterDataSource? userCenterDataSource;

  /// Overrides the user-center copy.
  final Map<String, String>? userCenterMessages;

  /// Overrides the backend-api admin audit data source.
  final IamFlutterMobileAdminAuditDataSource? adminAuditDataSource;

  /// Overrides the admin audit copy.
  final Map<String, String>? adminAuditMessages;

  /// Overrides the backend-api admin permission data source.
  final IamFlutterMobileAdminPermissionDataSource? adminPermissionDataSource;

  /// Overrides the admin permission copy.
  final Map<String, String>? adminPermissionMessages;

  /// Overrides the app-api account-binding data source.
  final IamFlutterMobileAccountBindingDataSource? accountBindingDataSource;

  /// Overrides the account-binding copy.
  final Map<String, String>? accountBindingMessages;

  /// Overrides the auth controller; a widget test injects a signed-in double.
  final IamFlutterMobileAuthController? authController;

  /// Overrides the app-api auth data source (used by the reset screen).
  final IamFlutterMobileAuthDataSource? authDataSource;

  /// Overrides the auth copy.
  final Map<String, String>? authMessages;

  /// Overrides the app-api console-tenant data source.
  final IamFlutterMobileConsoleTenantDataSource? consoleTenantDataSource;

  /// Overrides the console-tenant copy.
  final Map<String, String>? consoleTenantMessages;

  /// Overrides the app-api console-account-binding data source.
  final IamFlutterMobileConsoleAccountBindingDataSource? consoleAccountBindingDataSource;

  /// Overrides the console-account-binding copy.
  final Map<String, String>? consoleAccountBindingMessages;

  /// Overrides the app-api console-user-center data source.
  final IamFlutterMobileConsoleUserCenterDataSource? consoleUserCenterDataSource;

  /// Overrides the console-user-center copy.
  final Map<String, String>? consoleUserCenterMessages;

  /// Overrides the app-api console-organization data source.
  final IamFlutterMobileConsoleOrganizationDataSource? consoleOrganizationDataSource;

  /// Overrides the console-organization copy.
  final Map<String, String>? consoleOrganizationMessages;

  /// Overrides the app-api tenant data source.
  final IamFlutterMobileTenantDataSource? tenantDataSource;

  /// Overrides the tenant copy.
  final Map<String, String>? tenantMessages;

  /// Overrides the app-api organization data source.
  final IamFlutterMobileOrganizationDataSource? organizationDataSource;

  /// Overrides the organization copy.
  final Map<String, String>? organizationMessages;

  /// Overrides the app-api OAuth data source.
  final IamFlutterMobileOAuthDataSource? oauthDataSource;

  /// Overrides the OAuth copy.
  final Map<String, String>? oauthMessages;

  /// Opens an external URL; defaults to the platform browser through the adapter.
  ///
  /// Injectable so a widget test can assert the URL without a platform channel.
  final Future<bool> Function(String url)? urlOpener;

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

        final Widget authScreen = Builder(
          builder: (BuildContext screenContext) => IamFlutterMobileAuthScreen(
            controller: _auth,
            messages: copy.auth,
            onOpenForgotPassword: () =>
                Navigator.of(screenContext).pushNamed('/auth/forgot-password'),
          ),
        );
        final Widget forgotPasswordScreen = Builder(
          builder: (BuildContext screenContext) => IamFlutterMobileAuthForgotPasswordScreen(
            // Built inside the route builder: the reset controller needs the app-api
            // client, and constructing it eagerly would make every launch (including
            // the sign-in screen) depend on a client it never uses.
            controller: IamFlutterMobileAuthController(
              service: IamFlutterMobileAuthService(
                dataSource: widget.authDataSource ?? IamAuthAppSdkDataSource(),
              ),
            ),
            messages: copy.auth,
            onReset: () => Navigator.of(screenContext).pop(),
          ),
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
        final IamFlutterMobileUserCenterController profileController =
            IamFlutterMobileUserCenterController(
          service: IamFlutterMobileUserCenterService(
            dataSource: widget.userCenterDataSource ?? IamUserCenterAppSdkDataSource(),
          ),
        );
        final Widget oauthScreen = Builder(
          builder: (BuildContext screenContext) => IamFlutterMobileOauthScreen(
            controller: IamFlutterMobileOauthController(
              service: IamFlutterMobileOAuthService(
                dataSource: widget.oauthDataSource ?? IamOAuthAppSdkDataSource(),
              ),
            ),
            messages: copy.oauth,
            onAuthorize: (String url) => _openAuthorizationUrl(screenContext, copy.oauth, url),
          ),
        );
        // Built inside the route builder: the console workspace needs the app-api client,
        // and constructing it eagerly would make every launch (including the sign-in
        // screen) depend on a client it never uses.
        final Widget consoleTenantScreen = Builder(
          builder: (BuildContext _) => IamFlutterMobileConsoleTenantScreen(
            controller: IamFlutterMobileConsoleTenantController(
              service: IamFlutterMobileConsoleTenantService(
                dataSource: widget.consoleTenantDataSource ?? IamConsoleTenantAppSdkDataSource(),
              ),
            ),
            messages: copy.consoleTenant,
          ),
        );
        final Widget consoleOrganizationScreen = Builder(
          builder: (BuildContext _) => IamFlutterMobileConsoleOrganizationScreen(
            controller: IamFlutterMobileConsoleOrganizationController(
              service: IamFlutterMobileConsoleOrganizationService(
                dataSource:
                    widget.consoleOrganizationDataSource ?? IamConsoleOrganizationAppSdkDataSource(),
              ),
            ),
            messages: copy.consoleOrganization,
          ),
        );
        final Widget adminAuditScreen = Builder(
          builder: (BuildContext _) => IamFlutterMobileAdminAuditScreen(
            controller: IamFlutterMobileAdminAuditController(
              service: IamFlutterMobileAdminAuditService(
                dataSource: widget.adminAuditDataSource ?? IamAdminAuditBackendSdkDataSource(),
              ),
            ),
            messages: copy.adminAudit,
          ),
        );
        final Widget adminPermissionScreen = Builder(
          builder: (BuildContext _) => IamFlutterMobileAdminPermissionScreen(
            controller: IamFlutterMobileAdminPermissionController(
              service: IamFlutterMobileAdminPermissionService(
                dataSource: widget.adminPermissionDataSource ??
                    IamAdminPermissionBackendSdkDataSource(),
              ),
            ),
            messages: copy.adminPermission,
          ),
        );
        final Widget consoleAccountBindingScreen = Builder(
          builder: (BuildContext _) => IamFlutterMobileConsoleAccountBindingScreen(
            controller: IamFlutterMobileConsoleAccountBindingController(
              service: IamFlutterMobileConsoleAccountBindingService(
                dataSource: widget.consoleAccountBindingDataSource ??
                    IamConsoleAccountBindingAppSdkDataSource(),
              ),
            ),
            messages: copy.consoleAccountBinding,
          ),
        );
        final Widget consoleUserCenterScreen = Builder(
          builder: (BuildContext _) => IamFlutterMobileConsoleUserCenterScreen(
            controller: IamFlutterMobileConsoleUserCenterController(
              service: IamFlutterMobileConsoleUserCenterService(
                dataSource:
                    widget.consoleUserCenterDataSource ?? IamConsoleUserCenterAppSdkDataSource(),
              ),
            ),
            messages: copy.consoleUserCenter,
          ),
        );
        final Widget profileScreen = Builder(
          builder: (BuildContext screenContext) => IamFlutterMobileUserCenterScreen(
            controller: profileController,
            messages: copy.userCenter,
            onOpenPassword: () => Navigator.of(screenContext).pushNamed('/user/password'),
          ),
        );
        final Widget passwordScreen = IamFlutterMobileUserCenterPasswordScreen(
          controller: IamFlutterMobileUserCenterController(
            service: IamFlutterMobileUserCenterService(
              dataSource: widget.userCenterDataSource ?? IamUserCenterAppSdkDataSource(),
            ),
          ),
          messages: copy.userCenter,
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
              builder: (_) => forgotPasswordScreen,
              path: '/auth/forgot-password',
              routeId: IamFlutterMobileAuthRoutes.forgotPasswordRouteId,
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
            SdkworkRouteEntry(
              builder: (_) => profileScreen,
              path: '/user/profile',
              routeId: IamFlutterMobileUserCenterRoutes.profileRouteId,
            ),
            SdkworkRouteEntry(
              builder: (_) => passwordScreen,
              path: '/user/password',
              routeId: IamFlutterMobileUserCenterRoutes.passwordRouteId,
            ),
            SdkworkRouteEntry(
              builder: (_) => oauthScreen,
              path: '/oauth/providers',
              routeId: IamFlutterMobileOauthRoutes.providersRouteId,
            ),
            SdkworkRouteEntry(
              builder: (_) => consoleTenantScreen,
              path: '/console/iam/tenant',
              routeId: IamFlutterMobileConsoleTenantRoutes.overviewRouteId,
            ),
            SdkworkRouteEntry(
              builder: (_) => consoleOrganizationScreen,
              path: '/console/iam/organizations',
              routeId: IamFlutterMobileConsoleOrganizationRoutes.directoryRouteId,
            ),
            SdkworkRouteEntry(
              builder: (_) => consoleUserCenterScreen,
              path: '/console/iam/user',
              routeId: IamFlutterMobileConsoleUserCenterRoutes.profileRouteId,
            ),
            SdkworkRouteEntry(
              builder: (_) => consoleAccountBindingScreen,
              path: '/console/iam/account-binding',
              routeId: IamFlutterMobileConsoleAccountBindingRoutes.listRouteId,
            ),
            SdkworkRouteEntry(
              builder: (_) => adminPermissionScreen,
              path: '/admin/iam/permissions',
              routeId: IamFlutterMobileAdminPermissionRoutes.permissionsRouteId,
            ),
            SdkworkRouteEntry(
              builder: (_) => adminAuditScreen,
              path: '/admin/iam/audit',
              routeId: IamFlutterMobileAdminAuditRoutes.eventsRouteId,
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
    final Map<String, String> userCenter = widget.userCenterMessages ??
        await _loadFragment(
          'sdkwork_iam_flutter_mobile_user_center',
          'user_center',
          locale,
        );
    final Map<String, String> oauth = widget.oauthMessages ??
        await _loadFragment('sdkwork_iam_flutter_mobile_oauth', 'oauth', locale);
    final Map<String, String> consoleTenant = widget.consoleTenantMessages ??
        await _loadFragment(
          'sdkwork_iam_flutter_mobile_console_tenant',
          'console_tenant',
          locale,
        );
    final Map<String, String> consoleAccountBinding = widget.consoleAccountBindingMessages ??
        await _loadFragment(
          'sdkwork_iam_flutter_mobile_console_account_binding',
          'console_account_binding',
          locale,
        );
    final Map<String, String> consoleUserCenter = widget.consoleUserCenterMessages ??
        await _loadFragment(
          'sdkwork_iam_flutter_mobile_console_user_center',
          'console_user_center',
          locale,
        );
    final Map<String, String> consoleOrganization = widget.consoleOrganizationMessages ??
        await _loadFragment(
          'sdkwork_iam_flutter_mobile_console_organization',
          'console_organization',
          locale,
        );
    final Map<String, String> adminAudit = widget.adminAuditMessages ??
        await _loadFragment('sdkwork_iam_flutter_mobile_admin_audit', 'admin_audit', locale);
    final Map<String, String> adminPermission = widget.adminPermissionMessages ??
        await _loadFragment('sdkwork_iam_flutter_mobile_admin_permission', 'admin_permission', locale);
    return _IamShellCopy(
      accountBinding: accountBinding,
      adminAudit: adminAudit,
      adminPermission: adminPermission,
      auth: auth,
      consoleAccountBinding: consoleAccountBinding,
      consoleOrganization: consoleOrganization,
      consoleUserCenter: consoleUserCenter,
      consoleTenant: consoleTenant,
      oauth: oauth,
      organization: organization,
      tenant: tenant,
      userCenter: userCenter,
    );
  }

  Future<Map<String, String>> _loadFragment(String package, String capability, String locale) {
    final SdkworkArbBundle bundle = SdkworkArbBundle(
      assetPathBuilder: (String requested) =>
          'packages/$package/lib/src/i18n/$requested/iam/$capability/$capability.arb',
    );
    return bundle.messages(locale);
  }

  /// Opens an authorization URL in the platform browser.
  ///
  /// A failure is reported to the user rather than swallowed: a provider that never
  /// opened must not look like one that was cancelled.
  Future<void> _openAuthorizationUrl(
    BuildContext context,
    Map<String, String> copy,
    String url,
  ) async {
    final Future<bool> Function(String url) opener =
        widget.urlOpener ?? (String target) => const IamUrlOpenerAdapter().open(target);
    final bool opened = await opener(url);
    if (opened || !context.mounted) return;
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      SnackBar(content: Text(copy['authorizeUnavailable'] ?? 'Unable to open the provider.')),
    );
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
    required this.adminAudit,
    required this.adminPermission,
    required this.auth,
    required this.consoleAccountBinding,
    required this.consoleOrganization,
    required this.consoleUserCenter,
    required this.consoleTenant,
    required this.oauth,
    required this.organization,
    required this.tenant,
    required this.userCenter,
  });

  final Map<String, String> accountBinding;
  final Map<String, String> adminAudit;
  final Map<String, String> adminPermission;
  final Map<String, String> auth;
  final Map<String, String> consoleAccountBinding;
  final Map<String, String> consoleOrganization;
  final Map<String, String> consoleUserCenter;
  final Map<String, String> consoleTenant;
  final Map<String, String> oauth;
  final Map<String, String> organization;
  final Map<String, String> tenant;
  final Map<String, String> userCenter;
}
