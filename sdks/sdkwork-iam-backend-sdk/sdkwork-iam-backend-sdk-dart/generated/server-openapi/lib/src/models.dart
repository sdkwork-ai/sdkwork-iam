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

class IamInstallationEnvironment {
  final String? environmentId;
  final String? tenantId;
  final String? organizationId;
  final String? installationId;
  final String? environmentKey;
  final String? primaryDomain;
  final Map<String, dynamic>? domainConfig;
  final String? status;
  final String? createdAt;
  final String? updatedAt;

  IamInstallationEnvironment({
    this.environmentId,
    this.tenantId,
    this.organizationId,
    this.installationId,
    this.environmentKey,
    this.primaryDomain,
    this.domainConfig,
    this.status,
    this.createdAt,
    this.updatedAt
  });

  factory IamInstallationEnvironment.fromJson(Map<String, dynamic> json) {
    return IamInstallationEnvironment(
      environmentId: json['environmentId']?.toString(),
      tenantId: json['tenantId']?.toString(),
      organizationId: json['organizationId']?.toString(),
      installationId: json['installationId']?.toString(),
      environmentKey: json['environmentKey']?.toString(),
      primaryDomain: json['primaryDomain']?.toString(),
      domainConfig: _sdkworkAsMap(json['domainConfig']),
      status: json['status']?.toString(),
      createdAt: json['createdAt']?.toString(),
      updatedAt: json['updatedAt']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'environmentId': environmentId,
      'tenantId': tenantId,
      'organizationId': organizationId,
      'installationId': installationId,
      'environmentKey': environmentKey,
      'primaryDomain': primaryDomain,
      'domainConfig': domainConfig,
      'status': status,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}

class IamInstallationEnvironmentUpsertCommand {
  final String? environmentKey;
  final String? primaryDomain;
  final Map<String, dynamic>? domainConfig;
  final String? status;

  IamInstallationEnvironmentUpsertCommand({
    this.environmentKey,
    this.primaryDomain,
    this.domainConfig,
    this.status
  });

  factory IamInstallationEnvironmentUpsertCommand.fromJson(Map<String, dynamic> json) {
    return IamInstallationEnvironmentUpsertCommand(
      environmentKey: json['environmentKey']?.toString(),
      primaryDomain: json['primaryDomain']?.toString(),
      domainConfig: _sdkworkAsMap(json['domainConfig']),
      status: json['status']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'environmentKey': environmentKey,
      'primaryDomain': primaryDomain,
      'domainConfig': domainConfig,
      'status': status,
    };
  }
}

class IamInstallationCredential {
  final String? credentialId;
  final String? tenantId;
  final String? installationEnvironmentId;
  final String? environmentKey;
  final String? clientId;
  final List<String>? redirectUris;
  final List<String>? grantedScopes;
  final String? status;
  final String? rotatedAt;
  final String? retiredAt;
  final String? createdAt;
  final String? updatedAt;

  IamInstallationCredential({
    this.credentialId,
    this.tenantId,
    this.installationEnvironmentId,
    this.environmentKey,
    this.clientId,
    this.redirectUris,
    this.grantedScopes,
    this.status,
    this.rotatedAt,
    this.retiredAt,
    this.createdAt,
    this.updatedAt
  });

  factory IamInstallationCredential.fromJson(Map<String, dynamic> json) {
    return IamInstallationCredential(
      credentialId: json['credentialId']?.toString(),
      tenantId: json['tenantId']?.toString(),
      installationEnvironmentId: json['installationEnvironmentId']?.toString(),
      environmentKey: json['environmentKey']?.toString(),
      clientId: json['clientId']?.toString(),
      redirectUris: (() {
        final list = _sdkworkAsList(json['redirectUris']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      grantedScopes: (() {
        final list = _sdkworkAsList(json['grantedScopes']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      status: json['status']?.toString(),
      rotatedAt: json['rotatedAt']?.toString(),
      retiredAt: json['retiredAt']?.toString(),
      createdAt: json['createdAt']?.toString(),
      updatedAt: json['updatedAt']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'credentialId': credentialId,
      'tenantId': tenantId,
      'installationEnvironmentId': installationEnvironmentId,
      'environmentKey': environmentKey,
      'clientId': clientId,
      'redirectUris': redirectUris?.map((item) => item).toList(),
      'grantedScopes': grantedScopes?.map((item) => item).toList(),
      'status': status,
      'rotatedAt': rotatedAt,
      'retiredAt': retiredAt,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}

class IamInstallationCredentialWithSecret {
  final String? credentialId;
  final String? tenantId;
  final String? installationEnvironmentId;
  final String? environmentKey;
  final String? clientId;
  final String? clientSecret;
  final List<String>? redirectUris;
  final List<String>? grantedScopes;
  final String? status;
  final String? rotatedAt;
  final String? retiredAt;
  final String? createdAt;
  final String? updatedAt;

  IamInstallationCredentialWithSecret({
    this.credentialId,
    this.tenantId,
    this.installationEnvironmentId,
    this.environmentKey,
    this.clientId,
    this.clientSecret,
    this.redirectUris,
    this.grantedScopes,
    this.status,
    this.rotatedAt,
    this.retiredAt,
    this.createdAt,
    this.updatedAt
  });

  factory IamInstallationCredentialWithSecret.fromJson(Map<String, dynamic> json) {
    return IamInstallationCredentialWithSecret(
      credentialId: json['credentialId']?.toString(),
      tenantId: json['tenantId']?.toString(),
      installationEnvironmentId: json['installationEnvironmentId']?.toString(),
      environmentKey: json['environmentKey']?.toString(),
      clientId: json['clientId']?.toString(),
      clientSecret: json['clientSecret']?.toString(),
      redirectUris: (() {
        final list = _sdkworkAsList(json['redirectUris']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      grantedScopes: (() {
        final list = _sdkworkAsList(json['grantedScopes']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      status: json['status']?.toString(),
      rotatedAt: json['rotatedAt']?.toString(),
      retiredAt: json['retiredAt']?.toString(),
      createdAt: json['createdAt']?.toString(),
      updatedAt: json['updatedAt']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'credentialId': credentialId,
      'tenantId': tenantId,
      'installationEnvironmentId': installationEnvironmentId,
      'environmentKey': environmentKey,
      'clientId': clientId,
      'clientSecret': clientSecret,
      'redirectUris': redirectUris?.map((item) => item).toList(),
      'grantedScopes': grantedScopes?.map((item) => item).toList(),
      'status': status,
      'rotatedAt': rotatedAt,
      'retiredAt': retiredAt,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}

class IamInstallationCredentialCreateCommand {
  final String? environmentKey;
  final String? clientId;
  final List<String>? redirectUris;
  final List<String>? grantedScopes;

  IamInstallationCredentialCreateCommand({
    this.environmentKey,
    this.clientId,
    this.redirectUris,
    this.grantedScopes
  });

  factory IamInstallationCredentialCreateCommand.fromJson(Map<String, dynamic> json) {
    return IamInstallationCredentialCreateCommand(
      environmentKey: json['environmentKey']?.toString(),
      clientId: json['clientId']?.toString(),
      redirectUris: (() {
        final list = _sdkworkAsList(json['redirectUris']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      grantedScopes: (() {
        final list = _sdkworkAsList(json['grantedScopes']);
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
      'environmentKey': environmentKey,
      'clientId': clientId,
      'redirectUris': redirectUris?.map((item) => item).toList(),
      'grantedScopes': grantedScopes?.map((item) => item).toList(),
    };
  }
}

class IamInstallationCredentialRotateCommand {
  final String? clientId;

  IamInstallationCredentialRotateCommand({
    this.clientId
  });

  factory IamInstallationCredentialRotateCommand.fromJson(Map<String, dynamic> json) {
    return IamInstallationCredentialRotateCommand(
      clientId: json['clientId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'clientId': clientId,
    };
  }
}

class IamInstallationEnvironmentListResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  IamInstallationEnvironmentListResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory IamInstallationEnvironmentListResponse.fromJson(Map<String, dynamic> json) {
    return IamInstallationEnvironmentListResponse(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
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

class IamInstallationEnvironmentResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  IamInstallationEnvironmentResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory IamInstallationEnvironmentResponse.fromJson(Map<String, dynamic> json) {
    return IamInstallationEnvironmentResponse(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
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

class IamInstallationCredentialResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  IamInstallationCredentialResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory IamInstallationCredentialResponse.fromJson(Map<String, dynamic> json) {
    return IamInstallationCredentialResponse(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
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

class IamInstallationCredentialListResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  IamInstallationCredentialListResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory IamInstallationCredentialListResponse.fromJson(Map<String, dynamic> json) {
    return IamInstallationCredentialListResponse(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
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

class IamInstallationManagementProvisionCommand {
  final String? organizationId;
  final String? instanceKey;
  final String? displayName;
  final String? environment;
  final String? applicationType;
  final String? primaryDomain;
  final List<String>? accessPermissions;
  final Map<String, dynamic>? runtimeConfig;
  final String? deployApplicationId;
  final String? ownershipScope;
  final String? ownerUserId;
  final String? provisioningIdempotencyKey;

  IamInstallationManagementProvisionCommand({
    this.organizationId,
    this.instanceKey,
    this.displayName,
    this.environment,
    this.applicationType,
    this.primaryDomain,
    this.accessPermissions,
    this.runtimeConfig,
    this.deployApplicationId,
    this.ownershipScope,
    this.ownerUserId,
    this.provisioningIdempotencyKey
  });

  factory IamInstallationManagementProvisionCommand.fromJson(Map<String, dynamic> json) {
    return IamInstallationManagementProvisionCommand(
      organizationId: json['organizationId']?.toString(),
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
      runtimeConfig: _sdkworkAsMap(json['runtimeConfig']),
      deployApplicationId: json['deployApplicationId']?.toString(),
      ownershipScope: json['ownershipScope']?.toString(),
      ownerUserId: json['ownerUserId']?.toString(),
      provisioningIdempotencyKey: json['provisioningIdempotencyKey']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'organizationId': organizationId,
      'instanceKey': instanceKey,
      'displayName': displayName,
      'environment': environment,
      'applicationType': applicationType,
      'primaryDomain': primaryDomain,
      'accessPermissions': accessPermissions?.map((item) => item).toList(),
      'runtimeConfig': runtimeConfig,
      'deployApplicationId': deployApplicationId,
      'ownershipScope': ownershipScope,
      'ownerUserId': ownerUserId,
      'provisioningIdempotencyKey': provisioningIdempotencyKey,
    };
  }
}

class IamInstallationManagementUpdateCommand {
  final String? primaryDomain;
  final List<String>? accessPermissions;

  IamInstallationManagementUpdateCommand({
    this.primaryDomain,
    this.accessPermissions
  });

  factory IamInstallationManagementUpdateCommand.fromJson(Map<String, dynamic> json) {
    return IamInstallationManagementUpdateCommand(
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

class IamInstallationStatusCommand {


  IamInstallationStatusCommand();

  factory IamInstallationStatusCommand.fromJson(Map<String, dynamic> json) {
    return IamInstallationStatusCommand();
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{};
  }
}

class AppbaseInstallationProvisionCommand {
  final String? authToken;
  final String? username;
  final String? email;
  final String? phone;
  final String? password;
  final String? tenantId;
  final String? organizationId;
  final String? instanceKey;
  final String? displayName;
  final String? environment;
  final String? applicationType;
  final String? primaryDomain;
  final List<String>? accessPermissions;
  final Map<String, dynamic>? runtimeConfig;
  final String? deployApplicationId;
  final String? ownershipScope;
  final String? ownerUserId;
  final String? provisioningIdempotencyKey;

  AppbaseInstallationProvisionCommand({
    this.authToken,
    this.username,
    this.email,
    this.phone,
    this.password,
    this.tenantId,
    this.organizationId,
    this.instanceKey,
    this.displayName,
    this.environment,
    this.applicationType,
    this.primaryDomain,
    this.accessPermissions,
    this.runtimeConfig,
    this.deployApplicationId,
    this.ownershipScope,
    this.ownerUserId,
    this.provisioningIdempotencyKey
  });

  factory AppbaseInstallationProvisionCommand.fromJson(Map<String, dynamic> json) {
    return AppbaseInstallationProvisionCommand(
      authToken: json['authToken']?.toString(),
      username: json['username']?.toString(),
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
      password: json['password']?.toString(),
      tenantId: json['tenantId']?.toString(),
      organizationId: json['organizationId']?.toString(),
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
      runtimeConfig: _sdkworkAsMap(json['runtimeConfig']),
      deployApplicationId: json['deployApplicationId']?.toString(),
      ownershipScope: json['ownershipScope']?.toString(),
      ownerUserId: json['ownerUserId']?.toString(),
      provisioningIdempotencyKey: json['provisioningIdempotencyKey']?.toString()
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
      'instanceKey': instanceKey,
      'displayName': displayName,
      'environment': environment,
      'applicationType': applicationType,
      'primaryDomain': primaryDomain,
      'accessPermissions': accessPermissions?.map((item) => item).toList(),
      'runtimeConfig': runtimeConfig,
      'deployApplicationId': deployApplicationId,
      'ownershipScope': ownershipScope,
      'ownerUserId': ownerUserId,
      'provisioningIdempotencyKey': provisioningIdempotencyKey,
    };
  }
}

class AppbaseInstallationUpdateCommand {
  final String? authToken;
  final String? username;
  final String? email;
  final String? phone;
  final String? password;
  final String? primaryDomain;
  final Map<String, dynamic>? domainConfig;
  final List<String>? accessPermissions;
  final Map<String, dynamic>? runtimeConfig;

  AppbaseInstallationUpdateCommand({
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

  factory AppbaseInstallationUpdateCommand.fromJson(Map<String, dynamic> json) {
    return AppbaseInstallationUpdateCommand(
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

class AppbaseInstallationEnableCommand {
  final String? authToken;
  final String? username;
  final String? email;
  final String? phone;
  final String? password;

  AppbaseInstallationEnableCommand({
    this.authToken,
    this.username,
    this.email,
    this.phone,
    this.password
  });

  factory AppbaseInstallationEnableCommand.fromJson(Map<String, dynamic> json) {
    return AppbaseInstallationEnableCommand(
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
  final String? installationId;
  final String? appId;
  final String? instanceKey;
  final String? ownershipScope;

  AppbaseAccessCredentialCreateCommand({
    this.authToken,
    this.username,
    this.email,
    this.phone,
    this.password,
    this.tenantId,
    this.organizationId,
    this.installationId,
    this.appId,
    this.instanceKey,
    this.ownershipScope
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
      installationId: json['installationId']?.toString(),
      appId: json['appId']?.toString(),
      instanceKey: json['instanceKey']?.toString(),
      ownershipScope: json['ownershipScope']?.toString()
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
      'installationId': installationId,
      'appId': appId,
      'instanceKey': instanceKey,
      'ownershipScope': ownershipScope,
    };
  }
}

class ServiceAccountCredentialCreateCommand {
  final String? installationId;
  final String? expiresAt;

  ServiceAccountCredentialCreateCommand({
    this.installationId,
    this.expiresAt
  });

  factory ServiceAccountCredentialCreateCommand.fromJson(Map<String, dynamic> json) {
    return ServiceAccountCredentialCreateCommand(
      installationId: json['installationId']?.toString(),
      expiresAt: json['expiresAt']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'installationId': installationId,
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
