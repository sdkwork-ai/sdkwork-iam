// SDKWORK-IAM-FLUTTER-CONSOLE-TENANT: authored tests.
/**
 * Rendering contract of the console tenant workspace.
 *
 * The console exists to answer "what is this tenant's" rather than "what is mine", so the
 * cases pin the policy region the app screen never shows, and the fact that a
 * not-allowed policy is reported rather than hidden.
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_console_tenant/sdkwork_iam_flutter_mobile_console_tenant.dart';

const Map<String, String> _messages = <String, String>{
  'allowed': 'Allowed',
  'denied': 'Not allowed',
  'emptyOrganizations': 'This tenant has no organizations yet.',
  'environment': 'Environment',
  'loadError': 'Unable to load this view.',
  'loadMore': 'Load more',
  'loading': 'Loading…',
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

class _FakeDataSource implements IamFlutterMobileConsoleTenantDataSource {
  _FakeDataSource({
    this.organizations = const <IamFlutterMobileConsoleTenantOrganization>[],
    this.policy = const IamFlutterMobileConsoleTenantPolicy(),
    this.throwOnLoad = false,
  });

  final List<IamFlutterMobileConsoleTenantOrganization> organizations;
  final IamFlutterMobileConsoleTenantPolicy policy;
  final bool throwOnLoad;

  @override
  Future<IamFlutterMobileConsoleTenantOrganizationPage> fetchOrganizationsPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    if (throwOnLoad) throw StateError('backend down');
    return IamFlutterMobileConsoleTenantOrganizationPage(
      items: page == 0 ? organizations : const <IamFlutterMobileConsoleTenantOrganization>[],
    );
  }

  @override
  Future<IamFlutterMobileConsoleTenantPolicy> loadPolicy() async => policy;

  @override
  Future<IamFlutterMobileConsoleTenantRuntime> loadRuntime() async {
    return const IamFlutterMobileConsoleTenantRuntime(
      environment: 'development',
      tenantId: 'tenant-1',
      userId: 'user-1',
    );
  }
}

IamFlutterMobileConsoleTenantController _controller(_FakeDataSource source) {
  return IamFlutterMobileConsoleTenantController(
    service: IamFlutterMobileConsoleTenantService(dataSource: source),
  );
}

Widget _screen(_FakeDataSource source) {
  return MaterialApp(
    home: IamFlutterMobileConsoleTenantScreen(
      controller: _controller(source),
      messages: _messages,
    ),
  );
}

void main() {
  testWidgets('shows the tenant identity and its organizations', (WidgetTester tester) async {
    await tester.pumpWidget(
      _screen(
        _FakeDataSource(
          organizations: const <IamFlutterMobileConsoleTenantOrganization>[
            IamFlutterMobileConsoleTenantOrganization(id: 'org-1', title: 'Acme'),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('tenant-1'), findsOneWidget);
    expect(find.text('development'), findsOneWidget);
    expect(find.text('Acme'), findsOneWidget);
  });

  testWidgets('reports every policy row, not only the granted ones', (WidgetTester tester) async {
    await tester.pumpWidget(
      _screen(
        _FakeDataSource(
          policy: const IamFlutterMobileConsoleTenantPolicy(
            emailEnabled: true,
            oauthEnabled: true,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // The two ungranted rows must read "Not allowed" rather than disappear: an operator
    // needs to know the user cannot do it, not merely find no row.
    expect(find.text('Self-service unlink'), findsOneWidget);
    expect(find.text('Not allowed'), findsNWidgets(2));
    expect(find.text('Allowed'), findsNWidgets(2));
  });

  testWidgets('shows the empty organization state', (WidgetTester tester) async {
    await tester.pumpWidget(_screen(_FakeDataSource()));
    await tester.pumpAndSettle();

    expect(find.text('This tenant has no organizations yet.'), findsOneWidget);
  });

  testWidgets('a failed load reports it with a retry', (WidgetTester tester) async {
    await tester.pumpWidget(_screen(_FakeDataSource(throwOnLoad: true)));
    await tester.pumpAndSettle();

    expect(find.text('backend down'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });
}
