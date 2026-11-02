// SDKWORK-IAM-FLUTTER-ADMIN-ACCOUNT-BINDING: authored tests.
/**
 * Rendering contract of the admin account-binding workspace.
 *
 * Two things can go wrong here that the matrix would not catch: a policy the server never
 * reported rendered as "everything off", and a toggle written to the server without the
 * operator asking. The cases pin both, plus the row content the list exists for.
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_account_binding/sdkwork_iam_flutter_mobile_admin_account_binding.dart';

const Map<String, String> _messages = <String, String>{
  'empty': 'No user has linked an identity yet.',
  'emptySearch': 'Nothing matched that search.',
  'loadError': 'Unable to load this view.',
  'loadMore': 'Load more',
  'policyContact': 'Contact binding',
  'policyEmail': 'Email binding',
  'policyNotLoaded': 'The tenant policy is not loaded yet.',
  'policyOauth': 'Third-party sign-in',
  'policySaved': 'Policy saved.',
  'policySection': 'Self-service policy',
  'policyUnlink': 'Self-service unlink',
  'savePolicy': 'Save policy',
  'retry': 'Retry',
  'searchAction': 'Search',
  'searchPlaceholder': 'Search by provider or user',
  'subtitle': 'Every third-party identity linked by a user in this tenant.',
  'title': 'Account bindings',
};

class _FakeDataSource implements IamFlutterMobileAdminAccountBindingDataSource {
  _FakeDataSource({
    this.pages = const <IamFlutterMobileAdminAccountLinkPage>[],
    this.policy = const IamFlutterMobileAdminAccountBindingPolicy(),
  });

  final List<IamFlutterMobileAdminAccountLinkPage> pages;
  final List<String?> queries = <String?>[];
  final IamFlutterMobileAdminAccountBindingPolicy policy;
  final List<IamFlutterMobileAdminAccountBindingPolicy> saved =
      <IamFlutterMobileAdminAccountBindingPolicy>[];

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

  @override
  Future<IamFlutterMobileAdminAccountBindingPolicy> loadPolicy() async => policy;

  @override
  Future<void> savePolicy(IamFlutterMobileAdminAccountBindingPolicy next) async {
    saved.add(next);
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

  testWidgets('renders the saved policy in its toggles', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileAdminAccountLinkPage>[IamFlutterMobileAdminAccountLinkPage()],
      policy: const IamFlutterMobileAdminAccountBindingPolicy(
        emailEnabled: true,
        oauthEnabled: true,
      ),
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    final List<SwitchListTile> toggles =
        tester.widgetList<SwitchListTile>(find.byType(SwitchListTile)).toList();
    expect(toggles, hasLength(4));
    expect(toggles.where((SwitchListTile tile) => tile.value).length, 2);
    // Nothing is written until the operator saves.
    expect(source.saved, isEmpty);
  });

  testWidgets('a policy write happens only after the save action', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileAdminAccountLinkPage>[IamFlutterMobileAdminAccountLinkPage()],
      policy: const IamFlutterMobileAdminAccountBindingPolicy(emailEnabled: true),
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(Switch).first);
    await tester.pumpAndSettle();
    expect(source.saved, isEmpty);

    await tester.tap(find.text('Save policy'));
    await tester.pumpAndSettle();

    expect(source.saved, hasLength(1));
    expect(source.saved.single.contactEnabled, isTrue);
    expect(source.saved.single.emailEnabled, isTrue);
    expect(find.text('Policy saved.'), findsOneWidget);
  });
}
