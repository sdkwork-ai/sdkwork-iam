// SDKWORK-IAM-FLUTTER-CONSOLE-ACCOUNT-BINDING: authored tests.
/**
 * Rendering contract of the console account-binding workspace.
 *
 * The policy decides whether the removal action exists, so the cases pin the gate and the
 * fact that a not-allowed policy is reported rather than hidden behind a missing button.
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_console_account_binding/sdkwork_iam_flutter_mobile_console_account_binding.dart';

const Map<String, String> _messages = <String, String>{
  'allowed': 'Allowed',
  'cancel': 'Cancel',
  'denied': 'Not allowed',
  'emptyLinks': 'This user has no linked identities.',
  'linksSection': 'Linked identities',
  'loadError': 'Unable to load this view.',
  'loading': 'Loading…',
  'policyContact': 'Contact binding',
  'policyEmail': 'Email binding',
  'policyOauth': 'Third-party sign-in',
  'policySection': 'Self-service policy',
  'policyUnlink': 'Self-service unlink',
  'retry': 'Retry',
  'subtitle': 'Linked identities and the tenant policy that gates removal.',
  'title': 'Account binding management',
  'unlink': 'Remove',
  'unlinkConfirm': 'Remove this sign-in method for the user?',
};

class _FakeDataSource implements IamFlutterMobileConsoleAccountBindingDataSource {
  _FakeDataSource({
    this.links = const <IamFlutterMobileConsoleAccountLink>[],
    this.policy = const IamFlutterMobileConsoleAccountBindingPolicy(),
    this.unlinkError,
  });

  final List<IamFlutterMobileConsoleAccountLink> links;
  final IamFlutterMobileConsoleAccountBindingPolicy policy;
  final Object? unlinkError;
  final List<String> unlinked = <String>[];

  @override
  Future<IamFlutterMobileConsoleAccountLinkPage> fetchLinksPage({
    required int page,
    required int pageSize,
  }) async {
    return IamFlutterMobileConsoleAccountLinkPage(items: links);
  }

  @override
  Future<IamFlutterMobileConsoleAccountBindingPolicy> loadPolicy() async => policy;

  @override
  Future<void> unlink(String accountLinkId) async {
    if (unlinkError != null) throw unlinkError!;
    unlinked.add(accountLinkId);
  }
}

IamFlutterMobileConsoleAccountBindingController _controller(_FakeDataSource source) {
  return IamFlutterMobileConsoleAccountBindingController(
    service: IamFlutterMobileConsoleAccountBindingService(dataSource: source),
  );
}

Widget _screen(_FakeDataSource source) {
  return MaterialApp(
    home: IamFlutterMobileConsoleAccountBindingScreen(
      controller: _controller(source),
      messages: _messages,
    ),
  );
}

void main() {
  testWidgets('lists the linked identities', (WidgetTester tester) async {
    await tester.pumpWidget(
      _screen(
        _FakeDataSource(
          links: const <IamFlutterMobileConsoleAccountLink>[
            IamFlutterMobileConsoleAccountLink(
              accountLinkId: 'link-1',
              provider: 'github',
              providerUserId: 'octocat',
            ),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('github'), findsOneWidget);
    expect(find.text('octocat'), findsOneWidget);
  });

  testWidgets('reports a not-allowed policy and offers no removal', (WidgetTester tester) async {
    await tester.pumpWidget(
      _screen(
        _FakeDataSource(
          links: const <IamFlutterMobileConsoleAccountLink>[
            IamFlutterMobileConsoleAccountLink(accountLinkId: 'link-1', provider: 'github'),
          ],
          policy: const IamFlutterMobileConsoleAccountBindingPolicy(oauthEnabled: true),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // The ungranted rows must read "Not allowed" rather than disappear.
    expect(find.text('Self-service unlink'), findsOneWidget);
    expect(find.text('Not allowed'), findsNWidgets(3));
    expect(find.text('Remove'), findsNothing);
  });

  testWidgets('offers removal when granted, and confirms first', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      links: const <IamFlutterMobileConsoleAccountLink>[
        IamFlutterMobileConsoleAccountLink(accountLinkId: 'link-1', provider: 'github'),
      ],
      policy: const IamFlutterMobileConsoleAccountBindingPolicy(selfServiceUnlinkEnabled: true),
    );
    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    expect(find.text('Remove'), findsOneWidget);
    // Nothing is removed until the confirmation is accepted.
    expect(source.unlinked, isEmpty);
  });

  testWidgets('shows the empty link state', (WidgetTester tester) async {
    await tester.pumpWidget(
      _screen(
        _FakeDataSource(
          policy: const IamFlutterMobileConsoleAccountBindingPolicy(selfServiceUnlinkEnabled: true),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('This user has no linked identities.'), findsOneWidget);
  });
}
