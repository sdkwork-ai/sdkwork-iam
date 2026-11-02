// SDKWORK-IAM-FLUTTER-SHELL: authored capability adapter.
/**
 * App-api implementation of the account-binding capability's data port.
 *
 * Reads the tenant policy from `system/iam/account_binding_policy`, pages
 * `oauth/account_links`, and deletes one link.
 */

import 'package:sdkwork_iam_app_sdk/sdkwork_iam_app_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile_account_binding/sdkwork_iam_flutter_mobile_account_binding.dart';

import '../bootstrap/sdk_clients.dart';

/// Reads and mutates account bindings through the app-api.
class IamAccountBindingAppSdkDataSource implements IamFlutterMobileAccountBindingDataSource {
  /// Creates the adapter. A client may be injected for tests.
  IamAccountBindingAppSdkDataSource({SdkworkAppClient? client})
      : _client = client ?? getSdkClients().iamFlutterMobileCore;

  final SdkworkAppClient _client;

  @override
  Future<IamFlutterMobileAccountBindingPolicy> loadPolicy() async {
    final SdkWorkResourceResponse? response =
        await _client.system.iamAccountBindingPolicyRetrieve();
    final Object? data = response?.data;
    if (data is! Map) {
      throw StateError('The account binding policy response carried no data object.');
    }
    final Map<String, dynamic> body = Map<String, dynamic>.from(data);
    final Map<String, dynamic> contact = _readMap(body['contactBinding']);
    final Map<String, dynamic> oauth = _readMap(body['oauthBinding']);
    return IamFlutterMobileAccountBindingPolicy(
      contactEnabled: _readBool(contact['enabled']),
      emailEnabled: _readBool(contact['emailEnabled']),
      oauthEnabled: _readBool(oauth['enabled']),
      // Absent means "not granted": a policy that forgot the flag must not be read
      // as permission to remove a sign-in method.
      selfServiceUnlinkEnabled: _readBool(oauth['selfServiceLinkEnabled']) ||
          _readBool(oauth['selfServiceUnlinkEnabled']),
    );
  }

  @override
  Future<IamFlutterMobileAccountLinkPage> fetchLinksPage({
    required int page,
    required int pageSize,
  }) async {
    final SdkWorkListResponse? response =
        await _client.oauth.accountLinksList(page, pageSize);
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

    final List<IamFlutterMobileAccountLink> links = <IamFlutterMobileAccountLink>[];
    for (final Object? item in items) {
      if (item is! Map) continue;
      final Map<String, dynamic> record = Map<String, dynamic>.from(item);
      final String? id = _readString(record['accountLinkId']) ??
          _readString(record['account_link_id']) ??
          _readString(record['id']);
      if (id == null) continue;
      links.add(
        IamFlutterMobileAccountLink(
          accountLinkId: id,
          provider: _readString(record['provider']) ?? _readString(record['providerKey']),
          providerUserId:
              _readString(record['providerUserId']) ?? _readString(record['provider_user_id']),
        ),
      );
    }
    return IamFlutterMobileAccountLinkPage(
      hasMore: pageInfo['hasMore'] == true,
      items: links,
    );
  }

  @override
  Future<void> unlink(String accountLinkId) {
    return _client.oauth.accountLinksDelete(accountLinkId);
  }
}

Map<String, dynamic> _readMap(Object? value) {
  return value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};
}

bool _readBool(Object? value) => value == true;

String? _readString(Object? value) {
  if (value is String) {
    final String trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }
  return null;
}
