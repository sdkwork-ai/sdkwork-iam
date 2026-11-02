// SDKWORK-IAM-FLUTTER: authored shell test.
/**
 * The app root used to compile but render nothing, then mounted the tenant screen
 * behind no gate. These cases pin the wiring: signed out, the shell opens the
 * sign-in screen; a successful sign-in swaps to the tenant screen; and both routes
 * are registered under their cross-client ids.
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_account_binding/sdkwork_iam_flutter_mobile_account_binding.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_account_binding/sdkwork_iam_flutter_mobile_admin_account_binding.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_audit/sdkwork_iam_flutter_mobile_admin_audit.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_oauth/sdkwork_iam_flutter_mobile_admin_oauth.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_organization/sdkwork_iam_flutter_mobile_admin_organization.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_permission/sdkwork_iam_flutter_mobile_admin_permission.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_tenant/sdkwork_iam_flutter_mobile_admin_tenant.dart';
import 'package:sdkwork_iam_flutter_mobile_auth/sdkwork_iam_flutter_mobile_auth.dart';
import 'package:sdkwork_iam_flutter_mobile_console_organization/sdkwork_iam_flutter_mobile_console_organization.dart';
import 'package:sdkwork_iam_flutter_mobile_console_account_binding/sdkwork_iam_flutter_mobile_console_account_binding.dart';
import 'package:sdkwork_iam_flutter_mobile_console_user_center/sdkwork_iam_flutter_mobile_console_user_center.dart';
import 'package:sdkwork_iam_flutter_mobile_console_tenant/sdkwork_iam_flutter_mobile_console_tenant.dart';
import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';
import 'package:sdkwork_iam_flutter_mobile_organization/sdkwork_iam_flutter_mobile_organization.dart';
import 'package:sdkwork_iam_flutter_mobile_tenant/sdkwork_iam_flutter_mobile_tenant.dart';
import 'package:sdkwork_iam_flutter_mobile_oauth/sdkwork_iam_flutter_mobile_oauth.dart';
import 'package:sdkwork_iam_flutter_mobile_user_center/sdkwork_iam_flutter_mobile_user_center.dart';

import 'package:sdkwork_iam_flutter_mobile/shell/app_shell.dart';

const Map<String, String> _authMessages = <String, String>{
  'accountLabel': 'Phone or email',
  'passwordLabel': 'Password',
  'submitLabel': 'Sign in',
  'subtitle': 'Sign in to manage your tenant, organizations and account.',
  'title': 'Sign in',
};

const Map<String, String> _tenantMessages = <String, String>{
  'empty': 'Nothing to show yet.',
  'loadError': 'Unable to load this view.',
  'membershipsSection': 'My memberships',
  'notReported': 'Not reported',
  'organizationsSection': 'Organizations',
  'retry': 'Retry',
  'sessionSection': 'Session',
  'subtitle': 'Your session, organizations and memberships.',
  'title': 'Tenant',
};

class _FakeAuthDataSource implements IamFlutterMobileAuthDataSource {
  _FakeAuthDataSource({this.session});

  IamFlutterMobileAuthSession? session;
  int signInCalls = 0;

  @override
  IamFlutterMobileAuthSession? get currentSession => session;

  @override
  Future<IamFlutterMobileAuthSession> signInWithPassword({
    required String password,
    required String username,
  }) async {
    signInCalls += 1;
    session = const IamFlutterMobileAuthSession(accessToken: 'token-1', userId: 'user-1');
    return session!;
  }

  @override
  Future<void> requestPasswordResetCode(String account) async {}

  @override
  Future<void> resetPassword(IamFlutterMobileAuthResetDraft draft) async {}

  @override
  Future<void> signOut() async {
    session = null;
  }
}

class _FakeTenantDataSource implements IamFlutterMobileTenantDataSource {
  @override
  Future<IamFlutterMobileTenantOverview> loadOverview() async {
    return const IamFlutterMobileTenantOverview(
      organizations: <IamFlutterMobileTenantRow>[
        IamFlutterMobileTenantRow(id: 'org-1', title: 'Acme', detail: 'org-1'),
      ],
      tenantId: 'tenant-1',
      userId: 'user-1',
    );
  }
}

class _FakeOrganizationDataSource implements IamFlutterMobileOrganizationDataSource {
  @override
  Future<IamFlutterMobileOrganizationPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    return const IamFlutterMobileOrganizationPage(
      items: <IamFlutterMobileOrganizationRow>[
        IamFlutterMobileOrganizationRow(id: 'org-9', title: 'Directory Acme', detail: 'org-9'),
      ],
    );
  }
}

const Map<String, String> _organizationMessages = <String, String>{
  'empty': 'No organizations.',
  'emptySearch': 'Nothing matched that search.',
  'loadError': 'Unable to load this view.',
  'loadMore': 'Load more',
  'retry': 'Retry',
  'searchAction': 'Search',
  'searchPlaceholder': 'Search organizations',
  'subtitle': 'Organizations you can see in this tenant.',
  'title': 'Organizations',
};

const Map<String, String> _accountBindingMessages = <String, String>{
  'cancel': 'Cancel',
  'disabled': 'Not allowed',
  'empty': 'No linked identities.',
  'enabled': 'Allowed',
  'linksSection': 'Linked identities',
  'loadError': 'Unable to load this view.',
  'loadMore': 'Load more',
  'policyContact': 'Contact binding',
  'policyEmail': 'Email binding',
  'policyOauth': 'Third-party sign-in',
  'policySection': 'What you can manage',
  'policyUnlink': 'Remove a binding yourself',
  'retry': 'Retry',
  'subtitle': 'Linked identities you can sign in with.',
  'title': 'Account binding',
  'unlink': 'Remove',
  'unlinkConfirm': 'Remove this sign-in method?',
};

class _FakeAccountBindingDataSource implements IamFlutterMobileAccountBindingDataSource {
  @override
  Future<IamFlutterMobileAccountBindingPolicy> loadPolicy() async {
    return const IamFlutterMobileAccountBindingPolicy(
      oauthEnabled: true,
      selfServiceUnlinkEnabled: true,
    );
  }

  @override
  Future<IamFlutterMobileAccountLinkPage> fetchLinksPage({
    required int page,
    required int pageSize,
  }) async {
    return const IamFlutterMobileAccountLinkPage(
      items: <IamFlutterMobileAccountLink>[
        IamFlutterMobileAccountLink(accountLinkId: 'link-1', provider: 'github'),
      ],
    );
  }

  @override
  Future<void> unlink(String accountLinkId) async {}
}

const Map<String, String> _userCenterMessages = <String, String>{
  'changePasswordAction': 'Update password',
  'confirmMismatch': 'The confirmation does not match.',
  'confirmPasswordLabel': 'Repeat new password',
  'displayNameLabel': 'Display name',
  'emailLabel': 'Email',
  'loadError': 'Unable to load this view.',
  'newPasswordLabel': 'New password',
  'newPasswordTooShort': 'The new password must be at least 8 characters.',
  'oldPasswordLabel': 'Current password',
  'oldPasswordRequired': 'Enter your current password.',
  'passwordChanged': 'Password updated.',
  'passwordSubtitle': 'Use at least 8 characters.',
  'passwordTitle': 'Change password',
  'phoneLabel': 'Phone',
  'profileSaved': 'Profile saved.',
  'retry': 'Retry',
  'saveAction': 'Save',
  'subtitle': 'Your own account details.',
  'title': 'My profile',
};

class _FakeUserCenterDataSource implements IamFlutterMobileUserCenterDataSource {
  @override
  Future<void> changePassword(IamFlutterMobileUserPasswordDraft draft) async {}

  @override
  Future<IamFlutterMobileUserProfile> loadProfile() async {
    return const IamFlutterMobileUserProfile(displayName: 'Ada', userId: 'user-1');
  }

  @override
  Future<IamFlutterMobileUserProfile> updateProfile(
    IamFlutterMobileUserProfileDraft draft,
  ) async {
    return IamFlutterMobileUserProfile(displayName: draft.displayName, userId: 'user-1');
  }
}

const Map<String, String> _oauthMessages = <String, String>{
  'authorizeUnavailable': 'This build cannot open a browser.',
  'connectAction': 'Connect',
  'empty': 'No provider is available.',
  'loadError': 'Unable to load this view.',
  'retry': 'Retry',
  'subtitle': 'Providers this tenant offers.',
  'title': 'Third-party sign-in',
};

const Map<String, String> _adminAccountBindingMessages = <String, String>{
  'empty': 'No user has linked an identity yet.',
  'loadError': 'Unable to load this view.',
  'retry': 'Retry',
  'searchAction': 'Search',
  'searchPlaceholder': 'Search by provider or user',
  'subtitle': 'Every third-party identity linked by a user in this tenant.',
  'title': 'Account bindings',
};

class _FakeAdminAccountBindingDataSource
    implements IamFlutterMobileAdminAccountBindingDataSource {
  @override
  Future<IamFlutterMobileAdminAccountLinkPage> fetchLinksPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    return const IamFlutterMobileAdminAccountLinkPage();
  }

  @override
  Future<IamFlutterMobileAdminAccountBindingPolicy> loadPolicy() async {
    return const IamFlutterMobileAdminAccountBindingPolicy();
  }

  @override
  Future<void> savePolicy(IamFlutterMobileAdminAccountBindingPolicy policy) async {}
}

const Map<String, String> _adminAuditMessages = <String, String>{
  'empty': 'No audit event was recorded yet.',
  'emptySearch': 'Nothing matched that search.',
  'loadError': 'Unable to load this view.',
  'loadMore': 'Load more',
  'retry': 'Retry',
  'searchAction': 'Search',
  'searchPlaceholder': 'Search by actor or action',
  'subtitle': 'What happened in this tenant.',
  'title': 'Audit events',
};

class _FakeAdminAuditDataSource implements IamFlutterMobileAdminAuditDataSource {
  @override
  Future<IamFlutterMobileAdminAuditPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    return const IamFlutterMobileAdminAuditPage();
  }
}

const Map<String, String> _adminOAuthMessages = <String, String>{
  'empty': 'No provider is configured yet.',
  'loadError': 'Unable to load this view.',
  'retry': 'Retry',
  'searchAction': 'Search',
  'searchPlaceholder': 'Search providers',
  'stateDisabled': 'Disabled',
  'stateEnabled': 'Enabled',
  'stateUnknown': 'State not reported',
  'subtitle': 'What this deployment can offer at sign-in.',
  'title': 'Sign-in providers',
};

class _FakeAdminOAuthDataSource implements IamFlutterMobileAdminOAuthDataSource {
  @override
  Future<IamFlutterMobileAdminOAuthProviderPage> fetchProvidersPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    return const IamFlutterMobileAdminOAuthProviderPage();
  }
}

const Map<String, String> _adminOrganizationMessages = <String, String>{
  'empty': 'This tenant has no organization yet.',
  'loadError': 'Unable to load this view.',
  'retry': 'Retry',
  'subtitle': 'The whole hierarchy.',
  'title': 'Organization tree',
};

class _FakeAdminOrganizationDataSource implements IamFlutterMobileAdminOrganizationDataSource {
  @override
  Future<List<IamFlutterMobileAdminOrganizationNode>> loadTree() async {
    return const <IamFlutterMobileAdminOrganizationNode>[];
  }
}

const Map<String, String> _adminTenantMessages = <String, String>{
  'empty': 'No tenant exists yet.',
  'emptySearch': 'Nothing matched that search.',
  'loadError': 'Unable to load this view.',
  'loadMore': 'Load more',
  'retry': 'Retry',
  'searchAction': 'Search',
  'searchPlaceholder': 'Search tenants',
  'subtitle': 'Every tenant this deployment serves.',
  'title': 'Tenants',
};

class _FakeAdminTenantDataSource implements IamFlutterMobileAdminTenantDataSource {
  @override
  Future<IamFlutterMobileAdminTenantPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    return const IamFlutterMobileAdminTenantPage();
  }
}

const Map<String, String> _adminPermissionMessages = <String, String>{
  'empty': 'This tenant has no permission yet.',
  'emptySearch': 'Nothing matched that search.',
  'loadError': 'Unable to load this view.',
  'loadMore': 'Load more',
  'retry': 'Retry',
  'searchAction': 'Search',
  'searchPlaceholder': 'Search permissions',
  'subtitle': 'The permission catalog.',
  'title': 'Permissions',
};

class _FakeAdminPermissionDataSource implements IamFlutterMobileAdminPermissionDataSource {
  @override
  Future<IamFlutterMobileAdminPolicyPage> fetchPoliciesPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    return const IamFlutterMobileAdminPolicyPage();
  }

  @override
  Future<IamFlutterMobileAdminPermissionPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    return const IamFlutterMobileAdminPermissionPage();
  }

  @override
  Future<IamFlutterMobileAdminRolePage> fetchRolesPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    return const IamFlutterMobileAdminRolePage();
  }
}

const Map<String, String> _consoleAccountBindingMessages = <String, String>{
  'allowed': 'Allowed',
  'cancel': 'Cancel',
  'denied': 'Not allowed',
  'emptyLinks': 'This user has no linked identities.',
  'linksSection': 'Linked identities',
  'loadError': 'Unable to load this view.',
  'policyContact': 'Contact binding',
  'policyEmail': 'Email binding',
  'policyOauth': 'Third-party sign-in',
  'policySection': 'Self-service policy',
  'policyUnlink': 'Self-service unlink',
  'retry': 'Retry',
  'subtitle': 'Linked identities and the tenant policy that gates removal.',
  'title': 'Account binding management',
  'unlink': 'Remove',
  'unlinkConfirm': 'Remove this sign-in method for the user?',
};

class _FakeConsoleAccountBindingDataSource
    implements IamFlutterMobileConsoleAccountBindingDataSource {
  @override
  Future<IamFlutterMobileConsoleAccountLinkPage> fetchLinksPage({
    required int page,
    required int pageSize,
  }) async {
    return const IamFlutterMobileConsoleAccountLinkPage();
  }

  @override
  Future<IamFlutterMobileConsoleAccountBindingPolicy> loadPolicy() async {
    return const IamFlutterMobileConsoleAccountBindingPolicy();
  }

  @override
  Future<void> unlink(String accountLinkId) async {}
}

const Map<String, String> _consoleUserCenterMessages = <String, String>{
  'accountSection': 'Account',
  'displayName': 'Display name',
  'email': 'Email',
  'loadError': 'Unable to load this view.',
  'notReported': 'Not reported',
  'optional': 'Optional',
  'phone': 'Phone',
  'required': 'Required',
  'retry': 'Retry',
  'subtitle': "The signed-in user's own record, as the console sees it.",
  'title': 'User center',
  'userId': 'User',
  'verificationContact': 'Contact verification',
  'verificationEmail': 'Email verification',
  'verificationOauth': 'Third-party sign-in',
  'verificationSection': 'Verification policy',
};

class _FakeConsoleUserCenterDataSource
    implements IamFlutterMobileConsoleUserCenterDataSource {
  @override
  Future<IamFlutterMobileConsoleUserAccount> loadAccount() async {
    return const IamFlutterMobileConsoleUserAccount(userId: 'user-1');
  }

  @override
  Future<IamFlutterMobileConsoleUserVerificationPolicy> loadVerificationPolicy() async {
    return const IamFlutterMobileConsoleUserVerificationPolicy();
  }
}

const Map<String, String> _consoleOrganizationMessages = <String, String>{
  'empty': 'This tenant has no organizations yet.',
  'emptySearch': 'Nothing matched that search.',
  'loadError': 'Unable to load this view.',
  'loadMore': 'Load more',
  'retry': 'Retry',
  'searchAction': 'Search',
  'searchPlaceholder': 'Search organizations',
  'subtitle': 'Every organization of the tenant you are acting in.',
  'title': 'Organization management',
};

class _FakeConsoleOrganizationDataSource implements IamFlutterMobileConsoleOrganizationDataSource {
  @override
  Future<IamFlutterMobileConsoleOrganizationPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    return const IamFlutterMobileConsoleOrganizationPage();
  }
}

const Map<String, String> _consoleTenantMessages = <String, String>{
  'allowed': 'Allowed',
  'denied': 'Not allowed',
  'emptyOrganizations': 'This tenant has no organizations yet.',
  'environment': 'Environment',
  'loadError': 'Unable to load this view.',
  'loadMore': 'Load more',
  'notReported': 'Not reported',
  'organizationsSection': 'Organizations',
  'policyContact': 'Contact binding',
  'policyEmail': 'Email binding',
  'policyOauth': 'Third-party sign-in',
  'policySection': 'Self-service policy',
  'policyUnlink': 'Self-service unlink',
  'retry': 'Retry',
  'sessionSection': 'Session',
  'subtitle': 'The tenant you are acting in, its policy and its organizations.',
  'tenant': 'Tenant',
  'title': 'Tenant management',
  'user': 'Operator',
};

class _FakeConsoleTenantDataSource implements IamFlutterMobileConsoleTenantDataSource {
  @override
  Future<IamFlutterMobileConsoleTenantOrganizationPage> fetchOrganizationsPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    return const IamFlutterMobileConsoleTenantOrganizationPage();
  }

  @override
  Future<IamFlutterMobileConsoleTenantPolicy> loadPolicy() async {
    return const IamFlutterMobileConsoleTenantPolicy();
  }

  @override
  Future<IamFlutterMobileConsoleTenantRuntime> loadRuntime() async {
    return const IamFlutterMobileConsoleTenantRuntime(tenantId: 'tenant-1');
  }
}

class _FakeOAuthDataSource implements IamFlutterMobileOAuthDataSource {
  @override
  Future<String> createAuthorizationUrl(String providerKey) async {
    return 'https://idp.example.com/authorize?provider=$providerKey';
  }

  @override
  Future<List<IamFlutterMobileOAuthProvider>> loadProviders() async {
    return const <IamFlutterMobileOAuthProvider>[
      IamFlutterMobileOAuthProvider(displayName: 'GitHub', providerKey: 'github'),
    ];
  }
}

IamFlutterMobileAuthController _auth(_FakeAuthDataSource source) {
  return IamFlutterMobileAuthController(
    service: IamFlutterMobileAuthService(dataSource: source),
  );
}

Widget _shell(_FakeAuthDataSource source, {List<String>? openedUrls}) {
  return IamHomeShell(
    accountBindingDataSource: _FakeAccountBindingDataSource(),
    accountBindingMessages: _accountBindingMessages,
    adminAccountBindingDataSource: _FakeAdminAccountBindingDataSource(),
    adminAccountBindingMessages: _adminAccountBindingMessages,
    adminAuditDataSource: _FakeAdminAuditDataSource(),
    adminAuditMessages: _adminAuditMessages,
    adminOAuthDataSource: _FakeAdminOAuthDataSource(),
    adminOAuthMessages: _adminOAuthMessages,
    adminOrganizationDataSource: _FakeAdminOrganizationDataSource(),
    adminOrganizationMessages: _adminOrganizationMessages,
    adminPermissionDataSource: _FakeAdminPermissionDataSource(),
    adminTenantDataSource: _FakeAdminTenantDataSource(),
    adminTenantMessages: _adminTenantMessages,
    adminPermissionMessages: _adminPermissionMessages,
    authController: _auth(source),
    authMessages: _authMessages,
    consoleOrganizationDataSource: _FakeConsoleOrganizationDataSource(),
    consoleOrganizationMessages: _consoleOrganizationMessages,
    consoleAccountBindingDataSource: _FakeConsoleAccountBindingDataSource(),
    consoleAccountBindingMessages: _consoleAccountBindingMessages,
    consoleUserCenterDataSource: _FakeConsoleUserCenterDataSource(),
    consoleUserCenterMessages: _consoleUserCenterMessages,
    consoleTenantDataSource: _FakeConsoleTenantDataSource(),
    consoleTenantMessages: _consoleTenantMessages,
    organizationDataSource: _FakeOrganizationDataSource(),
    organizationMessages: _organizationMessages,
    oauthDataSource: _FakeOAuthDataSource(),
    oauthMessages: _oauthMessages,
    tenantDataSource: _FakeTenantDataSource(),
    tenantMessages: _tenantMessages,
    urlOpener: openedUrls == null
        ? null
        : (String url) async {
            openedUrls.add(url);
            return true;
          },
    userCenterDataSource: _FakeUserCenterDataSource(),
    userCenterMessages: _userCenterMessages,
  );
}

void main() {
  testWidgets('signed out, the shell opens the sign-in screen', (WidgetTester tester) async {
    await tester.pumpWidget(_shell(_FakeAuthDataSource()));
    await tester.pumpAndSettle();

    expect(find.text('Sign in'), findsWidgets);
    expect(find.byType(TextField), findsNWidgets(2));
    // The tenant screen must not be mounted before a session exists.
    expect(find.text('Acme'), findsNothing);
  });

  testWidgets('a successful sign-in swaps to the tenant screen', (WidgetTester tester) async {
    final _FakeAuthDataSource source = _FakeAuthDataSource();
    await tester.pumpWidget(_shell(source));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).first, '13800138000');
    await tester.enterText(find.byType(TextField).last, 'secret');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();

    expect(source.signInCalls, 1);
    expect(find.text('Acme'), findsOneWidget);
    expect(find.text('tenant-1'), findsOneWidget);
  });

  testWidgets('an existing session opens the tenant screen directly', (WidgetTester tester) async {
    final _FakeAuthDataSource source =
        _FakeAuthDataSource(session: const IamFlutterMobileAuthSession(accessToken: 'token-1'));
    await tester.pumpWidget(_shell(source));
    await tester.pumpAndSettle();

    expect(find.text('Acme'), findsOneWidget);
  });

  testWidgets('registers both screens under their cross-client route ids', (WidgetTester tester) async {
    await tester.pumpWidget(_shell(_FakeAuthDataSource()));
    await tester.pumpAndSettle();

    final MaterialApp app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.routes, isNotNull);
    expect(app.routes!.containsKey('/auth/login'), isTrue);
    expect(app.routes!.containsKey('/auth/forgot-password'), isTrue);
    expect(app.routes!.containsKey('/tenant'), isTrue);
    expect(app.routes!.containsKey('/organizations'), isTrue);
    expect(app.routes!.containsKey('/user/account-binding'), isTrue);
    expect(app.routes!.containsKey('/user/profile'), isTrue);
    expect(app.routes!.containsKey('/user/password'), isTrue);
    expect(app.routes!.containsKey('/oauth/providers'), isTrue);
    expect(app.routes!.containsKey('/console/iam/tenant'), isTrue);
    expect(app.routes!.containsKey('/console/iam/organizations'), isTrue);
    expect(app.routes!.containsKey('/console/iam/user'), isTrue);
    expect(app.routes!.containsKey('/console/iam/account-binding'), isTrue);
    expect(app.routes!.containsKey('/admin/iam/permissions'), isTrue);
    expect(app.routes!.containsKey('/admin/iam/roles'), isTrue);
    expect(app.routes!.containsKey('/admin/iam/policies'), isTrue);
    expect(app.routes!.containsKey('/admin/iam/oauth-providers'), isTrue);
    expect(app.routes!.containsKey('/admin/iam/account-bindings'), isTrue);
    expect(app.routes!.containsKey('/admin/iam/audit'), isTrue);
    expect(app.routes!.containsKey('/admin/iam/tenants'), isTrue);
    expect(app.routes!.containsKey('/admin/iam/organizations'), isTrue);

    // The ids the shell registers must be the ones the capability packages
    // contribute; a mismatch would break deep links while the UI still looked
    // correct.
    final Set<String> contributed = <String>{
      for (final RouteContribution contribution in iamFlutterMobileAuthRouteContributions)
        '${contribution.id}:${contribution.path}',
      for (final RouteContribution contribution in iamFlutterMobileTenantRouteContributions)
        '${contribution.id}:${contribution.path}',
      for (final RouteContribution contribution in iamFlutterMobileOrganizationRouteContributions)
        '${contribution.id}:${contribution.path}',
      for (final RouteContribution contribution
          in iamFlutterMobileAccountBindingRouteContributions)
        '${contribution.id}:${contribution.path}',
      for (final RouteContribution contribution in iamFlutterMobileUserCenterRouteContributions)
        '${contribution.id}:${contribution.path}',
      for (final RouteContribution contribution in iamFlutterMobileOauthRouteContributions)
        '${contribution.id}:${contribution.path}',
      // The console tier owns its own RouteContribution type (console-core registry), so
      // this loop infers rather than naming the app-core type.
      for (final contribution in iamFlutterMobileConsoleTenantRouteContributions)
        '${contribution.id}:${contribution.path}',
      for (final contribution in iamFlutterMobileConsoleOrganizationRouteContributions)
        '${contribution.id}:${contribution.path}',
      for (final contribution in iamFlutterMobileConsoleAccountBindingRouteContributions)
        '${contribution.id}:${contribution.path}',
      for (final contribution in iamFlutterMobileConsoleUserCenterRouteContributions)
        '${contribution.id}:${contribution.path}',
    };
    expect(contributed, contains('app.iam.auth.login:/auth/login'));
    expect(contributed, contains('app.iam.auth.forgot-password:/auth/forgot-password'));
    expect(contributed, contains('app.iam.tenant.overview:/tenant'));
    expect(contributed, contains('app.iam.organization.directory:/organizations'));
    expect(contributed, contains('app.iam.account-binding.list:/user/account-binding'));
    expect(contributed, contains('app.iam.user-center.profile:/user/profile'));
    expect(contributed, contains('app.iam.user-center.password:/user/password'));
    expect(contributed, contains('app.iam.oauth.providers:/oauth/providers'));
    expect(contributed, contains('console.iam.tenant.overview:/console/iam/tenant'));
    expect(
      contributed,
      contains('console.iam.organization.directory:/console/iam/organizations'),
    );
  });

  testWidgets('opens the organization directory from the tenant screen', (WidgetTester tester) async {
    final _FakeAuthDataSource source =
        _FakeAuthDataSource(session: const IamFlutterMobileAuthSession(accessToken: 'token-1'));
    await tester.pumpWidget(_shell(source));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(FilledButton, 'Organizations'));
    await tester.pumpAndSettle();

    expect(find.text('Directory Acme'), findsOneWidget);
  });

  testWidgets('opens the OAuth authorization URL through the host opener',
      (WidgetTester tester) async {
    final _FakeAuthDataSource source =
        _FakeAuthDataSource(session: const IamFlutterMobileAuthSession(accessToken: 'token-1'));
    final List<String> opened = <String>[];
    await tester.pumpWidget(_shell(source, openedUrls: opened));
    await tester.pumpAndSettle();

    final NavigatorState navigator = tester.state<NavigatorState>(find.byType(Navigator).first);
    navigator.pushNamed('/oauth/providers');
    await tester.pumpAndSettle();

    await tester.tap(find.text('Connect'));
    await tester.pumpAndSettle();

    // The shell, not the capability package, opens the URL: this is the seam that
    // keeps platform plugins out of capability code.
    expect(opened, <String>['https://idp.example.com/authorize?provider=github']);
  });
}
