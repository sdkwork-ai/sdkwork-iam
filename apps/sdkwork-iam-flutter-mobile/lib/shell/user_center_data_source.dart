// SDKWORK-IAM-FLUTTER-SHELL: authored capability adapter.
/**
 * App-api implementation of the user-center capability's data port.
 *
 * Reads and updates `iam/users/current` and changes the password through
 * `iam/users/current/password`.
 */

import 'package:sdkwork_iam_app_sdk/sdkwork_iam_app_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile_user_center/sdkwork_iam_flutter_mobile_user_center.dart';

import '../bootstrap/sdk_clients.dart';

/// Reads and updates the signed-in user's own profile.
class IamUserCenterAppSdkDataSource implements IamFlutterMobileUserCenterDataSource {
  /// Creates the adapter. A client may be injected for tests.
  IamUserCenterAppSdkDataSource({SdkworkAppClient? client})
      : _client = client ?? getSdkClients().iamFlutterMobileCore;

  final SdkworkAppClient _client;

  @override
  Future<IamFlutterMobileUserProfile> loadProfile() async {
    final SdkWorkResourceResponse? response = await _client.iam.usersCurrentRetrieve();
    return _profileFrom(_data(response, 'user profile'));
  }

  @override
  Future<IamFlutterMobileUserProfile> updateProfile(IamFlutterMobileUserProfileDraft draft) async {
    // Only the fields the user actually typed travel: sending empty strings would
    // blank out values the backend already holds.
    final Map<String, dynamic> body = <String, dynamic>{
      if (draft.displayName.trim().isNotEmpty) 'displayName': draft.displayName.trim(),
      if (draft.email.trim().isNotEmpty) 'email': draft.email.trim(),
      if (draft.phone.trim().isNotEmpty) 'phone': draft.phone.trim(),
    };
    final SdkWorkResourceResponse? response = await _client.iam.usersCurrentUpdate(body);
    return _profileFrom(_data(response, 'user profile'));
  }

  @override
  Future<void> changePassword(IamFlutterMobileUserPasswordDraft draft) async {
    await _client.iam.usersCurrentPasswordUpdate(<String, dynamic>{
      'confirmPassword': draft.confirmPassword,
      'newPassword': draft.newPassword,
      'oldPassword': draft.oldPassword,
    });
  }
}

Map<String, dynamic> _data(SdkWorkResourceResponse? response, String what) {
  final Object? data = response?.data;
  if (data is! Map) {
    throw StateError('The $what response carried no data object.');
  }
  // The envelope puts a single resource under `item`; accept a bare object too so a
  // contract change on one side does not blank the screen.
  final Object? item = data['item'];
  return Map<String, dynamic>.from(item is Map ? item : data);
}

IamFlutterMobileUserProfile _profileFrom(Map<String, dynamic> record) {
  return IamFlutterMobileUserProfile(
    displayName: _readString(record['displayName']) ?? _readString(record['display_name']),
    email: _readString(record['email']),
    phone: _readString(record['phone']),
    userId: _readString(record['userId']) ?? _readString(record['user_id']) ?? _readString(record['id']),
  );
}

String? _readString(Object? value) {
  if (value is String) {
    final String trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }
  return null;
}
