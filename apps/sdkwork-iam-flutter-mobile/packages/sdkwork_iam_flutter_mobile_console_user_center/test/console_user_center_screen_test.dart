// SDKWORK-IAM-FLUTTER-CONSOLE-USER-CENTER: authored tests.
/**
 * Rendering contract of the console user-center profile.
 *
 * The console pairs the caller's record with the tenant verification policy, so the cases
 * pin both halves and the tolerance that matters: a deployment with no published policy
 * still shows the account.
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_console_user_center/sdkwork_iam_flutter_mobile_console_user_center.dart';

const Map<String, String> _messages = <String, String>{
  'accountSection': 'Account',
  'displayName': 'Display name',
  'email': 'Email',
  'loadError': 'Unable to load this view.',
  'loading': 'Loading…',
  'notReported': 'Not reported',
  'optional': 'Optional',
  'phone': 'Phone',
  'required': 'Required',
  'retry': 'Retry',
  'subtitle': "The signed-in user's own record, as the console sees it.",
  'title': 'User center',
  'userId': 'User',
  'verificationContact': 'Contact verification',
  'verificationEmail': 'Email verification',
  'verificationOauth': 'Third-party sign-in',
  'verificationSection': 'Verification policy',
};

class _FakeDataSource implements IamFlutterMobileConsoleUserCenterDataSource {
  _FakeDataSource({
    this.account = const IamFlutterMobileConsoleUserAccount(
      displayName: 'Ada',
      email: 'ada@example.com',
      userId: 'user-1',
    ),
    this.policy = const IamFlutterMobileConsoleUserVerificationPolicy(),
  });

  final IamFlutterMobileConsoleUserAccount account;
  final IamFlutterMobileConsoleUserVerificationPolicy policy;

  @override
  Future<IamFlutterMobileConsoleUserAccount> loadAccount() async => account;

  @override
  Future<IamFlutterMobileConsoleUserVerificationPolicy> loadVerificationPolicy() async => policy;
}

IamFlutterMobileConsoleUserCenterController _controller(_FakeDataSource source) {
  return IamFlutterMobileConsoleUserCenterController(
    service: IamFlutterMobileConsoleUserCenterService(dataSource: source),
  );
}

Widget _screen(_FakeDataSource source) {
  return MaterialApp(
    home: IamFlutterMobileConsoleUserCenterScreen(
      controller: _controller(source),
      messages: _messages,
    ),
  );
}

void main() {
  testWidgets("shows the caller's record", (WidgetTester tester) async {
    await tester.pumpWidget(_screen(_FakeDataSource()));
    await tester.pumpAndSettle();

    expect(find.text('user-1'), findsOneWidget);
    expect(find.text('Ada'), findsOneWidget);
    expect(find.text('ada@example.com'), findsOneWidget);
  });

  testWidgets('reports every verification row, not only the required ones',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      _screen(
        _FakeDataSource(
          policy: const IamFlutterMobileConsoleUserVerificationPolicy(emailRequired: true),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // One required, the rest optional: the rows must read "Optional" rather than be
    // omitted, or an operator cannot tell a policy gap from an unasked question.
    expect(find.text('Required'), findsOneWidget);
    expect(find.text('Optional'), findsNWidgets(2));
  });

  testWidgets('renders the account even when nothing is required', (WidgetTester tester) async {
    await tester.pumpWidget(_screen(_FakeDataSource()));
    await tester.pumpAndSettle();

    expect(find.text('user-1'), findsOneWidget);
    expect(find.text('Optional'), findsNWidgets(3));
  });
}
