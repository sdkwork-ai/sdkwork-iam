// SDKWORK-IAM-FLUTTER-SHELL: authored capability adapter.
/**
 * Backend-api implementation of the admin tenant capability's data port.
 *
 * The tenant list is what an operator searches when a ticket names an id or a company, so
 * the term goes to the server rather than filtering a download.
 */

import 'package:sdkwork_iam_backend_sdk/sdkwork_iam_backend_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_tenant/sdkwork_iam_flutter_mobile_admin_tenant.dart';

import '../bootstrap/sdk_clients.dart';

/// Reads tenants from the backend-api.
class IamAdminTenantBackendSdkDataSource implements IamFlutterMobileAdminTenantDataSource {
  /// Creates the adapter. A client may be injected for tests.
  IamAdminTenantBackendSdkDataSource({SdkworkBackendClient? client})
      : _client = client ?? getSdkClients().iamFlutterMobileAdminCore;

  final SdkworkBackendClient _client;

  @override
  Future<IamFlutterMobileAdminTenantPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    final SdkWorkListResponse? response =
        await _client.iam.tenantsList(page, pageSize, null, null, q);
    final Object? data = response?.data;
    if (data is! Map) {
      throw StateError('The tenant list response carried no data object.');
    }
    final Map<String, dynamic> body = Map<String, dynamic>.from(data);
    final Object? items = body['items'];
    if (items is! List) {
      throw StateError('The tenant list response carried no items array.');
    }
    final Map<String, dynamic> pageInfo =
        body['pageInfo'] is Map ? Map<String, dynamic>.from(body['pageInfo'] as Map) : <String, dynamic>{};

    final List<IamFlutterMobileAdminTenantRow> rows = <IamFlutterMobileAdminTenantRow>[];
    for (final Object? item in items) {
      if (item is! Map) continue;
      final Map<String, dynamic> record = Map<String, dynamic>.from(item);
      final String? id = _readString(record['tenantId']) ??
          _readString(record['tenant_id']) ??
          _readString(record['id']);
      // Without an identity the row cannot be opened later, so it is dropped.
      if (id == null) continue;
      rows.add(
        IamFlutterMobileAdminTenantRow(
          id: id,
          name: _readString(record['name']) ?? _readString(record['displayName']),
          slug: _readString(record['slug']) ?? _readString(record['code']),
          status: _readString(record['status']),
        ),
      );
    }
    return IamFlutterMobileAdminTenantPage(
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
