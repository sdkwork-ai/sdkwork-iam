// SDKWORK-IAM-FLUTTER-SHELL: authored capability adapter.
/**
 * App-api implementation of the console account-binding capability's data port.
 *
 * Reads the tenant binding policy and the user's linked identities, and deletes one link.
 */

import 'package:sdkwork_iam_app_sdk/sdkwork_iam_app_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile_console_account_binding/sdkwork_iam_flutter_mobile_console_account_binding.dart';

import '../bootstrap/sdk_clients.dart';

/// Reads and mutates bindings through the app-api for the console workspace.
class IamConsoleAccountBindingAppSdkDataSource
    implements IamFlutterMobileConsoleAccountBindingDataSource {
  /// Creates the adapter. A client may be injected for tests.
  IamConsoleAccountBindingAppSdkDataSource({SdkworkAppClient? client})
      : _client = client ?? getSdkClients().iamFlutterMobileCore;

  final SdkworkAppClient _client;

  @override
  Future<IamFlutterMobileConsoleAccountBindingPolicy> loadPolicy() async {
    try {
      final SdkWorkResourceResponse? response =
          await _client.system.iamAccountBindingPolicyRetrieve();
      final Map<String, dynamic> body = _data(response, 'account binding policy');
      final Map<String, dynamic> contact = _readMap(body['contactBinding']);
      final Map<String, dynamic> oauth = _readMap(body['oauthBinding']);
      return IamFlutterMobileConsoleAccountBindingPolicy(
        contactEnabled: contact['enabled'] == true,
        emailEnabled: contact['emailEnabled'] == true,
        oauthEnabled: oauth['enabled'] == true,
        // Absent means "not granted": a policy that forgot the flag must not read as
        // permission to remove a sign-in method.
        selfServiceUnlinkEnabled: oauth['selfServiceLinkEnabled'] == true ||
            oauth['selfServiceUnlinkEnabled'] == true,
      );
    } catch (_) {
      return const IamFlutterMobileConsoleAccountBindingPolicy();
    }
  }

  @override
  Future<IamFlutterMobileConsoleAccountLinkPage> fetchLinksPage({
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

    final List<IamFlutterMobileConsoleAccountLink> links = <IamFlutterMobileConsoleAccountLink>[];
    for (final Object? item in items) {
      if (item is! Map) continue;
      final Map<String, dynamic> record = Map<String, dynamic>.from(item);
      final String? id = _readString(record['accountLinkId']) ??
          _readString(record['account_link_id']) ??
          _readString(record['id']);
      if (id == null) continue;
      links.add(
        IamFlutterMobileConsoleAccountLink(
          accountLinkId: id,
          provider: _readString(record['provider']) ?? _readString(record['providerKey']),
          providerUserId:
              _readString(record['providerUserId']) ?? _readString(record['provider_user_id']),
        ),
      );
    }
    return IamFlutterMobileConsoleAccountLinkPage(
      hasMore: pageInfo['hasMore'] == true,
      items: links,
    );
  }

  @override
  Future<void> unlink(String accountLinkId) {
    return _client.oauth.accountLinksDelete(accountLinkId);
  }
}

Map<String, dynamic> _data(SdkWorkResourceResponse? response, String what) {
  final Object? data = response?.data;
  if (data is! Map) {
    throw StateError('The $what response carried no data object.');
  }
  final Object? item = data['item'];
  return Map<String, dynamic>.from(item is Map ? item : data);
}

Map<String, dynamic> _readMap(Object? value) {
  return value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};
}

String? _readString(Object? value) {
  if (value is String) {
    final String trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }
  return null;
}
