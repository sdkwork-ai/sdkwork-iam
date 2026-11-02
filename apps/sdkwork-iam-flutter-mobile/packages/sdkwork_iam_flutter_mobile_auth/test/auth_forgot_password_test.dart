// SDKWORK-IAM-FLUTTER-AUTH: authored tests.
/**
 * Behaviour of the password reset screen.
 *
 * Two steps share one screen, so the cases pin the order: a code request must not
 * submit the reset, and a reset must not be attempted until the code exists.
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_auth/sdkwork_iam_flutter_mobile_auth.dart';

const Map<String, String> _messages = <String, String>{
  'accountLabel': 'Phone or email',
  'accountRequired': 'Enter the account that needs a reset.',
  'codeLabel': 'Verification code',
  'codeRequired': 'Enter the verification code.',
  'codeSent': 'Code sent.',
  'confirmMismatch': 'The confirmation does not match.',
  'confirmPasswordLabel': 'Repeat new password',
  'forgotSubtitle': 'Get a code, then choose a new password.',
  'forgotTitle': 'Reset password',
  'newPasswordLabel': 'New password',
  'newPasswordTooShort': 'The new password must be at least 8 characters.',
  'passwordReset': 'Password updated. You can sign in now.',
  'sendCodeAction': 'Send code',
  'submitAction': 'Set new password',
};

class _FakeDataSource implements IamFlutterMobileAuthDataSource {
  _FakeDataSource({this.codeError, this.resetError});

  final Object? codeError;
  final Object? resetError;
  final List<String> codeRequests = <String>[];
  final List<IamFlutterMobileAuthResetDraft> resets = <IamFlutterMobileAuthResetDraft>[];

  @override
  IamFlutterMobileAuthSession? get currentSession => null;

  @override
  Future<void> requestPasswordResetCode(String account) async {
    if (codeError != null) throw codeError!;
    codeRequests.add(account);
  }

  @override
  Future<void> resetPassword(IamFlutterMobileAuthResetDraft draft) async {
    if (resetError != null) throw resetError!;
    resets.add(draft);
  }

  @override
  Future<IamFlutterMobileAuthSession> signInWithPassword({
    required String password,
    required String username,
  }) async {
    return const IamFlutterMobileAuthSession(accessToken: 'token');
  }

  @override
  Future<void> signOut() async {}
}

IamFlutterMobileAuthController _controller(_FakeDataSource source) {
  return IamFlutterMobileAuthController(
    service: IamFlutterMobileAuthService(dataSource: source),
  );
}

Widget _screen(_FakeDataSource source) {
  return MaterialApp(
    home: IamFlutterMobileAuthForgotPasswordScreen(
      controller: _controller(source),
      messages: _messages,
    ),
  );
}

void main() {
  testWidgets('sends the code and says so', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource();
    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextField, 'Phone or email'), 'ada@example.com');
    await tester.tap(find.text('Send code'));
    await tester.pumpAndSettle();

    expect(source.codeRequests, <String>['ada@example.com']);
    expect(find.text('Code sent.'), findsOneWidget);
    expect(source.resets, isEmpty);
  });

  testWidgets('blocks a reset without a code', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource();
    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextField, 'Phone or email'), 'ada@example.com');
    await tester.enterText(find.widgetWithText(TextField, 'New password'), 'new-secret');
    await tester.enterText(find.widgetWithText(TextField, 'Repeat new password'), 'new-secret');
    await tester.tap(find.text('Set new password'));
    await tester.pumpAndSettle();

    expect(find.text('Enter the verification code.'), findsOneWidget);
    expect(source.resets, isEmpty);
  });

  testWidgets('blocks a mismatched confirmation', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource();
    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextField, 'Phone or email'), 'ada@example.com');
    await tester.enterText(find.widgetWithText(TextField, 'Verification code'), '123456');
    await tester.enterText(find.widgetWithText(TextField, 'New password'), 'new-secret');
    await tester.enterText(find.widgetWithText(TextField, 'Repeat new password'), 'other-secret');
    await tester.tap(find.text('Set new password'));
    await tester.pumpAndSettle();

    expect(find.text('The confirmation does not match.'), findsOneWidget);
    expect(source.resets, isEmpty);
  });

  testWidgets('submits a valid reset and clears the secrets', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource();
    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextField, 'Phone or email'), 'ada@example.com');
    await tester.enterText(find.widgetWithText(TextField, 'Verification code'), '123456');
    await tester.enterText(find.widgetWithText(TextField, 'New password'), 'new-secret');
    await tester.enterText(find.widgetWithText(TextField, 'Repeat new password'), 'new-secret');
    await tester.tap(find.text('Set new password'));
    await tester.pumpAndSettle();

    expect(source.resets, hasLength(1));
    expect(source.resets.single.code, '123456');
    expect(find.text('Password updated. You can sign in now.'), findsWidgets);
    // The code and both passwords are single-use secrets.
    expect(find.widgetWithText(TextField, '123456'), findsNothing);
    expect(find.widgetWithText(TextField, 'new-secret'), findsNothing);
  });

  testWidgets('a rejected reset keeps the failure on screen', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      resetError: StateError('The code expired.'),
    );
    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextField, 'Phone or email'), 'ada@example.com');
    await tester.enterText(find.widgetWithText(TextField, 'Verification code'), '000000');
    await tester.enterText(find.widgetWithText(TextField, 'New password'), 'new-secret');
    await tester.enterText(find.widgetWithText(TextField, 'Repeat new password'), 'new-secret');
    await tester.tap(find.text('Set new password'));
    await tester.pumpAndSettle();

    expect(find.text('The code expired.'), findsOneWidget);
  });
}
