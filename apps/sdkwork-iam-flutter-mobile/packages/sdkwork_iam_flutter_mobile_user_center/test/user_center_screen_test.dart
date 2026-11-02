// SDKWORK-IAM-FLUTTER-USER-CENTER: authored tests.
/**
 * Behaviour of the user-center screens.
 *
 * The password rules are the interesting part: they must block a submit before the
 * request, and a successful change must leave the fields empty so the current
 * password is not sitting on a screen the user walks away from.
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_user_center/sdkwork_iam_flutter_mobile_user_center.dart';

const Map<String, String> _messages = <String, String>{
  'changePasswordAction': 'Update password',
  'confirmMismatch': 'The confirmation does not match.',
  'confirmPasswordLabel': 'Repeat new password',
  'displayNameLabel': 'Display name',
  'emailLabel': 'Email',
  'loadError': 'Unable to load this view.',
  'loading': 'Loading…',
  'newPasswordLabel': 'New password',
  'newPasswordTooShort': 'The new password must be at least 8 characters.',
  'oldPasswordLabel': 'Current password',
  'oldPasswordRequired': 'Enter your current password.',
  'passwordChanged': 'Password updated.',
  'passwordSubtitle': 'Use at least 8 characters.',
  'passwordTitle': 'Change password',
  'phoneLabel': 'Phone',
  'profileSaved': 'Profile saved.',
  'retry': 'Retry',
  'saveAction': 'Save',
  'subtitle': 'Your own account details.',
  'title': 'My profile',
};

class _FakeDataSource implements IamFlutterMobileUserCenterDataSource {
  _FakeDataSource({this.passwordError});

  final Object? passwordError;
  final IamFlutterMobileUserProfile profile = const IamFlutterMobileUserProfile(
    displayName: 'Ada',
    email: 'ada@example.com',
    phone: '13800138000',
    userId: 'user-1',
  );
  final List<IamFlutterMobileUserProfileDraft> saved = <IamFlutterMobileUserProfileDraft>[];
  final List<IamFlutterMobileUserPasswordDraft> passwordDrafts =
      <IamFlutterMobileUserPasswordDraft>[];

  @override
  Future<void> changePassword(IamFlutterMobileUserPasswordDraft draft) async {
    if (passwordError != null) throw passwordError!;
    passwordDrafts.add(draft);
  }

  @override
  Future<IamFlutterMobileUserProfile> loadProfile() async => profile;

  @override
  Future<IamFlutterMobileUserProfile> updateProfile(IamFlutterMobileUserProfileDraft draft) async {
    saved.add(draft);
    return IamFlutterMobileUserProfile(
      displayName: draft.displayName,
      email: draft.email,
      phone: draft.phone,
      userId: profile.userId,
    );
  }
}

IamFlutterMobileUserCenterController _controller(_FakeDataSource source) {
  return IamFlutterMobileUserCenterController(
    service: IamFlutterMobileUserCenterService(dataSource: source),
  );
}

Widget _profile(_FakeDataSource source) {
  return MaterialApp(
    home: IamFlutterMobileUserCenterScreen(
      controller: _controller(source),
      messages: _messages,
    ),
  );
}

Widget _password(IamFlutterMobileUserCenterController controller) {
  return MaterialApp(
    home: IamFlutterMobileUserCenterPasswordScreen(
      controller: controller,
      messages: _messages,
    ),
  );
}

void main() {
  testWidgets('seeds the profile form from the loaded record', (WidgetTester tester) async {
    await tester.pumpWidget(_profile(_FakeDataSource()));
    await tester.pumpAndSettle();

    expect(find.widgetWithText(TextField, 'Ada'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'ada@example.com'), findsOneWidget);
    expect(find.widgetWithText(TextField, '13800138000'), findsOneWidget);
  });

  testWidgets('saves what the user typed', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource();
    await tester.pumpWidget(_profile(source));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextField, 'Ada'), 'Ada Lovelace');
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();

    expect(source.saved, hasLength(1));
    expect(source.saved.single.displayName, 'Ada Lovelace');
    expect(find.text('Profile saved.'), findsOneWidget);
  });

  testWidgets('rejects a short new password without calling the data source',
      (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource();
    await tester.pumpWidget(_password(_controller(source)));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextField, 'Current password'), 'old-secret');
    await tester.enterText(find.widgetWithText(TextField, 'New password'), 'short');
    await tester.enterText(find.widgetWithText(TextField, 'Repeat new password'), 'short');
    await tester.tap(find.text('Update password'));
    await tester.pumpAndSettle();

    expect(find.text('The new password must be at least 8 characters.'), findsOneWidget);
    expect(source.passwordDrafts, isEmpty);
  });

  testWidgets('rejects a mismatched confirmation', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource();
    await tester.pumpWidget(_password(_controller(source)));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextField, 'Current password'), 'old-secret');
    await tester.enterText(find.widgetWithText(TextField, 'New password'), 'new-secret');
    await tester.enterText(find.widgetWithText(TextField, 'Repeat new password'), 'new-secret2');
    await tester.tap(find.text('Update password'));
    await tester.pumpAndSettle();

    expect(find.text('The confirmation does not match.'), findsOneWidget);
    expect(source.passwordDrafts, isEmpty);
  });

  testWidgets('changes the password and clears the fields', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource();
    await tester.pumpWidget(_password(_controller(source)));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextField, 'Current password'), 'old-secret');
    await tester.enterText(find.widgetWithText(TextField, 'New password'), 'new-secret');
    await tester.enterText(find.widgetWithText(TextField, 'Repeat new password'), 'new-secret');
    await tester.tap(find.text('Update password'));
    await tester.pumpAndSettle();

    expect(source.passwordDrafts, hasLength(1));
    expect(source.passwordDrafts.single.newPassword, 'new-secret');
    expect(find.text('Password updated.'), findsOneWidget);
    // The current password must not stay in a field after the change.
    expect(find.widgetWithText(TextField, 'old-secret'), findsNothing);
  });

  testWidgets('a rejected change keeps the failure on screen', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      passwordError: StateError('The current password is wrong.'),
    );
    await tester.pumpWidget(_password(_controller(source)));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextField, 'Current password'), 'wrong');
    await tester.enterText(find.widgetWithText(TextField, 'New password'), 'new-secret');
    await tester.enterText(find.widgetWithText(TextField, 'Repeat new password'), 'new-secret');
    await tester.tap(find.text('Update password'));
    await tester.pumpAndSettle();

    expect(find.text('The current password is wrong.'), findsOneWidget);
  });
}
