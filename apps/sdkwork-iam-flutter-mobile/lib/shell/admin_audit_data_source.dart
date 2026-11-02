// SDKWORK-IAM-FLUTTER-SHELL: authored capability adapter.
/**
 * Backend-api implementation of the admin audit capability's data port.
 *
 * The audit trail is the largest admin list, so it is paged on the server and searched by
 * actor or action rather than downloaded.
 */

import 'package:sdkwork_iam_backend_sdk/sdkwork_iam_backend_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_audit/sdkwork_iam_flutter_mobile_admin_audit.dart';

import '../bootstrap/sdk_clients.dart';

/// Reads audit events from the backend-api.
class IamAdminAuditBackendSdkDataSource implements IamFlutterMobileAdminAuditDataSource {
  /// Creates the adapter. A client may be injected for tests.
  IamAdminAuditBackendSdkDataSource({SdkworkBackendClient? client})
      : _client = client ?? getSdkClients().iamFlutterMobileAdminCore;

  final SdkworkBackendClient _client;

  @override
  Future<IamFlutterMobileAdminAuditPage> fetchPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    final SdkWorkListResponse? response =
        await _client.iam.auditEventsList(page, pageSize, null, null, q);
    final Object? data = response?.data;
    if (data is! Map) {
      throw StateError('The audit event list response carried no data object.');
    }
    final Map<String, dynamic> body = Map<String, dynamic>.from(data);
    final Object? items = body['items'];
    if (items is! List) {
      throw StateError('The audit event list response carried no items array.');
    }
    final Map<String, dynamic> pageInfo =
        body['pageInfo'] is Map ? Map<String, dynamic>.from(body['pageInfo'] as Map) : <String, dynamic>{};

    final List<IamFlutterMobileAdminAuditEvent> rows = <IamFlutterMobileAdminAuditEvent>[];
    for (final Object? item in items) {
      if (item is! Map) continue;
      final Map<String, dynamic> record = Map<String, dynamic>.from(item);
      final String? id = _readString(record['auditEventId']) ??
          _readString(record['audit_event_id']) ??
          _readString(record['eventId']) ??
          _readString(record['id']);
      // Without an identity the row cannot be opened or referenced later, so it is dropped
      // instead of rendered as an untraceable line.
      if (id == null) continue;
      rows.add(
        IamFlutterMobileAdminAuditEvent(
          action: _readString(record['action']) ?? _readString(record['eventType']),
          actor: _readString(record['actorName']) ??
              _readString(record['actorId']) ??
              _readString(record['actor_id']) ??
              _readString(record['userId']),
          id: id,
          occurredAt: _readString(record['occurredAt']) ??
              _readString(record['occurred_at']) ??
              _readString(record['createdAt']) ??
              _readString(record['created_at']),
          resource: _readString(record['resource']) ??
              _readString(record['resourceType']) ??
              _readString(record['target']),
        ),
      );
    }
    return IamFlutterMobileAdminAuditPage(
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
