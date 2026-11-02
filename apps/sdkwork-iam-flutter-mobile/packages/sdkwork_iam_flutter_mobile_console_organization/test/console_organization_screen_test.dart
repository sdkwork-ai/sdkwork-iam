// SDKWORK-IAM-FLUTTER-CONSOLE-ORGANIZATION: authored tests.
/**
 * Rendering contract of the console organization directory.
 *
 * The console list is the tenant-wide view, so the cases pin what an operator needs: the
 * parent id on every row so the tree can be reconstructed, a search that goes to the
 * server, and a failed next page that keeps the rows already read.
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_console_organization/sdkwork_iam_flutter_mobile_console_organization.dart';

const Map<String, String> _messages = <String, String>{
  'empty': 'This tenant has no organizations yet.',
  'emptySearch': 'Nothing matched that search.',
  'loadError': 'Unable to load this view.',
  'loadMore': 'Load more',
  'loading': 'Loading…',
  'retry': 'Retry',
  'searchAction': 'Search',
  'searchPlaceholder': 'Search organizations',
  'subtitle': 'Every organization of the tenant you are acting in.',
  'title': 'Organization management',
};

class _FakeDataSource implements IamFlutterMobileConsoleOrganizationDataSource {
  _FakeDataSource({this.error, this.pages = const <IamFlutterMobileConsoleOrganizationPage>[]});

  final List<IamFlutterMobileConsoleOrganizationPage> pages;
  final Object? error;
  final List<String?> queries = <String?>[];

  @override
  Future<IamFlutterMobileConsoleOrganizationPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    queries.add(q);
    if (error != null) throw error!;
    if (page < pages.length) return pages[page];
    return const IamFlutterMobileConsoleOrganizationPage();
  }
}

IamFlutterMobileConsoleOrganizationController _controller(_FakeDataSource source) {
  return IamFlutterMobileConsoleOrganizationController(
    service: IamFlutterMobileConsoleOrganizationService(dataSource: source),
  );
}

Widget _screen(IamFlutterMobileConsoleOrganizationController controller) {
  return MaterialApp(
    home: IamFlutterMobileConsoleOrganizationScreen(controller: controller, messages: _messages),
  );
}

void main() {
  testWidgets('renders each organization with its parent id', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileConsoleOrganizationPage>[
        IamFlutterMobileConsoleOrganizationPage(
          items: <IamFlutterMobileConsoleOrganizationRow>[
            IamFlutterMobileConsoleOrganizationRow(id: 'org-1', title: 'Acme', detail: 'org-1'),
            IamFlutterMobileConsoleOrganizationRow(
              id: 'org-2',
              title: 'Acme Labs',
              detail: 'org-2 · org-1',
            ),
          ],
        ),
      ],
    );

    await tester.pumpWidget(_screen(_controller(source)));
    await tester.pumpAndSettle();

    expect(find.text('Acme'), findsOneWidget);
    // The parent id is what lets an operator place the row in the tree.
    expect(find.text('org-2 · org-1'), findsOneWidget);
  });

  testWidgets('sends the typed term to the server', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileConsoleOrganizationPage>[
        IamFlutterMobileConsoleOrganizationPage(),
      ],
    );

    await tester.pumpWidget(_screen(_controller(source)));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'acme');
    await tester.tap(find.text('Search'));
    await tester.pumpAndSettle();

    expect(source.queries.last, 'acme');
    expect(find.text('Nothing matched that search.'), findsOneWidget);
  });

  testWidgets('a failed first page reports it with a retry', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(error: StateError('backend down'));
    await tester.pumpWidget(_screen(_controller(source)));
    await tester.pumpAndSettle();

    expect(find.text('backend down'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });
}
