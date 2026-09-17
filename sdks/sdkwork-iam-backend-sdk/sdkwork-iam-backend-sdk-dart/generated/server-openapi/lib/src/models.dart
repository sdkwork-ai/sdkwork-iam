Map<String, dynamic>? _sdkworkAsMap(dynamic value) {
  if (value is Map<String, dynamic>) {
    return value;
  }
  if (value is Map) {
    return value.map((key, item) => MapEntry(key.toString(), item));
  }
  return null;
}

List<dynamic>? _sdkworkAsList(dynamic value) {
  return value is List ? value : null;
}

class SdkWorkApiResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SdkWorkApiResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SdkWorkApiResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkApiResponse(
      code: json['code'] is int ? json['code'] : null,
      data: json['data'],
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SdkWorkResourceData {
  final Map<String, dynamic>? item;

  SdkWorkResourceData({
    this.item
  });

  factory SdkWorkResourceData.fromJson(Map<String, dynamic> json) {
    return SdkWorkResourceData(
      item: _sdkworkAsMap(json['item'])
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item,
    };
  }
}

class SdkWorkPageData {
  final List<Map<String, dynamic>>? items;
  final PageInfo? pageInfo;

  SdkWorkPageData({
    this.items,
    this.pageInfo
  });

  factory SdkWorkPageData.fromJson(Map<String, dynamic> json) {
    return SdkWorkPageData(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => _sdkworkAsMap(item))
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        return map == null ? null : PageInfo.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items?.map((item) => item).toList(),
      'pageInfo': pageInfo?.toJson(),
    };
  }
}

class SdkWorkCommandData {
  final bool? accepted;
  final String? resourceId;
  final String? status;

  SdkWorkCommandData({
    this.accepted,
    this.resourceId,
    this.status
  });

  factory SdkWorkCommandData.fromJson(Map<String, dynamic> json) {
    return SdkWorkCommandData(
      accepted: json['accepted'] is bool ? json['accepted'] : null,
      resourceId: json['resourceId']?.toString(),
      status: json['status']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accepted': accepted,
      'resourceId': resourceId,
      'status': status,
    };
  }
}

class PageInfo {
  final String? mode;
  final int? page;
  final int? pageSize;
  final String? totalItems;
  final int? totalPages;
  final String? nextCursor;
  final bool? hasMore;

  PageInfo({
    this.mode,
    this.page,
    this.pageSize,
    this.totalItems,
    this.totalPages,
    this.nextCursor,
    this.hasMore
  });

  factory PageInfo.fromJson(Map<String, dynamic> json) {
    return PageInfo(
      mode: json['mode']?.toString(),
      page: json['page'] is int ? json['page'] : null,
      pageSize: json['pageSize'] is int ? json['pageSize'] : null,
      totalItems: json['totalItems']?.toString(),
      totalPages: json['totalPages'] is int ? json['totalPages'] : null,
      nextCursor: json['nextCursor']?.toString(),
      hasMore: json['hasMore'] is bool ? json['hasMore'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'mode': mode,
      'page': page,
      'pageSize': pageSize,
      'totalItems': totalItems,
      'totalPages': totalPages,
      'nextCursor': nextCursor,
      'hasMore': hasMore,
    };
  }
}

class ProblemDetail {
  final String? type;
  final String? title;
  final int? status;
  final String? detail;
  final String? instance;
  final int? code;
  final String? traceId;
  final String? i18nKey;
  final String? locale;
  final List<FieldError>? errors;

  ProblemDetail({
    this.type,
    this.title,
    this.status,
    this.detail,
    this.instance,
    this.code,
    this.traceId,
    this.i18nKey,
    this.locale,
    this.errors
  });

  factory ProblemDetail.fromJson(Map<String, dynamic> json) {
    return ProblemDetail(
      type: json['type']?.toString(),
      title: json['title']?.toString(),
      status: json['status'] is int ? json['status'] : null,
      detail: json['detail']?.toString(),
      instance: json['instance']?.toString(),
      code: json['code'] is int ? json['code'] : null,
      traceId: json['traceId']?.toString(),
      i18nKey: json['i18nKey']?.toString(),
      locale: json['locale']?.toString(),
      errors: (() {
        final list = _sdkworkAsList(json['errors']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : FieldError.fromJson(map);
      })())
            .whereType<FieldError>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'type': type,
      'title': title,
      'status': status,
      'detail': detail,
      'instance': instance,
      'code': code,
      'traceId': traceId,
      'i18nKey': i18nKey,
      'locale': locale,
      'errors': errors?.map((item) => item.toJson()).toList(),
    };
  }
}

class FieldError {
  final String? field;
  final String? message;
  final int? code;
  final String? i18nKey;
  final Map<String, dynamic>? params;

  FieldError({
    this.field,
    this.message,
    this.code,
    this.i18nKey,
    this.params
  });

  factory FieldError.fromJson(Map<String, dynamic> json) {
    return FieldError(
      field: json['field']?.toString(),
      message: json['message']?.toString(),
      code: json['code'] is int ? json['code'] : null,
      i18nKey: json['i18nKey']?.toString(),
      params: (() {
        final map = _sdkworkAsMap(json['params']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'field': field,
      'message': message,
      'code': code,
      'i18nKey': i18nKey,
      'params': params?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class SdkWorkResourceResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SdkWorkResourceResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SdkWorkResourceResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkResourceResponse(
      code: json['code'] is int ? json['code'] : null,
      data: json['data'],
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SdkWorkListResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SdkWorkListResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SdkWorkListResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkListResponse(
      code: json['code'] is int ? json['code'] : null,
      data: json['data'],
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SdkWorkCommandResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SdkWorkCommandResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SdkWorkCommandResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkCommandResponse(
      code: json['code'] is int ? json['code'] : null,
      data: json['data'],
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class IamOauthClientCreateCommand {
  final String? integrationId;
  final String? providerCode;
  final String? clientCode;
  final String? displayName;
  final String? providerClientId;
  final String? providerTenantId;

  IamOauthClientCreateCommand({
    this.integrationId,
    this.providerCode,
    this.clientCode,
    this.displayName,
    this.providerClientId,
    this.providerTenantId
  });

  factory IamOauthClientCreateCommand.fromJson(Map<String, dynamic> json) {
    return IamOauthClientCreateCommand(
      integrationId: json['integrationId']?.toString(),
      providerCode: json['providerCode']?.toString(),
      clientCode: json['clientCode']?.toString(),
      displayName: json['displayName']?.toString(),
      providerClientId: json['providerClientId']?.toString(),
      providerTenantId: json['providerTenantId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'integrationId': integrationId,
      'providerCode': providerCode,
      'clientCode': clientCode,
      'displayName': displayName,
      'providerClientId': providerClientId,
      'providerTenantId': providerTenantId,
    };
  }
}

class AppbaseApplicationRegisterCommand {
  final String? authToken;
  final String? username;
  final String? email;
  final String? phone;
  final String? password;
  final String? ownerTenantId;
  final String? appKey;
  final String? name;
  final String? displayName;
  final String? appType;
  final String? packageName;
  final String? bundleId;
  final String? desktopAppId;
  final String? version;
  final String? channel;
  final String? manifestHash;
  final List<String>? defaultAccessPermissions;
  final Map<String, dynamic>? config;
  final List<Map<String, dynamic>>? packages;

  AppbaseApplicationRegisterCommand({
    this.authToken,
    this.username,
    this.email,
    this.phone,
    this.password,
    this.ownerTenantId,
    this.appKey,
    this.name,
    this.displayName,
    this.appType,
    this.packageName,
    this.bundleId,
    this.desktopAppId,
    this.version,
    this.channel,
    this.manifestHash,
    this.defaultAccessPermissions,
    this.config,
    this.packages
  });

  factory AppbaseApplicationRegisterCommand.fromJson(Map<String, dynamic> json) {
    return AppbaseApplicationRegisterCommand(
      authToken: json['authToken']?.toString(),
      username: json['username']?.toString(),
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
      password: json['password']?.toString(),
      ownerTenantId: json['ownerTenantId']?.toString(),
      appKey: json['appKey']?.toString(),
      name: json['name']?.toString(),
      displayName: json['displayName']?.toString(),
      appType: json['appType']?.toString(),
      packageName: json['packageName']?.toString(),
      bundleId: json['bundleId']?.toString(),
      desktopAppId: json['desktopAppId']?.toString(),
      version: json['version']?.toString(),
      channel: json['channel']?.toString(),
      manifestHash: json['manifestHash']?.toString(),
      defaultAccessPermissions: (() {
        final list = _sdkworkAsList(json['defaultAccessPermissions']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      config: _sdkworkAsMap(json['config']),
      packages: (() {
        final list = _sdkworkAsList(json['packages']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => _sdkworkAsMap(item))
            .whereType<Map<String, dynamic>>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'authToken': authToken,
      'username': username,
      'email': email,
      'phone': phone,
      'password': password,
      'ownerTenantId': ownerTenantId,
      'appKey': appKey,
      'name': name,
      'displayName': displayName,
      'appType': appType,
      'packageName': packageName,
      'bundleId': bundleId,
      'desktopAppId': desktopAppId,
      'version': version,
      'channel': channel,
      'manifestHash': manifestHash,
      'defaultAccessPermissions': defaultAccessPermissions?.map((item) => item).toList(),
      'config': config,
      'packages': packages?.map((item) => item).toList(),
    };
  }
}

class IamTenantApplicationManagementProvisionCommand {
  final String? organizationId;
  final String? templateId;
  final String? appKey;
  final String? instanceKey;
  final String? displayName;
  final String? environment;
  final String? applicationType;
  final String? primaryDomain;
  final List<String>? accessPermissions;

  IamTenantApplicationManagementProvisionCommand({
    this.organizationId,
    this.templateId,
    this.appKey,
    this.instanceKey,
    this.displayName,
    this.environment,
    this.applicationType,
    this.primaryDomain,
    this.accessPermissions
  });

  factory IamTenantApplicationManagementProvisionCommand.fromJson(Map<String, dynamic> json) {
    return IamTenantApplicationManagementProvisionCommand(
      organizationId: json['organizationId']?.toString(),
      templateId: json['templateId']?.toString(),
      appKey: json['appKey']?.toString(),
      instanceKey: json['instanceKey']?.toString(),
      displayName: json['displayName']?.toString(),
      environment: json['environment']?.toString(),
      applicationType: json['applicationType']?.toString(),
      primaryDomain: json['primaryDomain']?.toString(),
      accessPermissions: (() {
        final list = _sdkworkAsList(json['accessPermissions']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'organizationId': organizationId,
      'templateId': templateId,
      'appKey': appKey,
      'instanceKey': instanceKey,
      'displayName': displayName,
      'environment': environment,
      'applicationType': applicationType,
      'primaryDomain': primaryDomain,
      'accessPermissions': accessPermissions?.map((item) => item).toList(),
    };
  }
}

class IamTenantApplicationManagementUpdateCommand {
  final String? primaryDomain;
  final List<String>? accessPermissions;

  IamTenantApplicationManagementUpdateCommand({
    this.primaryDomain,
    this.accessPermissions
  });

  factory IamTenantApplicationManagementUpdateCommand.fromJson(Map<String, dynamic> json) {
    return IamTenantApplicationManagementUpdateCommand(
      primaryDomain: json['primaryDomain']?.toString(),
      accessPermissions: (() {
        final list = _sdkworkAsList(json['accessPermissions']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'primaryDomain': primaryDomain,
      'accessPermissions': accessPermissions?.map((item) => item).toList(),
    };
  }
}

class IamTenantApplicationStatusCommand {


  IamTenantApplicationStatusCommand();

  factory IamTenantApplicationStatusCommand.fromJson(Map<String, dynamic> json) {
    return IamTenantApplicationStatusCommand();
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{};
  }
}

class AppbaseTenantApplicationProvisionCommand {
  final String? authToken;
  final String? username;
  final String? email;
  final String? phone;
  final String? password;
  final String? tenantId;
  final String? organizationId;
  final String? templateId;
  final String? appKey;
  final String? instanceKey;
  final String? displayName;
  final String? environment;
  final String? applicationType;
  final String? primaryDomain;
  final List<String>? accessPermissions;
  final Map<String, dynamic>? runtimeConfig;

  AppbaseTenantApplicationProvisionCommand({
    this.authToken,
    this.username,
    this.email,
    this.phone,
    this.password,
    this.tenantId,
    this.organizationId,
    this.templateId,
    this.appKey,
    this.instanceKey,
    this.displayName,
    this.environment,
    this.applicationType,
    this.primaryDomain,
    this.accessPermissions,
    this.runtimeConfig
  });

  factory AppbaseTenantApplicationProvisionCommand.fromJson(Map<String, dynamic> json) {
    return AppbaseTenantApplicationProvisionCommand(
      authToken: json['authToken']?.toString(),
      username: json['username']?.toString(),
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
      password: json['password']?.toString(),
      tenantId: json['tenantId']?.toString(),
      organizationId: json['organizationId']?.toString(),
      templateId: json['templateId']?.toString(),
      appKey: json['appKey']?.toString(),
      instanceKey: json['instanceKey']?.toString(),
      displayName: json['displayName']?.toString(),
      environment: json['environment']?.toString(),
      applicationType: json['applicationType']?.toString(),
      primaryDomain: json['primaryDomain']?.toString(),
      accessPermissions: (() {
        final list = _sdkworkAsList(json['accessPermissions']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      runtimeConfig: _sdkworkAsMap(json['runtimeConfig'])
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'authToken': authToken,
      'username': username,
      'email': email,
      'phone': phone,
      'password': password,
      'tenantId': tenantId,
      'organizationId': organizationId,
      'templateId': templateId,
      'appKey': appKey,
      'instanceKey': instanceKey,
      'displayName': displayName,
      'environment': environment,
      'applicationType': applicationType,
      'primaryDomain': primaryDomain,
      'accessPermissions': accessPermissions?.map((item) => item).toList(),
      'runtimeConfig': runtimeConfig,
    };
  }
}

class AppbaseTenantApplicationUpdateCommand {
  final String? authToken;
  final String? username;
  final String? email;
  final String? phone;
  final String? password;
  final String? primaryDomain;
  final Map<String, dynamic>? domainConfig;
  final List<String>? accessPermissions;
  final Map<String, dynamic>? runtimeConfig;

  AppbaseTenantApplicationUpdateCommand({
    this.authToken,
    this.username,
    this.email,
    this.phone,
    this.password,
    this.primaryDomain,
    this.domainConfig,
    this.accessPermissions,
    this.runtimeConfig
  });

  factory AppbaseTenantApplicationUpdateCommand.fromJson(Map<String, dynamic> json) {
    return AppbaseTenantApplicationUpdateCommand(
      authToken: json['authToken']?.toString(),
      username: json['username']?.toString(),
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
      password: json['password']?.toString(),
      primaryDomain: json['primaryDomain']?.toString(),
      domainConfig: _sdkworkAsMap(json['domainConfig']),
      accessPermissions: (() {
        final list = _sdkworkAsList(json['accessPermissions']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      runtimeConfig: _sdkworkAsMap(json['runtimeConfig'])
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'authToken': authToken,
      'username': username,
      'email': email,
      'phone': phone,
      'password': password,
      'primaryDomain': primaryDomain,
      'domainConfig': domainConfig,
      'accessPermissions': accessPermissions?.map((item) => item).toList(),
      'runtimeConfig': runtimeConfig,
    };
  }
}

class AppbaseTenantApplicationEnableCommand {
  final String? authToken;
  final String? username;
  final String? email;
  final String? phone;
  final String? password;

  AppbaseTenantApplicationEnableCommand({
    this.authToken,
    this.username,
    this.email,
    this.phone,
    this.password
  });

  factory AppbaseTenantApplicationEnableCommand.fromJson(Map<String, dynamic> json) {
    return AppbaseTenantApplicationEnableCommand(
      authToken: json['authToken']?.toString(),
      username: json['username']?.toString(),
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
      password: json['password']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'authToken': authToken,
      'username': username,
      'email': email,
      'phone': phone,
      'password': password,
    };
  }
}

class AppbaseAccessCredentialCreateCommand {
  final String? authToken;
  final String? username;
  final String? email;
  final String? phone;
  final String? password;
  final String? tenantId;
  final String? organizationId;
  final String? tenantApplicationId;
  final String? appId;
  final String? instanceKey;

  AppbaseAccessCredentialCreateCommand({
    this.authToken,
    this.username,
    this.email,
    this.phone,
    this.password,
    this.tenantId,
    this.organizationId,
    this.tenantApplicationId,
    this.appId,
    this.instanceKey
  });

  factory AppbaseAccessCredentialCreateCommand.fromJson(Map<String, dynamic> json) {
    return AppbaseAccessCredentialCreateCommand(
      authToken: json['authToken']?.toString(),
      username: json['username']?.toString(),
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
      password: json['password']?.toString(),
      tenantId: json['tenantId']?.toString(),
      organizationId: json['organizationId']?.toString(),
      tenantApplicationId: json['tenantApplicationId']?.toString(),
      appId: json['appId']?.toString(),
      instanceKey: json['instanceKey']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'authToken': authToken,
      'username': username,
      'email': email,
      'phone': phone,
      'password': password,
      'tenantId': tenantId,
      'organizationId': organizationId,
      'tenantApplicationId': tenantApplicationId,
      'appId': appId,
      'instanceKey': instanceKey,
    };
  }
}

class ServiceAccountCredentialCreateCommand {
  final String? tenantApplicationId;
  final String? expiresAt;

  ServiceAccountCredentialCreateCommand({
    this.tenantApplicationId,
    this.expiresAt
  });

  factory ServiceAccountCredentialCreateCommand.fromJson(Map<String, dynamic> json) {
    return ServiceAccountCredentialCreateCommand(
      tenantApplicationId: json['tenantApplicationId']?.toString(),
      expiresAt: json['expiresAt']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'tenantApplicationId': tenantApplicationId,
      'expiresAt': expiresAt,
    };
  }
}

class ServiceAccountCredentialRevokeCommand {


  ServiceAccountCredentialRevokeCommand();

  factory ServiceAccountCredentialRevokeCommand.fromJson(Map<String, dynamic> json) {
    return ServiceAccountCredentialRevokeCommand();
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{};
  }
}

class ServiceAccountTokenExchangeCommand {
  final String? clientId;
  final String? clientSecret;

  ServiceAccountTokenExchangeCommand({
    this.clientId,
    this.clientSecret
  });

  factory ServiceAccountTokenExchangeCommand.fromJson(Map<String, dynamic> json) {
    return ServiceAccountTokenExchangeCommand(
      clientId: json['clientId']?.toString(),
      clientSecret: json['clientSecret']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'clientId': clientId,
      'clientSecret': clientSecret,
    };
  }
}
