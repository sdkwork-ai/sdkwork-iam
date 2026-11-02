// SDKWORK-IAM-FLUTTER-SHELL: authored capability adapter.
/**
 * Backend-api implementation of the admin organization capability's data port.
 *
 * `iam/organizations/tree` answers with the whole hierarchy in one resource, so this adapter
 * reads nodes rather than pages; any nesting the server expresses as a nested `children`
 * array is flattened into parent pointers so the capability sees one shape.
 */

import 'package:sdkwork_iam_backend_sdk/sdkwork_iam_backend_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_organization/sdkwork_iam_flutter_mobile_admin_organization.dart';

import '../bootstrap/sdk_clients.dart';

/// Reads the organization hierarchy from the backend-api.
class IamAdminOrganizationBackendSdkDataSource
    implements IamFlutterMobileAdminOrganizationDataSource {
  /// Creates the adapter. A client may be injected for tests.
  IamAdminOrganizationBackendSdkDataSource({SdkworkBackendClient? client})
      : _client = client ?? getSdkClients().iamFlutterMobileAdminCore;

  final SdkworkBackendClient _client;

  @override
  Future<List<IamFlutterMobileAdminOrganizationNode>> loadTree() async {
    final SdkWorkResourceResponse? response = await _client.iam.organizationsTreeRetrieve();
    final Object? data = response?.data;
    if (data is! Map) {
      throw StateError('The organization tree response carried no data object.');
    }
    final Map<String, dynamic> body = Map<String, dynamic>.from(data);
    final Object? root = body['items'] ?? body['nodes'] ?? body['item'] ?? body['tree'];

    final List<IamFlutterMobileAdminOrganizationNode> nodes =
        <IamFlutterMobileAdminOrganizationNode>[];
    _collect(root, null, nodes);
    return nodes;
  }

  /// Walks a node list, turning nested `children` into parent pointers.
  void _collect(
    Object? value,
    String? parentId,
    List<IamFlutterMobileAdminOrganizationNode> out,
  ) {
    if (value is List) {
      for (final Object? item in value) {
        _collect(item, parentId, out);
      }
      return;
    }
    if (value is! Map) return;
    final Map<String, dynamic> record = Map<String, dynamic>.from(value);
    final String? id = _readString(record['organizationId']) ??
        _readString(record['organization_id']) ??
        _readString(record['id']);
    // A node without an identity cannot be placed or opened, so its subtree is skipped
    // rather than attached to a parent it does not belong to.
    if (id == null) return;
    final String? declaredParent = _readString(record['parentId']) ?? _readString(record['parent_id']);
    out.add(
      IamFlutterMobileAdminOrganizationNode(
        id: id,
        name: _readString(record['name']),
        parentId: declaredParent ?? parentId,
      ),
    );
    final Object? children = record['children'];
    if (children != null) {
      _collect(children, id, out);
    }
  }
}

String? _readString(Object? value) {
  if (value is String) {
    final String trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }
  return null;
}
