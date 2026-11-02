// SDKWORK-IAM-FLUTTER-ADMIN-TENANT: authored tests.
/**
 * Rendering contract of the admin tenant list.
 *
 * A tenant row is matched against a support ticket, so the cases pin the two halves an
 * operator needs — the name they recognise and the id they were given — plus the server-side
 * search that finds either.
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_tenant/sdkwork_iam_flutter_mobile_admin_tenant.dart';

const Map<String, String> _messages = <String, String>{
  'empty': 'No tenant exists yet.',
  'emptySearch': 'Nothing matched that search.',
  'loadError': 'Unable to load this view.',
  'loadMore': 'Load more',
  'retry': 'Retry',
  'searchAction': 'Search',
  'searchPlaceholder': 'Search tenants',
  'subtitle': 'Every tenant this deployment serves, over the backend-api.',
  'title': 'Tenants',
};

class _FakeDataSource implements IamFlutterMobileAdminTenantDataSource {
  _FakeDataSource({this.pages = const <IamFlutterMobileAdminTenantPage>[]});

  final List<IamFlutterMobileAdminTenantPage> pages;
  final List<String?> queries = <String?>[];

  @override
  Future<IamFlutterMobileAdminTenantPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    queries.add(q);
    if (page < pages.length) return pages[page];
    return const IamFlutterMobileAdminTenantPage();
  }
}

IamFlutterMobileAdminTenantController _controller(_FakeDataSource source) {
  return IamFlutterMobileAdminTenantController(
    service: IamFlutterMobileAdminTenantService(dataSource: source),
  );
}

Widget _screen(_FakeDataSource source) {
  return MaterialApp(
    home: IamFlutterMobileAdminTenantScreen(
      controller: _controller(source),
      messages: _messages,
    ),
  );
}

void main() {
  testWidgets('shows the name an operator recognises and the id they were given',
      (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileAdminTenantPage>[
        IamFlutterMobileAdminTenantPage(
          items: <IamFlutterMobileAdminTenantRow>[
            IamFlutterMobileAdminTenantRow(id: 'tenant-1', name: 'Acme', status: 'active'),
          ],
        ),
      ],
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    expect(find.text('Acme'), findsOneWidget);
    expect(find.text('tenant-1 · active'), findsOneWidget);
  });

  testWidgets('sends the typed term to the server', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileAdminTenantPage>[IamFlutterMobileAdminTenantPage()],
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'tenant-1');
    await tester.tap(find.text('Search'));
    await tester.pumpAndSettle();

    expect(source.queries.last, 'tenant-1');
    expect(find.text('Nothing matched that search.'), findsOneWidget);
  });

  testWidgets('falls back to the slug when the tenant has no name', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileAdminTenantPage>[
        IamFlutterMobileAdminTenantPage(
          items: <IamFlutterMobileAdminTenantRow>[
            IamFlutterMobileAdminTenantRow(id: 'tenant-2', slug: 'acme-labs'),
          ],
        ),
      ],
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    expect(find.text('acme-labs'), findsOneWidget);
  });
}
