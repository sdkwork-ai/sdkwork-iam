// SDKWORK-IAM-FLUTTER-ADMIN-ORGANIZATION: authored tests.
/**
 * Rendering contract of the admin organization tree.
 *
 * The flattening rules are the substance here: depth must follow the parent links, an orphan
 * must still appear, and a malformed cyclic answer must not hang the screen. Each of those is
 * a property an operator would notice as "the tree is wrong".
 */

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_organization/sdkwork_iam_flutter_mobile_admin_organization.dart';

const Map<String, String> _messages = <String, String>{
  'empty': 'This tenant has no organization yet.',
  'loadError': 'Unable to load this view.',
  'retry': 'Retry',
  'subtitle': 'The whole hierarchy, indented by level, over the backend-api.',
  'title': 'Organization tree',
};

class _FakeDataSource implements IamFlutterMobileAdminOrganizationDataSource {
  _FakeDataSource({this.error, this.nodes = const <IamFlutterMobileAdminOrganizationNode>[]});

  final List<IamFlutterMobileAdminOrganizationNode> nodes;
  final Object? error;

  @override
  Future<List<IamFlutterMobileAdminOrganizationNode>> loadTree() async {
    if (error != null) throw error!;
    return nodes;
  }
}

IamFlutterMobileAdminOrganizationController _controller(_FakeDataSource source) {
  return IamFlutterMobileAdminOrganizationController(
    service: IamFlutterMobileAdminOrganizationService(dataSource: source),
  );
}

Widget _screen(_FakeDataSource source) {
  return MaterialApp(
    home: IamFlutterMobileAdminOrganizationScreen(
      controller: _controller(source),
      messages: _messages,
    ),
  );
}

void main() {
  testWidgets('orders the rows depth-first and indents children', (WidgetTester tester) async {
    final _FakeDataSource source = _FakeDataSource(
      nodes: const <IamFlutterMobileAdminOrganizationNode>[
        IamFlutterMobileAdminOrganizationNode(id: 'root', name: 'Acme'),
        IamFlutterMobileAdminOrganizationNode(id: 'child', name: 'Acme Labs', parentId: 'root'),
        IamFlutterMobileAdminOrganizationNode(
          id: 'grandchild',
          name: 'Acme Labs EU',
          parentId: 'child',
        ),
      ],
    );

    await tester.pumpWidget(_screen(source));
    await tester.pumpAndSettle();

    // A child renders after its parent, and the indent encodes the depth.
    final Offset root = tester.getTopLeft(find.text('Acme'));
    final Offset child = tester.getTopLeft(find.text('Acme Labs'));
    final Offset grandchild = tester.getTopLeft(find.text('Acme Labs EU'));
    expect(child.dy, greaterThan(root.dy));
    expect(grandchild.dy, greaterThan(child.dy));
    expect(child.dx, greaterThan(root.dx));
    expect(grandchild.dx, greaterThan(child.dx));
  });

  test('an orphan is shown at the root rather than dropped', () {
    final List<IamFlutterMobileAdminOrganizationEntry> rows =
        IamFlutterMobileAdminOrganizationService.flatten(
      const <IamFlutterMobileAdminOrganizationNode>[
        IamFlutterMobileAdminOrganizationNode(id: 'orphan', parentId: 'missing'),
      ],
    );

    // Losing it would report a tenant as emptier than it is.
    expect(rows, hasLength(1));
    expect(rows.single.depth, 0);
  });

  test('a parent cycle terminates and still lists every node', () {
    final List<IamFlutterMobileAdminOrganizationEntry> rows =
        IamFlutterMobileAdminOrganizationService.flatten(
      const <IamFlutterMobileAdminOrganizationNode>[
        IamFlutterMobileAdminOrganizationNode(id: 'a', parentId: 'b'),
        IamFlutterMobileAdminOrganizationNode(id: 'b', parentId: 'a'),
      ],
    );

    expect(rows.map((IamFlutterMobileAdminOrganizationEntry e) => e.node.id), <String>['a', 'b']);
  });

  testWidgets('a failed load reports it with a retry', (WidgetTester tester) async {
    await tester.pumpWidget(_screen(_FakeDataSource(error: StateError('backend down'))));
    await tester.pumpAndSettle();

    expect(find.text('backend down'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });
}
