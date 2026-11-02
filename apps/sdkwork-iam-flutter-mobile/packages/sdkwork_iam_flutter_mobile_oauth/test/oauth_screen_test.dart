// SDKWORK-IAM-FLUTTER-OAUTH: authored tests.
/**
 * Behaviour of the provider screen.
 *
 * The screen never opens a URL itself: these cases pin the hand-off, and the
 * "no opener" case pins that the screen says so instead of doing nothing.
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_oauth/sdkwork_iam_flutter_mobile_oauth.dart';

const Map<String, String> _messages = <String, String>{
  'authorizeUnavailable': 'This build cannot open a browser.',
  'connectAction': 'Connect',
  'empty': 'No provider is available.',
  'loadError': 'Unable to load this view.',
  'loading': 'Loading…',
  'retry': 'Retry',
  'subtitle': 'Providers this tenant offers.',
  'title': 'Third-party sign-in',
};

class _FakeDataSource implements IamFlutterMobileOAuthDataSource {
  _FakeDataSource({this.providers = const <IamFlutterMobileOAuthProvider>[], this.urlError});

  final List<IamFlutterMobileOAuthProvider> providers;
  final Object? urlError;
  final List<String> requested = <String>[];

  @override
  Future<String> createAuthorizationUrl(String providerKey) async {
    if (urlError != null) throw urlError!;
    requested.add(providerKey);
    return 'https://idp.example.com/authorize?provider=$providerKey';
  }

  @override
  Future<List<IamFlutterMobileOAuthProvider>> loadProviders() async => providers;
}

IamFlutterMobileOauthController _controller(_FakeDataSource source) {
  return IamFlutterMobileOauthController(
    service: IamFlutterMobileOAuthService(dataSource: source),
  );
}

Widget _screen(
  _FakeDataSource source, {
  void Function(String url)? onAuthorize,
}) {
  return MaterialApp(
    home: IamFlutterMobileOauthScreen(
      controller: _controller(source),
      messages: _messages,
      onAuthorize: onAuthorize,
    ),
  );
}

void main() {
  testWidgets('lists the providers the tenant offers', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      providers: const <IamFlutterMobileOAuthProvider>[
        IamFlutterMobileOAuthProvider(displayName: 'GitHub', providerKey: 'github'),
        IamFlutterMobileOAuthProvider(providerKey: 'wechat'),
      ],
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    expect(find.text('GitHub'), findsOneWidget);
    // A provider without a display name still has to be identifiable.
    expect(find.text('wechat'), findsOneWidget);
    expect(find.text('Connect'), findsNWidgets(2));
  });

  testWidgets('hands the authorization URL to the host opener', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      providers: const <IamFlutterMobileOAuthProvider>[
        IamFlutterMobileOAuthProvider(displayName: 'GitHub', providerKey: 'github'),
      ],
    );
    final List<String> opened = <String>[];

    await tester.pumpWidget(_screen(source, onAuthorize: opened.add));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Connect'));
    await tester.pumpAndSettle();

    expect(source.requested, <String>['github']);
    expect(opened, <String>['https://idp.example.com/authorize?provider=github']);
  });

  testWidgets('says so when the host cannot open a browser', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      providers: const <IamFlutterMobileOAuthProvider>[
        IamFlutterMobileOAuthProvider(displayName: 'GitHub', providerKey: 'github'),
      ],
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Connect'));
    await tester.pumpAndSettle();

    expect(find.text('This build cannot open a browser.'), findsOneWidget);
  });

  testWidgets('a disabled provider is not offered', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      providers: const <IamFlutterMobileOAuthProvider>[
        IamFlutterMobileOAuthProvider(displayName: 'GitHub', providerKey: 'github'),
        IamFlutterMobileOAuthProvider(displayName: 'Legacy', enabled: false, providerKey: 'legacy'),
      ],
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    expect(find.text('GitHub'), findsOneWidget);
    expect(find.text('Legacy'), findsNothing);
  });

  testWidgets('reports a failed authorization and stays usable', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      providers: const <IamFlutterMobileOAuthProvider>[
        IamFlutterMobileOAuthProvider(displayName: 'GitHub', providerKey: 'github'),
      ],
      urlError: StateError('provider is not configured'),
    );

    await tester.pumpWidget(_screen(source, onAuthorize: (_) {}));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Connect'));
    await tester.pumpAndSettle();

    expect(find.text('provider is not configured'), findsOneWidget);
    // The row must remain actionable: the failure is the provider's, not the list's.
    expect(find.text('Connect'), findsOneWidget);
  });
}
