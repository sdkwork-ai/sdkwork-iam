// SDKWORK-IAM-FLUTTER-SHELL: authored capability adapter.
/**
 * App-api implementation of the console user-center capability's data port.
 *
 * Reads the caller's own record and the tenant verification policy. The policy read is
 * tolerant: a deployment that publishes none still renders the account, because the account
 * is why the operator opened the screen.
 */

import 'package:sdkwork_iam_app_sdk/sdkwork_iam_app_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile_console_user_center/sdkwork_iam_flutter_mobile_console_user_center.dart';

import '../bootstrap/sdk_clients.dart';

/// Reads the console profile from the app-api.
class IamConsoleUserCenterAppSdkDataSource
    implements IamFlutterMobileConsoleUserCenterDataSource {
  /// Creates the adapter. A client may be injected for tests.
  IamConsoleUserCenterAppSdkDataSource({SdkworkAppClient? client})
      : _client = client ?? getSdkClients().iamFlutterMobileCore;

  final SdkworkAppClient _client;

  @override
  Future<IamFlutterMobileConsoleUserAccount> loadAccount() async {
    final SdkWorkResourceResponse? response = await _client.iam.usersCurrentRetrieve();
    final Map<String, dynamic> body = _data(response, 'user profile');
    return IamFlutterMobileConsoleUserAccount(
      displayName: _readString(body['displayName']) ?? _readString(body['display_name']),
      email: _readString(body['email']),
      phone: _readString(body['phone']),
      userId: _readString(body['userId']) ?? _readString(body['user_id']) ?? _readString(body['id']),
    );
  }

  @override
  Future<IamFlutterMobileConsoleUserVerificationPolicy> loadVerificationPolicy() async {
    try {
      final SdkWorkResourceResponse? response =
          await _client.system.iamVerificationPolicyRetrieve();
      final Map<String, dynamic> body = _data(response, 'verification policy');
      final Map<String, dynamic> contact = _readMap(body['contactVerification']);
      final Map<String, dynamic> email = _readMap(body['emailVerification']);
      final Map<String, dynamic> oauth = _readMap(body['oauthVerification']);
      return IamFlutterMobileConsoleUserVerificationPolicy(
        contactRequired: contact['required'] == true || body['contactRequired'] == true,
        emailRequired: email['required'] == true || body['emailRequired'] == true,
        oauthRequired: oauth['required'] == true || body['oauthRequired'] == true,
      );
    } catch (_) {
      return const IamFlutterMobileConsoleUserVerificationPolicy();
    }
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
