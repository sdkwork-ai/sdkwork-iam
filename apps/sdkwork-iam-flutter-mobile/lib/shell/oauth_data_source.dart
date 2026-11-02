// SDKWORK-IAM-FLUTTER-SHELL: authored capability adapter.
/**
 * App-api implementation of the OAuth capability's data port.
 *
 * Lists `oauth/providers` and asks `oauth/authorization_urls` for the URL the host
 * opens. The URL is never opened here: opening is a platform action.
 */

import 'package:sdkwork_iam_app_sdk/sdkwork_iam_app_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile_oauth/sdkwork_iam_flutter_mobile_oauth.dart';

import '../bootstrap/sdk_clients.dart';

/// Reads providers and authorization URLs from the app-api.
class IamOAuthAppSdkDataSource implements IamFlutterMobileOAuthDataSource {
  /// Creates the adapter. A client may be injected for tests.
  IamOAuthAppSdkDataSource({SdkworkAppClient? client})
      : _client = client ?? getSdkClients().iamFlutterMobileCore;

  final SdkworkAppClient _client;

  @override
  Future<List<IamFlutterMobileOAuthProvider>> loadProviders() async {
    final SdkWorkListResponse? response = await _client.oauth.providersList(0, 50);
    final Object? data = response?.data;
    if (data is! Map) {
      throw StateError('The provider list response carried no data object.');
    }
    final Object? items = Map<String, dynamic>.from(data)['items'];
    if (items is! List) {
      throw StateError('The provider list response carried no items array.');
    }
    final List<IamFlutterMobileOAuthProvider> providers = <IamFlutterMobileOAuthProvider>[];
    for (final Object? item in items) {
      if (item is! Map) continue;
      final Map<String, dynamic> record = Map<String, dynamic>.from(item);
      final String? key = _readString(record['providerKey']) ??
          _readString(record['provider_key']) ??
          _readString(record['code']) ??
          _readString(record['provider']);
      if (key == null) continue;
      providers.add(
        IamFlutterMobileOAuthProvider(
          displayName: _readString(record['displayName']) ??
              _readString(record['display_name']) ??
              _readString(record['name']),
          enabled: record['enabled'] != false,
          providerKey: key,
        ),
      );
    }
    return providers;
  }

  @override
  Future<String> createAuthorizationUrl(String providerKey) async {
    // The app-api names the field `provider`, not `providerKey`.
    final SdkWorkResourceResponse? response = await _client.oauth.authorizationUrlsCreate(
      <String, dynamic>{'provider': providerKey},
    );
    final Object? data = response?.data;
    if (data is! Map) {
      throw StateError('The authorization endpoint returned no data object.');
    }
    final Map<String, dynamic> body = Map<String, dynamic>.from(data);
    final String? url = _readString(body['authorizationUrl']) ??
        _readString(body['authorization_url']) ??
        _readString(body['url']);
    if (url == null) {
      throw StateError('The authorization endpoint returned no URL.');
    }
    return url;
  }
}

String? _readString(Object? value) {
  if (value is String) {
    final String trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }
  return null;
}
