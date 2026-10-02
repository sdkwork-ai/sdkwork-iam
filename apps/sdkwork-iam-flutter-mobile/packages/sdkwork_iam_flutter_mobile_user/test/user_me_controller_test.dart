// Authored contract test of the "Me" page controller: loading/ready/error
// transitions, sign-out clearing, menu overrides, and timeout bounds — the
// Dart parity of the `@sdkwork/iam-user-center-core` controller suite.
import 'dart:async';

import 'package:sdkwork_iam_flutter_mobile_user/sdkwork_iam_flutter_mobile_user.dart';
import 'package:test/test.dart';

void main() {
  final Map<String, dynamic> profilePayload = <String, dynamic>{
    'id': 'user-1',
    'displayName': 'Alice',
    'email': 'alice@example.com',
    'username': 'alice',
    'avatar': <String, dynamic>{'publicUrl': 'https://cdn.example.com/a.png'},
  };
  final Map<String, dynamic> sessionPayload = <String, dynamic>{
    'context': <String, dynamic>{
      'userId': 'user-1',
      'tenantId': 'tenant-1',
      'organizationId': 'org-1',
      'authLevel': 'standard',
    },
  };

  test('loads profile, context and default menu into ready', () async {
    final IamFlutterMobileUserMeController controller = IamFlutterMobileUserMeController(
      retrieveProfile: () async => profilePayload,
      retrieveSession: () async => sessionPayload,
      signOut: () async {},
    );

    await controller.refresh();

    expect(controller.state.status, IamFlutterMobileUserMeStatus.ready);
    expect(controller.state.profile?.displayName, 'Alice');
    expect(controller.state.profile?.avatarUrl, 'https://cdn.example.com/a.png');
    expect(controller.state.contextSummary?.tenantId, 'tenant-1');
    expect(
      controller.state.menu.map((IamFlutterMobileUserMeMenuSection s) => s.id),
      <String>['account', 'bindings'],
    );
    final IamFlutterMobileUserMeMenuItem email = controller.state.menu
        .firstWhere((IamFlutterMobileUserMeMenuSection s) => s.id == 'bindings')
        .items
        .firstWhere((IamFlutterMobileUserMeMenuItem i) => i.id == 'email-bindings');
    expect(email.value, 'alice@example.com');
    await controller.dispose();
  });

  test('notifies listeners on transitions and reports errors', () async {
    final IamFlutterMobileUserMeController controller = IamFlutterMobileUserMeController(
      retrieveProfile: () async => throw StateError('network down'),
      retrieveSession: () async => null,
      signOut: () async {},
    );
    final List<IamFlutterMobileUserMeStatus> statuses = <IamFlutterMobileUserMeStatus>[];
    final void Function() unsubscribe = controller.addListener(
      (IamFlutterMobileUserMeState state) => statuses.add(state.status),
    );

    await controller.refresh();
    unsubscribe();
    await controller.refresh();

    // Listeners are invoked synchronously, so both transitions of the first
    // refresh are observed; after unsubscribing nothing further arrives.
    expect(statuses, <IamFlutterMobileUserMeStatus>[
      IamFlutterMobileUserMeStatus.loading,
      IamFlutterMobileUserMeStatus.error,
    ]);
    await controller.dispose();
  });

  test('sign out clears sensitive state and reports signedOut', () async {
    var signOutCalls = 0;
    final IamFlutterMobileUserMeController controller = IamFlutterMobileUserMeController(
      retrieveProfile: () async => profilePayload,
      retrieveSession: () async => sessionPayload,
      signOut: () async => signOutCalls += 1,
    );
    await controller.refresh();

    await controller.performSignOut();

    expect(signOutCalls, 1);
    expect(controller.state.signedOut, isTrue);
    expect(controller.state.signingOut, isFalse);
    expect(controller.state.profile, isNull);
    expect(controller.state.contextSummary, isNull);
    await controller.dispose();
  });

  test('surfaces sign-out failures and stays usable', () async {
    final IamFlutterMobileUserMeController controller = IamFlutterMobileUserMeController(
      retrieveProfile: () async => profilePayload,
      retrieveSession: () async => sessionPayload,
      signOut: () async => throw StateError('sign-out rejected'),
    );
    await controller.refresh();

    await expectLater(controller.performSignOut(), throwsStateError);
    expect(controller.state.signingOut, isFalse);
    expect(controller.state.lastError, contains('sign-out rejected'));
    expect(controller.state.profile, isNotNull);
    await controller.dispose();
  });

  test('supports host menu overrides and timeouts', () async {
    final IamFlutterMobileUserMeController controller = IamFlutterMobileUserMeController(
      retrieveProfile: () => Completer<Map<String, dynamic>>().future,
      retrieveSession: () async => null,
      signOut: () async {},
      requestTimeout: const Duration(milliseconds: 20),
      menuSections: (IamFlutterMobileUserMeProfile? profile) => <IamFlutterMobileUserMeMenuSection>[
        const IamFlutterMobileUserMeMenuSection(
          id: 'custom',
          items: <IamFlutterMobileUserMeMenuItem>[
            IamFlutterMobileUserMeMenuItem(
              id: 'wallet',
              intent: IamFlutterMobileUserMeMenuIntent.screen('profile'),
              messageKey: 'app.me.wallet',
              label: 'Wallet',
            ),
          ],
        ),
      ],
    );

    controller.setMenuSections(
      (IamFlutterMobileUserMeProfile? profile) => const <IamFlutterMobileUserMeMenuSection>[
        IamFlutterMobileUserMeMenuSection(
          id: 'replacement',
          items: <IamFlutterMobileUserMeMenuItem>[],
        ),
      ],
    );
    expect(controller.state.menu.single.id, 'replacement');

    await controller.refresh();
    expect(controller.state.status, IamFlutterMobileUserMeStatus.error);
    expect(controller.state.lastError, contains('timed out'));
    await controller.dispose();
  });
}
