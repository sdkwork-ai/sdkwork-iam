// SDKWORK-IAM-FLUTTER-SHELL: authored capability adapter.
/**
 * App-api implementation of the console tenant capability's data port.
 *
 * The console reads the same resources as the app tenant screen plus the binding policy
 * the app screen never shows, which is the whole reason an operator opens it.
 */

import 'package:sdkwork_iam_app_sdk/sdkwork_iam_app_sdk.dart';
import 'package:sdkwork_iam_flutter_mobile_console_tenant/sdkwork_iam_flutter_mobile_console_tenant.dart';

import '../bootstrap/sdk_clients.dart';

/// Reads the console tenant workspace from the app-api.
class IamConsoleTenantAppSdkDataSource implements IamFlutterMobileConsoleTenantDataSource {
  /// Creates the adapter. A client may be injected for tests.
  IamConsoleTenantAppSdkDataSource({SdkworkAppClient? client})
      : _client = client ?? getSdkClients().iamFlutterMobileCore;

  final SdkworkAppClient _client;

  @override
  Future<IamFlutterMobileConsoleTenantRuntime> loadRuntime() async {
    final SdkWorkResourceResponse? response = await _client.system.iamRuntimeRetrieve();
    final Map<String, dynamic> body = _data(response, 'iam runtime');
    return IamFlutterMobileConsoleTenantRuntime(
      environment: _readString(body['environment']),
      tenantId: _readString(body['tenantId']) ?? _readString(body['tenant_id']),
      userId: _readString(body['userId']) ?? _readString(body['user_id']),
    );
  }

  @override
  Future<IamFlutterMobileConsoleTenantPolicy> loadPolicy() async {
    // A deployment may not publish the policy at all; that is not a reason to lose the
    // workspace, so an absent answer reads as "nothing enabled".
    try {
      final SdkWorkResourceResponse? response =
          await _client.system.iamAccountBindingPolicyRetrieve();
      final Map<String, dynamic> body = _data(response, 'account binding policy');
      final Map<String, dynamic> contact = _readMap(body['contactBinding']);
      final Map<String, dynamic> oauth = _readMap(body['oauthBinding']);
      return IamFlutterMobileConsoleTenantPolicy(
        contactEnabled: contact['enabled'] == true,
        emailEnabled: contact['emailEnabled'] == true,
        oauthEnabled: oauth['enabled'] == true,
        // Absent means "not granted": silence must not read as permission to remove a
        // sign-in method.
        selfServiceUnlinkEnabled: oauth['selfServiceLinkEnabled'] == true ||
            oauth['selfServiceUnlinkEnabled'] == true,
      );
    } catch (_) {
      return const IamFlutterMobileConsoleTenantPolicy();
    }
  }

  @override
  Future<IamFlutterMobileConsoleTenantOrganizationPage> fetchOrganizationsPage({
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

    final List<IamFlutterMobileConsoleTenantOrganization> rows =
        <IamFlutterMobileConsoleTenantOrganization>[];
    for (final Object? item in items) {
      if (item is! Map) continue;
      final Map<String, dynamic> record = Map<String, dynamic>.from(item);
      final String? organizationId = _readString(record['organizationId']) ??
          _readString(record['organization_id']) ??
          _readString(record['id']);
      if (organizationId == null) continue;
      final String? parentId = _readString(record['parentId']) ?? _readString(record['parent_id']);
      rows.add(
        IamFlutterMobileConsoleTenantOrganization(
          detail: parentId == null ? organizationId : '$organizationId · $parentId',
          id: _readString(record['id']) ?? organizationId,
          title: _readString(record['name']) ?? organizationId,
        ),
      );
    }
    return IamFlutterMobileConsoleTenantOrganizationPage(
      hasMore: pageInfo['hasMore'] == true,
      items: rows,
    );
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
