// SDKWORK-IAM-FLUTTER-TENANT: authored screen test.
/**
 * Rendering contract of the tenant overview screen.
 *
 * The cases pin the three states a capability screen can be in and the reason the
 * package takes a data port: an injected double makes a failed load and an empty
 * dataset reproducible without a network or a running backend.
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_tenant/sdkwork_iam_flutter_mobile_tenant.dart';

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
  _FakeDataSource({this.error, this.overview});

  final Object? error;
  final IamFlutterMobileTenantOverview? overview;
  int calls = 0;

  @override
  Future<IamFlutterMobileTenantOverview> loadOverview() async {
    calls += 1;
    if (error != null) throw error!;
    return overview ?? const IamFlutterMobileTenantOverview();
  }
}

IamFlutterMobileTenantController _controller(IamFlutterMobileTenantDataSource source) {
  return IamFlutterMobileTenantController(
    service: IamFlutterMobileTenantService(dataSource: source),
  );
}

Widget _wrap(IamFlutterMobileTenantController controller) {
  return MaterialApp(
    home: IamFlutterMobileTenantScreen(controller: controller, messages: _messages),
  );
}

void main() {
  testWidgets('renders the session, organizations and memberships once loaded', (
    WidgetTester tester,
  ) async {
    final _FakeDataSource source = _FakeDataSource(
      overview: const IamFlutterMobileTenantOverview(
        environment: 'development',
        memberships: <IamFlutterMobileTenantRow>[
          IamFlutterMobileTenantRow(id: 'mem-1', title: 'Ada', detail: 'org-1 · user-1'),
        ],
        organizations: <IamFlutterMobileTenantRow>[
          IamFlutterMobileTenantRow(id: 'org-1', title: 'Acme', detail: 'org-1'),
        ],
        tenantId: 'tenant-1',
        userId: 'user-1',
      ),
    );

    await tester.pumpWidget(_wrap(_controller(source)));
    // First frame is the loading state; the post-frame callback starts the load.
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await tester.pumpAndSettle();

    expect(find.text('Tenant'), findsWidgets);
    expect(find.text('tenant-1'), findsOneWidget);
    expect(find.text('development'), findsOneWidget);
    expect(find.text('Acme'), findsOneWidget);
    expect(find.text('Ada'), findsOneWidget);
    expect(find.text('Session'), findsOneWidget);
    expect(find.text('My memberships'), findsOneWidget);
    expect(source.calls, 1);
  });

  testWidgets('shows the empty state instead of blank sections', (WidgetTester tester) async {
    await tester.pumpWidget(_wrap(_controller(_FakeDataSource())));
    await tester.pumpAndSettle();

    // Two empty sections plus the "not reported" fields; the point is that the
    // screen says so rather than rendering nothing.
    expect(find.text('Nothing to show yet.'), findsNWidgets(2));
    expect(find.text('Not reported'), findsNWidgets(3));
  });

  testWidgets('shows the failure with a retry that loads again', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(error: StateError('backend down'));
    final IamFlutterMobileTenantController controller = _controller(source);

    await tester.pumpWidget(_wrap(controller));
    await tester.pumpAndSettle();

    expect(find.text('backend down'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);

    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();
    expect(source.calls, 2);
  });

  testWidgets('a missing data source is reported, not swallowed', (WidgetTester tester) async {
    final IamFlutterMobileTenantController controller = IamFlutterMobileTenantController();
    await tester.pumpWidget(_wrap(controller));
    await tester.pumpAndSettle();

    expect(find.textContaining('IamFlutterMobileTenantDataSource'), findsOneWidget);
  });
}
