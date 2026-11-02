// SDKWORK-IAM-FLUTTER-ORGANIZATION: authored screen test.
/**
 * Rendering contract of the organization directory.
 *
 * The capability takes a data port for exactly this reason: paging, search and a
 * failed next page are the states that break in production, and a double makes all
 * of them reproducible without a backend.
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_organization/sdkwork_iam_flutter_mobile_organization.dart';

const Map<String, String> _messages = <String, String>{
  'empty': 'No organizations.',
  'emptySearch': 'Nothing matched that search.',
  'loadError': 'Unable to load this view.',
  'loadMore': 'Load more',
  'loading': 'Loading…',
  'retry': 'Retry',
  'searchAction': 'Search',
  'searchPlaceholder': 'Search organizations',
  'subtitle': 'Organizations you can see in this tenant.',
  'title': 'Organizations',
};

class _FakeDataSource implements IamFlutterMobileOrganizationDataSource {
  _FakeDataSource({this.error, this.pages = const <IamFlutterMobileOrganizationPage>[]});

  final List<IamFlutterMobileOrganizationPage> pages;
  final Object? error;
  final List<String?> queries = <String?>[];

  @override
  Future<IamFlutterMobileOrganizationPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    queries.add(q);
    if (error != null) throw error!;
    if (page < pages.length) return pages[page];
    return const IamFlutterMobileOrganizationPage();
  }
}

Widget _wrap(IamFlutterMobileOrganizationController controller) {
  return MaterialApp(
    home: IamFlutterMobileOrganizationScreen(controller: controller, messages: _messages),
  );
}

IamFlutterMobileOrganizationController _controller(_FakeDataSource source) {
  return IamFlutterMobileOrganizationController(
    service: IamFlutterMobileOrganizationService(dataSource: source),
  );
}

void main() {
  testWidgets('renders rows once the first page resolves', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileOrganizationPage>[
        IamFlutterMobileOrganizationPage(
          hasMore: false,
          items: <IamFlutterMobileOrganizationRow>[
            IamFlutterMobileOrganizationRow(id: 'org-1', title: 'Acme', detail: 'org-1'),
            IamFlutterMobileOrganizationRow(id: 'org-2', title: 'Acme Labs', detail: 'org-2 · org-1'),
          ],
        ),
      ],
    );

    await tester.pumpWidget(_wrap(_controller(source)));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    await tester.pumpAndSettle();

    expect(find.text('Acme'), findsOneWidget);
    expect(find.text('Acme Labs'), findsOneWidget);
    expect(find.text('org-2 · org-1'), findsOneWidget);
    expect(source.queries, <String?>[null]);
  });

  testWidgets('appends the next page instead of replacing the list', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileOrganizationPage>[
        IamFlutterMobileOrganizationPage(
          hasMore: true,
          items: <IamFlutterMobileOrganizationRow>[
            IamFlutterMobileOrganizationRow(id: 'org-1', title: 'Acme'),
          ],
        ),
        IamFlutterMobileOrganizationPage(
          items: <IamFlutterMobileOrganizationRow>[
            IamFlutterMobileOrganizationRow(id: 'org-2', title: 'Beta'),
          ],
        ),
      ],
    );

    await tester.pumpWidget(_wrap(_controller(source)));
    await tester.pumpAndSettle();
    expect(find.text('Acme'), findsOneWidget);
    expect(find.text('Beta'), findsNothing);

    await tester.tap(find.text('Load more'));
    await tester.pumpAndSettle();

    // Both pages are on screen: a load-more that replaced the list would have lost
    // the row the user was reading.
    expect(find.text('Acme'), findsOneWidget);
    expect(find.text('Beta'), findsOneWidget);
  });

  testWidgets('sends the typed term to the server and shows the empty-search state',
      (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileOrganizationPage>[IamFlutterMobileOrganizationPage()],
    );

    await tester.pumpWidget(_wrap(_controller(source)));
    await tester.pumpAndSettle();
    expect(find.text('No organizations.'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'acme');
    await tester.tap(find.text('Search'));
    await tester.pumpAndSettle();

    expect(source.queries.last, 'acme');
    expect(find.text('Nothing matched that search.'), findsOneWidget);
  });

  testWidgets('reports a failed first page with a retry', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(error: StateError('backend down'));
    await tester.pumpWidget(_wrap(_controller(source)));
    await tester.pumpAndSettle();

    expect(find.text('backend down'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });

  testWidgets('a missing data source is reported, not swallowed', (WidgetTester tester) async {
    await tester.pumpWidget(_wrap(IamFlutterMobileOrganizationController()));
    await tester.pumpAndSettle();

    expect(find.textContaining('IamFlutterMobileOrganizationDataSource'), findsOneWidget);
  });
}
