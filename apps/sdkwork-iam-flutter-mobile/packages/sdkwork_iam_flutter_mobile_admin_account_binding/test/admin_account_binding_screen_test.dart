// SDKWORK-IAM-FLUTTER-ADMIN-ACCOUNT-BINDING: authored tests.
/**
 * Rendering contract of the tenant-wide account-binding list.
 *
 * The list exists to answer "which account is this provider login attached to?", so the cases
 * pin that both halves of that answer sit on the row, and that a link missing the provider
 * identity still shows the local user rather than disappearing.
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_account_binding/sdkwork_iam_flutter_mobile_admin_account_binding.dart';

const Map<String, String> _messages = <String, String>{
  'empty': 'No user has linked an identity yet.',
  'emptySearch': 'Nothing matched that search.',
  'loadError': 'Unable to load this view.',
  'loadMore': 'Load more',
  'retry': 'Retry',
  'searchAction': 'Search',
  'searchPlaceholder': 'Search by provider or user',
  'subtitle': 'Every third-party identity linked by a user in this tenant.',
  'title': 'Account bindings',
};

class _FakeDataSource implements IamFlutterMobileAdminAccountBindingDataSource {
  _FakeDataSource({this.pages = const <IamFlutterMobileAdminAccountLinkPage>[]});

  final List<IamFlutterMobileAdminAccountLinkPage> pages;
  final List<String?> queries = <String?>[];

  @override
  Future<IamFlutterMobileAdminAccountLinkPage> fetchLinksPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    queries.add(q);
    if (page < pages.length) return pages[page];
    return const IamFlutterMobileAdminAccountLinkPage();
  }
}

IamFlutterMobileAdminAccountBindingController _controller(_FakeDataSource source) {
  return IamFlutterMobileAdminAccountBindingController(
    service: IamFlutterMobileAdminAccountBindingService(dataSource: source),
  );
}

Widget _screen(_FakeDataSource source) {
  return MaterialApp(
    home: IamFlutterMobileAdminAccountBindingScreen(
      controller: _controller(source),
      messages: _messages,
    ),
  );
}

void main() {
  testWidgets('puts the provider identity and the local user on the row',
      (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileAdminAccountLinkPage>[
        IamFlutterMobileAdminAccountLinkPage(
          items: <IamFlutterMobileAdminAccountLinkRow>[
            IamFlutterMobileAdminAccountLinkRow(
              accountLinkId: 'link-1',
              provider: 'github',
              providerUserId: 'octocat',
              userId: 'user-1',
            ),
          ],
        ),
      ],
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    expect(find.text('github · octocat'), findsOneWidget);
    expect(find.text('user-1'), findsOneWidget);
  });

  testWidgets('a link without a provider identity still shows the user', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileAdminAccountLinkPage>[
        IamFlutterMobileAdminAccountLinkPage(
          items: <IamFlutterMobileAdminAccountLinkRow>[
            IamFlutterMobileAdminAccountLinkRow(accountLinkId: 'link-2', userId: 'user-2'),
          ],
        ),
      ],
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    // Dropping the row would hide a binding that exists, on the one screen that lists them.
    expect(find.text('user-2'), findsOneWidget);
    expect(find.text('link-2'), findsWidgets);
  });

  testWidgets('sends the typed term to the server', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileAdminAccountLinkPage>[IamFlutterMobileAdminAccountLinkPage()],
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'octocat');
    await tester.tap(find.text('Search'));
    await tester.pumpAndSettle();

    expect(source.queries.last, 'octocat');
    expect(find.text('Nothing matched that search.'), findsOneWidget);
  });
}
