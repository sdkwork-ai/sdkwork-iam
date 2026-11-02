// SDKWORK-IAM-FLUTTER-ADMIN-PERMISSION: authored tests.
/**
 * Rendering contract of the role and policy catalogs.
 *
 * Both catalogs are authorization surfaces, so the cases pin what must never be misread: a
 * policy states its effect as a word, and an unreported effect reads as "not granted" rather
 * than looking like an allow.
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_permission/sdkwork_iam_flutter_mobile_admin_permission.dart';

const Map<String, String> _messages = <String, String>{
  'effectAllow': 'Allow',
  'effectDeny': 'Deny',
  'effectUnknown': 'Not granted',
  'empty': 'This tenant has no permission yet.',
  'emptySearch': 'Nothing matched that search.',
  'loadError': 'Unable to load this view.',
  'loadMore': 'Load more',
  'policiesEmpty': 'This tenant has no policy yet.',
  'policiesSearchPlaceholder': 'Search policies',
  'policiesSubtitle': 'Every grant and denial this tenant has configured.',
  'policiesTitle': 'Policies',
  'retry': 'Retry',
  'rolesEmpty': 'This tenant has no role yet.',
  'rolesSearchPlaceholder': 'Search roles',
  'rolesSubtitle': 'The roles this tenant can assign.',
  'rolesTitle': 'Roles',
  'searchAction': 'Search',
  'searchPlaceholder': 'Search permissions',
  'subtitle': "The tenant's permission catalog.",
  'title': 'Permissions',
};

IamFlutterMobileAdminPagedController<IamFlutterMobileAdminRoleRow> _rolesController(
  List<IamFlutterMobileAdminRoleRow> rows,
) {
  return IamFlutterMobileAdminPagedController<IamFlutterMobileAdminRoleRow>(
    fetch: ({required int page, required int pageSize, String? q}) async {
      return IamFlutterMobileAdminPagedPage<IamFlutterMobileAdminRoleRow>(items: rows);
    },
  );
}

IamFlutterMobileAdminPagedController<IamFlutterMobileAdminPolicyRow> _policiesController(
  List<IamFlutterMobileAdminPolicyRow> rows,
) {
  return IamFlutterMobileAdminPagedController<IamFlutterMobileAdminPolicyRow>(
    fetch: ({required int page, required int pageSize, String? q}) async {
      return IamFlutterMobileAdminPagedPage<IamFlutterMobileAdminPolicyRow>(items: rows);
    },
  );
}

void main() {
  testWidgets('a role row carries the name, the code and the scope', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: IamFlutterMobileAdminRolesScreen(
          controller: _rolesController(
            const <IamFlutterMobileAdminRoleRow>[
              IamFlutterMobileAdminRoleRow(
                code: 'tenant-admin',
                id: 'role-1',
                name: 'Admin',
                scope: 'tenant',
              ),
            ],
          ),
          messages: _messages,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Admin'), findsOneWidget);
    expect(find.text('tenant-admin · tenant'), findsOneWidget);
    expect(find.text('Roles'), findsWidgets);
  });

  testWidgets('a policy states its effect as a word', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: IamFlutterMobileAdminPoliciesScreen(
          controller: _policiesController(
            const <IamFlutterMobileAdminPolicyRow>[
              IamFlutterMobileAdminPolicyRow(
                action: 'delete',
                effect: 'deny',
                id: 'pol-1',
                resource: 'user',
                subject: 'role:editor',
              ),
            ],
          ),
          messages: _messages,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Deny · role:editor'), findsOneWidget);
    expect(find.text('user · delete'), findsOneWidget);
  });

  testWidgets('an unreported effect does not look like an allow', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: IamFlutterMobileAdminPoliciesScreen(
          controller: _policiesController(
            const <IamFlutterMobileAdminPolicyRow>[
              IamFlutterMobileAdminPolicyRow(id: 'pol-2', subject: 'role:viewer'),
            ],
          ),
          messages: _messages,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Not granted · role:viewer'), findsOneWidget);
  });

  testWidgets('each catalog shows its own empty state', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: IamFlutterMobileAdminRolesScreen(
          controller: _rolesController(const <IamFlutterMobileAdminRoleRow>[]),
          messages: _messages,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('This tenant has no role yet.'), findsOneWidget);
  });
}
