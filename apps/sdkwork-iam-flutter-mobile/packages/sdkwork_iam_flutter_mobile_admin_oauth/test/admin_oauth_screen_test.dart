// SDKWORK-IAM-FLUTTER-ADMIN-OAUTH: authored tests.
/**
 * Rendering contract of the admin provider catalog.
 *
 * The catalog exists so an operator can answer "is GitHub sign-in on for this deployment?".
 * The cases pin that the answer is always a word: enabled, disabled, or explicitly
 * unreported — never a missing badge that could mean either.
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_oauth/sdkwork_iam_flutter_mobile_admin_oauth.dart';

const Map<String, String> _messages = <String, String>{
  'empty': 'No provider is configured yet.',
  'emptySearch': 'Nothing matched that search.',
  'loadError': 'Unable to load this view.',
  'loadMore': 'Load more',
  'retry': 'Retry',
  'searchAction': 'Search',
  'searchPlaceholder': 'Search providers',
  'stateDisabled': 'Disabled',
  'stateEnabled': 'Enabled',
  'stateUnknown': 'State not reported',
  'subtitle': 'What this deployment can offer at sign-in, over the backend-api.',
  'title': 'Sign-in providers',
};

class _FakeDataSource implements IamFlutterMobileAdminOAuthDataSource {
  _FakeDataSource({this.pages = const <IamFlutterMobileAdminOAuthProviderPage>[]});

  final List<IamFlutterMobileAdminOAuthProviderPage> pages;
  final List<String?> queries = <String?>[];

  @override
  Future<IamFlutterMobileAdminOAuthProviderPage> fetchProvidersPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    queries.add(q);
    if (page < pages.length) return pages[page];
    return const IamFlutterMobileAdminOAuthProviderPage();
  }
}

IamFlutterMobileAdminOAuthController _controller(_FakeDataSource source) {
  return IamFlutterMobileAdminOAuthController(
    service: IamFlutterMobileAdminOAuthService(dataSource: source),
  );
}

Widget _screen(_FakeDataSource source) {
  return MaterialApp(
    home: IamFlutterMobileAdminOAuthScreen(
      controller: _controller(source),
      messages: _messages,
    ),
  );
}

void main() {
  testWidgets('states each provider as enabled, disabled or unreported',
      (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileAdminOAuthProviderPage>[
        IamFlutterMobileAdminOAuthProviderPage(
          items: <IamFlutterMobileAdminOAuthProviderRow>[
            IamFlutterMobileAdminOAuthProviderRow(
              displayName: 'GitHub',
              enabled: true,
              providerKey: 'github',
            ),
            IamFlutterMobileAdminOAuthProviderRow(
              displayName: 'Google',
              enabled: false,
              providerKey: 'google',
            ),
            IamFlutterMobileAdminOAuthProviderRow(displayName: 'GitLab', providerKey: 'gitlab'),
          ],
        ),
      ],
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    expect(find.text('GitHub · Enabled'), findsOneWidget);
    expect(find.text('Google · Disabled'), findsOneWidget);
    // The unreported case must read as its own word, not as "disabled".
    expect(find.text('GitLab · State not reported'), findsOneWidget);
  });

  testWidgets('sends the typed term to the server', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileAdminOAuthProviderPage>[
        IamFlutterMobileAdminOAuthProviderPage(),
      ],
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'github');
    await tester.tap(find.text('Search'));
    await tester.pumpAndSettle();

    expect(source.queries.last, 'github');
  });

  testWidgets('shows the empty state', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileAdminOAuthProviderPage>[
        IamFlutterMobileAdminOAuthProviderPage(),
      ],
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    expect(find.text('No provider is configured yet.'), findsOneWidget);
  });
}
