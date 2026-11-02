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

  @override
  Future<IamFlutterMobileAdminRolePage> fetchRolesPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    final SdkWorkListResponse? response =
        await _client.iam.rolesList(page, pageSize, null, null, q);
    final Map<String, dynamic> body = _listBody(response, 'role');
    final List<IamFlutterMobileAdminRoleRow> rows = <IamFlutterMobileAdminRoleRow>[];
    for (final Object? item in body['items'] as List<Object?>) {
      if (item is! Map) continue;
      final Map<String, dynamic> record = Map<String, dynamic>.from(item);
      final String? id = _readString(record['roleId']) ??
          _readString(record['role_id']) ??
          _readString(record['id']);
      if (id == null) continue;
      rows.add(
        IamFlutterMobileAdminRoleRow(
          code: _readString(record['code']),
          id: id,
          name: _readString(record['name']) ?? _readString(record['displayName']),
          scope: _readString(record['scope']),
        ),
      );
    }
    return IamFlutterMobileAdminRolePage(hasMore: _hasMore(body), items: rows);
  }

  @override
  Future<IamFlutterMobileAdminPolicyPage> fetchPoliciesPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    final SdkWorkListResponse? response =
        await _client.iam.policiesList(page, pageSize, null, null, q);
    final Map<String, dynamic> body = _listBody(response, 'policy');
    final List<IamFlutterMobileAdminPolicyRow> rows = <IamFlutterMobileAdminPolicyRow>[];
    for (final Object? item in body['items'] as List<Object?>) {
      if (item is! Map) continue;
      final Map<String, dynamic> record = Map<String, dynamic>.from(item);
      final String? id = _readString(record['policyId']) ??
          _readString(record['policy_id']) ??
          _readString(record['id']);
      if (id == null) continue;
      rows.add(
        IamFlutterMobileAdminPolicyRow(
          action: _readString(record['action']),
          effect: _readString(record['effect'])?.toLowerCase(),
          id: id,
          resource: _readString(record['resource']),
          subject: _readString(record['subject']) ?? _readString(record['roleId']),
        ),
      );
    }
    return IamFlutterMobileAdminPolicyPage(hasMore: _hasMore(body), items: rows);
  }
}

/// Unwraps a list response and insists on an items array.
Map<String, dynamic> _listBody(SdkWorkListResponse? response, String what) {
  final Object? data = response?.data;
  if (data is! Map) {
    throw StateError('The $what list response carried no data object.');
  }
  final Map<String, dynamic> body = Map<String, dynamic>.from(data);
  if (body['items'] is! List) {
    throw StateError('The $what list response carried no items array.');
  }
  return body;
}

bool _hasMore(Map<String, dynamic> body) {
  final Object? pageInfo = body['pageInfo'];
  return pageInfo is Map && pageInfo['hasMore'] == true;
}

String? _readString(Object? value) {
  if (value is String) {
    final String trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }
  return null;
}
