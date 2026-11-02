// SDKWORK-IAM-FLUTTER: authored shell test.
/**
 * The app root used to compile but render nothing: the shell mounted an empty
 * `SizedBox` and the app never referenced a capability screen.
 *
 * These cases pin the wiring instead: the shell mounts the tenant screen, the
 * screen is reachable through its named route, and the route identity the shell
 * registers is the one the capability package contributes.
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';
import 'package:sdkwork_iam_flutter_mobile_tenant/sdkwork_iam_flutter_mobile_tenant.dart';

import 'package:sdkwork_iam_flutter_mobile/shell/app_shell.dart';

const Map<String, String> _messages = <String, String>{
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

class _FakeDataSource implements IamFlutterMobileTenantDataSource {
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

void main() {
  testWidgets('mounts the tenant screen as the home route', (WidgetTester tester) async {
    await tester.pumpWidget(IamHomeShell(dataSource: _FakeDataSource(), messages: _messages));
    await tester.pumpAndSettle();

    expect(find.text('Tenant'), findsWidgets);
    expect(find.text('Acme'), findsOneWidget);
    expect(find.text('tenant-1'), findsOneWidget);
  });

  testWidgets('registers the tenant screen under its cross-client route id', (WidgetTester tester) async {
    await tester.pumpWidget(IamHomeShell(dataSource: _FakeDataSource(), messages: _messages));
    await tester.pumpAndSettle();

    final MaterialApp app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.routes, isNotNull);
    expect(app.routes!.containsKey('/tenant'), isTrue);

    // The route id the shell registers must be the one the capability package
    // contributes; a mismatch would break deep links while the UI still looked
    // correct.
    final Set<String> contributed = iamFlutterMobileTenantRouteContributions
        .map((RouteContribution contribution) => '${contribution.id}:${contribution.path}')
        .toSet();
    expect(contributed, contains('app.iam.tenant.overview:/tenant'));
  });

  testWidgets('navigates to the tenant route from a named push', (WidgetTester tester) async {
    await tester.pumpWidget(IamHomeShell(dataSource: _FakeDataSource(), messages: _messages));
    await tester.pumpAndSettle();

    final NavigatorState navigator = tester.state<NavigatorState>(find.byType(Navigator).first);
    navigator.pushNamed('/tenant');
    await tester.pumpAndSettle();

    expect(find.text('Acme'), findsOneWidget);
  });
}
