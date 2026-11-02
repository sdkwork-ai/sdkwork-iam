// SDKWORK-IAM-FLUTTER-SHELL: authored capability adapter.
/**
 * Backend-api implementation of the admin account-binding capability's data port.
 *
 * Reads `oauth/account_links` tenant-wide. A link with no identity cannot be inspected or
 * acted on later, so it is dropped rather than rendered as an unmanageable row.
 */

import 'package:sdkwork_iam_backend_sdk/sdkwork_iam_backend_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_account_binding/sdkwork_iam_flutter_mobile_admin_account_binding.dart';

import '../bootstrap/sdk_clients.dart';

/// Reads tenant-wide account links from the backend-api.
class IamAdminAccountBindingBackendSdkDataSource
    implements IamFlutterMobileAdminAccountBindingDataSource {
  /// Creates the adapter. A client may be injected for tests.
  IamAdminAccountBindingBackendSdkDataSource({SdkworkBackendClient? client})
      : _client = client ?? getSdkClients().iamFlutterMobileAdminCore;

  final SdkworkBackendClient _client;

  @override
  Future<IamFlutterMobileAdminAccountLinkPage> fetchLinksPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    final SdkWorkListResponse? response =
        await _client.iamOauth.accountLinksList(page, pageSize, null, null, q);
    final Object? data = response?.data;
    if (data is! Map) {
      throw StateError('The account link list response carried no data object.');
    }
    final Map<String, dynamic> body = Map<String, dynamic>.from(data);
    final Object? items = body['items'];
    if (items is! List) {
      throw StateError('The account link list response carried no items array.');
    }
    final Map<String, dynamic> pageInfo =
        body['pageInfo'] is Map ? Map<String, dynamic>.from(body['pageInfo'] as Map) : <String, dynamic>{};

    final List<IamFlutterMobileAdminAccountLinkRow> rows =
        <IamFlutterMobileAdminAccountLinkRow>[];
    for (final Object? item in items) {
      if (item is! Map) continue;
      final Map<String, dynamic> record = Map<String, dynamic>.from(item);
      final String? id = _readString(record['accountLinkId']) ??
          _readString(record['account_link_id']) ??
          _readString(record['id']);
      if (id == null) continue;
      rows.add(
        IamFlutterMobileAdminAccountLinkRow(
          accountLinkId: id,
          provider: _readString(record['provider']) ?? _readString(record['providerKey']),
          providerUserId:
              _readString(record['providerUserId']) ?? _readString(record['provider_user_id']),
          userId: _readString(record['userId']) ?? _readString(record['user_id']),
        ),
      );
    }
    return IamFlutterMobileAdminAccountLinkPage(
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
