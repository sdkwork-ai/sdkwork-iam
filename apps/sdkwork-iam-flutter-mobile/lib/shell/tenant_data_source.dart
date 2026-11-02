// SDKWORK-IAM-FLUTTER-SHELL: authored capability adapter.
/**
 * App-api implementation of the tenant capability's data port.
 *
 * The capability package owns the port and knows nothing about the generated SDK;
 * this adapter is the composition layer that answers it with
 * `/app/v3/api` calls through the shared app-tier client.
 *
 * It maps loosely-typed responses into the capability's value types and nothing
 * else: no caching, no retries, no second source of truth for the rows.
 */

import 'package:flutter/foundation.dart';
import 'package:sdkwork_iam_app_sdk/sdkwork_iam_app_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile_tenant/sdkwork_iam_flutter_mobile_tenant.dart';

import '../bootstrap/sdk_clients.dart';

/// Reads the tenant overview from the app-api.
class IamTenantAppSdkDataSource implements IamFlutterMobileTenantDataSource {
  /// Creates the adapter. A client may be injected for tests.
  IamTenantAppSdkDataSource({SdkworkAppClient? client})
      : _client = client ?? getSdkClients().iamFlutterMobileCore;

  final SdkworkAppClient _client;

  /// Page size of the two lists the overview shows.
  static const int pageSize = 20;

  @override
  Future<IamFlutterMobileTenantOverview> loadOverview() async {
    // Three concurrent reads: the session context and the two lists. A partial
    // answer is not useful on this screen, so the first failure rejects the load
    // and the screen renders one error with a retry.
    final List<Object?> answers = await Future.wait(<Future<Object?>>[
      _client.system.iamRuntimeRetrieve(),
      _client.iam.organizationsList(0, pageSize),
      _client.iam.organizationMembershipsList(0, pageSize),
    ]);

    final Map<String, dynamic> runtime = _resourceData(answers[0], 'iam runtime');
    return IamFlutterMobileTenantOverview(
      environment: _readString(runtime['environment']),
      memberships: _rows(_listItems(answers[2], 'organization memberships'), (Map<String, dynamic> item) {
        final String? userId = _readString(item['userId']) ??
            _readString(item['user_id']) ??
            _readString(item['id']);
        if (userId == null) return null;
        final String? organizationId =
            _readString(item['organizationId']) ?? _readString(item['organization_id']);
        return IamFlutterMobileTenantRow(
          detail: <String?>[organizationId, userId].whereType<String>().join(' · '),
          id: _readString(item['id']) ?? userId,
          title: _readString(item['displayName']) ?? _readString(item['name']) ?? userId,
        );
      }),
      organizations: _rows(_listItems(answers[1], 'organizations'), (Map<String, dynamic> item) {
        final String? organizationId = _readString(item['organizationId']) ??
            _readString(item['organization_id']) ??
            _readString(item['id']);
        if (organizationId == null) return null;
        final String? parentId = _readString(item['parentId']) ?? _readString(item['parent_id']);
        return IamFlutterMobileTenantRow(
          detail: parentId == null ? organizationId : '$organizationId · $parentId',
          id: _readString(item['id']) ?? organizationId,
          title: _readString(item['name']) ?? organizationId,
        );
      }),
      tenantId: _readString(runtime['tenantId']) ?? _readString(runtime['tenant_id']),
      userId: _readString(runtime['userId']) ?? _readString(runtime['user_id']),
    );
  }
}

/// The `data` object of a resource response.
Map<String, dynamic> _resourceData(Object? response, String what) {
  if (response is SdkWorkResourceResponse && response.data is Map) {
    return Map<String, dynamic>.from(response.data as Map);
  }
  if (response is SdkWorkListResponse && response.data is Map) {
    return Map<String, dynamic>.from(response.data as Map);
  }
  throw StateError('The $what response carried no data object.');
}

/// The `items` array of a list response.
List<Object?> _listItems(Object? response, String what) {
  final Map<String, dynamic> data = _resourceData(response, what);
  final Object? items = data['items'];
  if (items is List) return items;
  throw StateError('The $what response carried no items array.');
}

/// Maps one page of records, dropping the ones without an identity.
List<IamFlutterMobileTenantRow> _rows(
  List<Object?> items,
  IamFlutterMobileTenantRow? Function(Map<String, dynamic>) map,
) {
  final List<IamFlutterMobileTenantRow> rows = <IamFlutterMobileTenantRow>[];
  for (final Object? item in items) {
    if (item is! Map) {
      // A malformed row is skipped rather than rendered as a blank line; the
      // backend contract says every item is an object.
      debugPrint('IAM tenant overview: dropped a non-object item');
      continue;
    }
    final IamFlutterMobileTenantRow? row = map(Map<String, dynamic>.from(item));
    if (row != null) rows.add(row);
  }
  return rows;
}

String? _readString(Object? value) {
  if (value is String) {
    final String trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }
  if (value is num) return value.toString();
  return null;
}
