// SDKWORK-IAM-FLUTTER: authored shell test.
/**
 * The app root used to compile but render nothing, then mounted the tenant screen
 * behind no gate. These cases pin the wiring: signed out, the shell opens the
 * sign-in screen; a successful sign-in swaps to the tenant screen; and both routes
 * are registered under their cross-client ids.
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_auth/sdkwork_iam_flutter_mobile_auth.dart';
import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';
import 'package:sdkwork_iam_flutter_mobile_organization/sdkwork_iam_flutter_mobile_organization.dart';
import 'package:sdkwork_iam_flutter_mobile_tenant/sdkwork_iam_flutter_mobile_tenant.dart';

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

IamFlutterMobileAuthController _auth(_FakeAuthDataSource source) {
  return IamFlutterMobileAuthController(
    service: IamFlutterMobileAuthService(dataSource: source),
  );
}

Widget _shell(_FakeAuthDataSource source) {
  return IamHomeShell(
    authController: _auth(source),
    authMessages: _authMessages,
    organizationDataSource: _FakeOrganizationDataSource(),
    organizationMessages: _organizationMessages,
    tenantDataSource: _FakeTenantDataSource(),
    tenantMessages: _tenantMessages,
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
    expect(app.routes!.containsKey('/tenant'), isTrue);
    expect(app.routes!.containsKey('/organizations'), isTrue);

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
    };
    expect(contributed, contains('app.iam.auth.login:/auth/login'));
    expect(contributed, contains('app.iam.tenant.overview:/tenant'));
    expect(contributed, contains('app.iam.organization.directory:/organizations'));
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
}
