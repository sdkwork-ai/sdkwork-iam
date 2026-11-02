// SDKWORK-IAM-FLUTTER-ADMIN-AUDIT: authored tests.
/**
 * Rendering contract of the admin audit trail.
 *
 * The trail is the operator's only record of what happened, so the cases pin the two things
 * a ticket depends on: the action/actor pair leads the row, and an event with no identity is
 * dropped rather than shown as an untraceable line.
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_audit/sdkwork_iam_flutter_mobile_admin_audit.dart';

const Map<String, String> _messages = <String, String>{
  'empty': 'No audit event was recorded yet.',
  'emptySearch': 'Nothing matched that search.',
  'loadError': 'Unable to load this view.',
  'loadMore': 'Load more',
  'retry': 'Retry',
  'searchAction': 'Search',
  'searchPlaceholder': 'Search by actor or action',
  'subtitle': 'What happened in this tenant, newest first, over the backend-api.',
  'title': 'Audit events',
};

class _FakeDataSource implements IamFlutterMobileAdminAuditDataSource {
  _FakeDataSource({this.pages = const <IamFlutterMobileAdminAuditPage>[]});

  final List<IamFlutterMobileAdminAuditPage> pages;
  final List<String?> queries = <String?>[];

  @override
  Future<IamFlutterMobileAdminAuditPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    queries.add(q);
    if (page < pages.length) return pages[page];
    return const IamFlutterMobileAdminAuditPage();
  }
}

IamFlutterMobileAdminAuditController _controller(_FakeDataSource source) {
  return IamFlutterMobileAdminAuditController(
    service: IamFlutterMobileAdminAuditService(dataSource: source),
  );
}

Widget _screen(_FakeDataSource source) {
  return MaterialApp(
    home: IamFlutterMobileAdminAuditScreen(
      controller: _controller(source),
      messages: _messages,
    ),
  );
}

void main() {
  testWidgets('leads each row with the action and the actor', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileAdminAuditPage>[
        IamFlutterMobileAdminAuditPage(
          items: <IamFlutterMobileAdminAuditEvent>[
            IamFlutterMobileAdminAuditEvent(
              action: 'update',
              actor: 'user-1',
              id: 'evt-1',
              occurredAt: '2026-01-01T00:00:00Z',
              resource: 'role:tenant-admin',
            ),
          ],
        ),
      ],
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    expect(find.text('update · user-1'), findsOneWidget);
    // The resource and the time are what narrow a search to one change.
    expect(find.text('role:tenant-admin · 2026-01-01T00:00:00Z'), findsOneWidget);
  });

  testWidgets('sends the typed term to the server', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileAdminAuditPage>[IamFlutterMobileAdminAuditPage()],
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'user-1');
    await tester.tap(find.text('Search'));
    await tester.pumpAndSettle();

    expect(source.queries.last, 'user-1');
    expect(find.text('Nothing matched that search.'), findsOneWidget);
  });

  testWidgets('shows the empty state', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      pages: const <IamFlutterMobileAdminAuditPage>[IamFlutterMobileAdminAuditPage()],
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    expect(find.text('No audit event was recorded yet.'), findsOneWidget);
  });
}
