// SDKWORK-IAM-FLUTTER-SHELL: authored capability adapter.
/**
 * App-api implementation of the console organization capability's data port.
 *
 * The console lists the tenant's organizations, not the caller's memberships, so it pages
 * `iam/organizations` directly and keeps the parent id for the tree.
 */

import 'package:sdkwork_iam_app_sdk/sdkwork_iam_app_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile_console_organization/sdkwork_iam_flutter_mobile_console_organization.dart';

import '../bootstrap/sdk_clients.dart';

/// Reads organization pages from the app-api for the console workspace.
class IamConsoleOrganizationAppSdkDataSource
    implements IamFlutterMobileConsoleOrganizationDataSource {
  /// Creates the adapter. A client may be injected for tests.
  IamConsoleOrganizationAppSdkDataSource({SdkworkAppClient? client})
      : _client = client ?? getSdkClients().iamFlutterMobileCore;

  final SdkworkAppClient _client;

  @override
  Future<IamFlutterMobileConsoleOrganizationPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    final SdkWorkListResponse? response =
        await _client.iam.organizationsList(page, pageSize, null, null, q);
    final Object? data = response?.data;
    if (data is! Map) {
      throw StateError('The organization list response carried no data object.');
    }
    final Map<String, dynamic> body = Map<String, dynamic>.from(data);
    final Object? items = body['items'];
    if (items is! List) {
      throw StateError('The organization list response carried no items array.');
    }
    final Map<String, dynamic> pageInfo =
        body['pageInfo'] is Map ? Map<String, dynamic>.from(body['pageInfo'] as Map) : <String, dynamic>{};

    final List<IamFlutterMobileConsoleOrganizationRow> rows =
        <IamFlutterMobileConsoleOrganizationRow>[];
    for (final Object? item in items) {
      if (item is! Map) continue;
      final Map<String, dynamic> record = Map<String, dynamic>.from(item);
      final String? organizationId = _readString(record['organizationId']) ??
          _readString(record['organization_id']) ??
          _readString(record['id']);
      if (organizationId == null) continue;
      final String? parentId = _readString(record['parentId']) ?? _readString(record['parent_id']);
      rows.add(
        IamFlutterMobileConsoleOrganizationRow(
          detail: parentId == null ? organizationId : '$organizationId · $parentId',
          id: _readString(record['id']) ?? organizationId,
          title: _readString(record['name']) ?? organizationId,
        ),
      );
    }
    return IamFlutterMobileConsoleOrganizationPage(
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
