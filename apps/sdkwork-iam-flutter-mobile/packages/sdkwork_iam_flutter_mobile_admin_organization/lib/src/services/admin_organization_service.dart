// SDKWORK-IAM-FLUTTER-ADMIN-ORGANIZATION: authored service layer.
/**
 * Use-case orchestration of `sdkwork_iam_flutter_mobile_admin_organization`.
 *
 * Section 6: the admin tier reads **backend-api** resources; the bootstrap constructs the
 * generated backend client and injects it through the port below.
 *
 * The tree endpoint returns the whole hierarchy in one answer, so this capability flattens
 * it for a phone: depth-first order with an explicit depth per row, which is what a nested
 * list needs and what a `ListView` can render without nested scroll views.
 */

/// One organization node.
class IamFlutterMobileAdminOrganizationNode {
  const IamFlutterMobileAdminOrganizationNode({
    required this.id,
    this.name,
    this.parentId,
  });

  /// Stable identity.
  final String id;

  /// Display name.
  final String? name;

  /// Parent id, null for a root.
  final String? parentId;
}

/// A node placed in the hierarchy.
class IamFlutterMobileAdminOrganizationEntry {
  const IamFlutterMobileAdminOrganizationEntry({required this.depth, required this.node});

  /// Nesting level, 0 for a root.
  final int depth;

  /// The node itself.
  final IamFlutterMobileAdminOrganizationNode node;
}

/// The data port the capability depends on.
abstract class IamFlutterMobileAdminOrganizationDataSource {
  /// Reads the whole organization hierarchy.
  Future<List<IamFlutterMobileAdminOrganizationNode>> loadTree();
}

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> iamFlutterMobileAdminOrganizationRoutePaths = <String, String>{
  'admin.iam.organization.tree': '/admin/iam/organizations',
};

/// Validation and error mapping of the `admin_organization` capability.
class IamFlutterMobileAdminOrganizationService {
  const IamFlutterMobileAdminOrganizationService({
    IamFlutterMobileAdminOrganizationDataSource? dataSource,
  }) : _dataSource = dataSource;

  final IamFlutterMobileAdminOrganizationDataSource? _dataSource;

  /// Reads the whole hierarchy.
  Future<List<IamFlutterMobileAdminOrganizationNode>> loadTree() =>
      _requireDataSource().loadTree();

  /// Flattens a hierarchy into depth-first rows.
  ///
  /// Three properties matter for a screen an operator scrolls:
  /// - a node whose parent is absent (a filtered or stitched answer) is still shown, at
  ///   depth 0, rather than dropped — the operator asked for the tree, not for orphans;
  /// - a parent pointer cycle is cut instead of recursing forever, so a malformed answer
  ///   cannot hang the UI;
  /// - siblings keep the order the server sent, because that order is the tenant's.
  static List<IamFlutterMobileAdminOrganizationEntry> flatten(
    List<IamFlutterMobileAdminOrganizationNode> nodes,
  ) {
    final Map<String, List<IamFlutterMobileAdminOrganizationNode>> children =
        <String, List<IamFlutterMobileAdminOrganizationNode>>{};
    final Set<String> ids = <String>{for (final IamFlutterMobileAdminOrganizationNode n in nodes) n.id};
    final List<IamFlutterMobileAdminOrganizationNode> roots = <IamFlutterMobileAdminOrganizationNode>[];

    for (final IamFlutterMobileAdminOrganizationNode node in nodes) {
      final String? parentId = node.parentId;
      if (parentId == null || parentId == node.id || !ids.contains(parentId)) {
        roots.add(node);
        continue;
      }
      children.putIfAbsent(parentId, () => <IamFlutterMobileAdminOrganizationNode>[]).add(node);
    }

    final List<IamFlutterMobileAdminOrganizationEntry> rows =
        <IamFlutterMobileAdminOrganizationEntry>[];
    final Set<String> visited = <String>{};

    void walk(IamFlutterMobileAdminOrganizationNode node, int depth) {
      if (!visited.add(node.id)) return;
      rows.add(IamFlutterMobileAdminOrganizationEntry(depth: depth, node: node));
      for (final IamFlutterMobileAdminOrganizationNode child
          in children[node.id] ?? const <IamFlutterMobileAdminOrganizationNode>[]) {
        walk(child, depth + 1);
      }
    }

    for (final IamFlutterMobileAdminOrganizationNode root in roots) {
      walk(root, 0);
    }
    // A cycle with no root at all would leave every node unreachable from a root; those are
    // still shown, at depth 0, because hiding them would report an empty tenant.
    for (final IamFlutterMobileAdminOrganizationNode node in nodes) {
      if (!visited.contains(node.id)) walk(node, 0);
    }
    return rows;
  }

  /// Maps a physical Flutter location back to its cross-client route id.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry
        in iamFlutterMobileAdminOrganizationRoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }

  IamFlutterMobileAdminOrganizationDataSource _requireDataSource() {
    final IamFlutterMobileAdminOrganizationDataSource? source = _dataSource;
    if (source == null) {
      throw StateError(
        'IamFlutterMobileAdminOrganizationService requires an '
        'IamFlutterMobileAdminOrganizationDataSource; the root bootstrap must inject one.',
      );
    }
    return source;
  }
}
