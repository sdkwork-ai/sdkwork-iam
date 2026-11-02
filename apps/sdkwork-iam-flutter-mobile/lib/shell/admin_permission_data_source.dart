// SDKWORK-IAM-FLUTTER-SHELL: authored capability adapter.
/**
 * Backend-api implementation of the admin permission capability's data port.
 *
 * This is the only place the admin surface touches the generated **backend** client: the
 * capability package receives the port and never sees a transport.
 */

import 'package:sdkwork_iam_backend_sdk/sdkwork_iam_backend_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_permission/sdkwork_iam_flutter_mobile_admin_permission.dart';

import '../bootstrap/sdk_clients.dart';

/// Reads the permission catalog from the backend-api.
class IamAdminPermissionBackendSdkDataSource
    implements IamFlutterMobileAdminPermissionDataSource {
  /// Creates the adapter. A client may be injected for tests.
  IamAdminPermissionBackendSdkDataSource({SdkworkBackendClient? client})
      : _client = client ?? getSdkClients().iamFlutterMobileAdminCore;

  final SdkworkBackendClient _client;

  @override
  Future<IamFlutterMobileAdminPermissionPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    final SdkWorkListResponse? response =
        await _client.iam.permissionsList(page, pageSize, null, null, q);
    final Object? data = response?.data;
    if (data is! Map) {
      throw StateError('The permission list response carried no data object.');
    }
    final Map<String, dynamic> body = Map<String, dynamic>.from(data);
    final Object? items = body['items'];
    if (items is! List) {
      throw StateError('The permission list response carried no items array.');
    }
    final Map<String, dynamic> pageInfo =
        body['pageInfo'] is Map ? Map<String, dynamic>.from(body['pageInfo'] as Map) : <String, dynamic>{};

    final List<IamFlutterMobileAdminPermissionRow> rows =
        <IamFlutterMobileAdminPermissionRow>[];
    for (final Object? item in items) {
      if (item is! Map) continue;
      final Map<String, dynamic> record = Map<String, dynamic>.from(item);
      final String? id = _readString(record['permissionId']) ??
          _readString(record['permission_id']) ??
          _readString(record['id']);
      // A permission without an identity cannot be acted on later, so it is dropped rather
      // than rendered as a row an operator could never manage.
      if (id == null) continue;
      rows.add(
        IamFlutterMobileAdminPermissionRow(
          action: _readString(record['action']),
          code: _readString(record['code']) ?? _readString(record['name']) ?? id,
          id: id,
          resource: _readString(record['resource']),
        ),
      );
    }
    return IamFlutterMobileAdminPermissionPage(
      hasMore: pageInfo['hasMore'] == true,
      items: rows,
    );
  }
}

String? _readString(Object? value) {
  if (value is String) {
    final String trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }
  return null;
}
