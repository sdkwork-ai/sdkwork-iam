// SDKWORK-IAM-FLUTTER-SHELL: authored capability adapter.
/**
 * Backend-api implementation of the admin OAuth capability's data port.
 *
 * Reads `oauth/provider_catalog`: the providers this deployment knows about, with the state
 * the console reports. A provider without a key cannot be referenced later, so it is dropped.
 */

import 'package:sdkwork_iam_backend_sdk/sdkwork_iam_backend_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_oauth/sdkwork_iam_flutter_mobile_admin_oauth.dart';

import '../bootstrap/sdk_clients.dart';

/// Reads the provider catalog from the backend-api.
class IamAdminOAuthBackendSdkDataSource implements IamFlutterMobileAdminOAuthDataSource {
  /// Creates the adapter. A client may be injected for tests.
  IamAdminOAuthBackendSdkDataSource({SdkworkBackendClient? client})
      : _client = client ?? getSdkClients().iamFlutterMobileAdminCore;

  final SdkworkBackendClient _client;

  @override
  Future<IamFlutterMobileAdminOAuthProviderPage> fetchProvidersPage({
    required int page,
    required int pageSize,
    String? q,
  }) async {
    final SdkWorkListResponse? response =
        await _client.iamOauth.providerCatalogList(page, pageSize, null, null, q);
    final Object? data = response?.data;
    if (data is! Map) {
      throw StateError('The provider catalog response carried no data object.');
    }
    final Map<String, dynamic> body = Map<String, dynamic>.from(data);
    final Object? items = body['items'];
    if (items is! List) {
      throw StateError('The provider catalog response carried no items array.');
    }
    final Map<String, dynamic> pageInfo =
        body['pageInfo'] is Map ? Map<String, dynamic>.from(body['pageInfo'] as Map) : <String, dynamic>{};

    final List<IamFlutterMobileAdminOAuthProviderRow> rows =
        <IamFlutterMobileAdminOAuthProviderRow>[];
    for (final Object? item in items) {
      if (item is! Map) continue;
      final Map<String, dynamic> record = Map<String, dynamic>.from(item);
      final String? key = _readString(record['providerKey']) ??
          _readString(record['provider_key']) ??
          _readString(record['code']) ??
          _readString(record['key']);
      if (key == null) continue;
      final Object? enabled = record['enabled'] ?? record['isEnabled'];
      rows.add(
        IamFlutterMobileAdminOAuthProviderRow(
          // Only a real bool is a report; anything else stays unknown rather than guessing.
          enabled: enabled is bool ? enabled : null,
          displayName: _readString(record['displayName']) ?? _readString(record['name']),
          providerKey: key,
          source: _readString(record['source']) ?? _readString(record['origin']),
        ),
      );
    }
    return IamFlutterMobileAdminOAuthProviderPage(
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
