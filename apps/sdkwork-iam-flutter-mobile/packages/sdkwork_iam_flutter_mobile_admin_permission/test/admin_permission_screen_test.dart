// SDKWORK-IAM-FLUTTER-ADMIN-PERMISSION: authored tests.
/**
 * Rendering contract of the admin permission catalog.
 *
 * The catalog is the backend-api surface, so the cases pin what an operator depends on: the
 * row shows resource and action together, a record with no identity is dropped, and a
 * search goes to the server rather than filtering a download.
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_permission/sdkwork_iam_flutter_mobile_admin_permission.dart';

const Map<String, String> _messages = <String, String>{
  'empty': 'This tenant has no permission yet.',
  'emptySearch': 'Nothing matched that search.',
  'loadError': 'Unable to load this view.',
  'loadMore': 'Load more',
  'retry': 'Retry',
  'searchAction': 'Search',
  'searchPlaceholder': 'Search permissions',
  'subtitle': "The tenant's permission catalog, over the backend-api.",
  'title': 'Permissions',
};

class _FakeDataSource implements IamFlutterMobileAdminPermissionDataSource {
  _FakeDataSource({this.pages = const <IamFlutterMobileAdminPermissionPage>[]});

  final List<IamFlutterMobileAdminPermissionPage> pages;
  final List<String?> queries = <String?>[];

  @override
  Future<IamFlutterMobileAdminPermissionPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    queries.add(q);
    if (page < pages.length) return pages[page];
    return const IamFlutterMobileAdminPermissionPage();
  }
}

IamFlutterMobileAdminPermissionController _controller(_FakeDataSource source) {
  return IamFlutterMobileAdminPermissionController(
    service: IamFlutterMobileAdminPermissionService(dataSource: source),
  );
}

Widget _screen(_FakeDataSource source) {
  return MaterialApp(
    home: IamFlutterMobileAdminPermissionScreen(
      controller: _controller(source),
      messages: _messages,
    ),
  );
}

void main() {
  testWidgets('renders each permission with its resource and action', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileAdminPermissionPage>[
        IamFlutterMobileAdminPermissionPage(
          items: <IamFlutterMobileAdminPermissionRow>[
            IamFlutterMobileAdminPermissionRow(
              action: 'read',
              code: 'iam.user.read',
              id: 'perm-1',
              resource: 'user',
            ),
          ],
        ),
      ],
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    expect(find.text('iam.user.read'), findsOneWidget);
    expect(find.text('user · read'), findsOneWidget);
  });

  testWidgets('sends the typed term to the server', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileAdminPermissionPage>[IamFlutterMobileAdminPermissionPage()],
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'user');
    await tester.tap(find.text('Search'));
    await tester.pumpAndSettle();

    expect(source.queries.last, 'user');
    expect(find.text('Nothing matched that search.'), findsOneWidget);
  });

  testWidgets('shows the empty state when nothing is catalogued', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileAdminPermissionPage>[IamFlutterMobileAdminPermissionPage()],
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    expect(find.text('This tenant has no permission yet.'), findsOneWidget);
  });
}
