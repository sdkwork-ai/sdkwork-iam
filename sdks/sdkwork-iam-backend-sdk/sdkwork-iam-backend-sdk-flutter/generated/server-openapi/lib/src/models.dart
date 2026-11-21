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
  final int code;
  final dynamic data;
  final String traceId;

  SdkWorkApiResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SdkWorkApiResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkApiResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SdkWorkApiResponse.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SdkWorkApiResponse.traceId is required');
        }
        return value;
      })()
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
  final Map<String, dynamic> item;

  SdkWorkResourceData({
    required this.item
  });

  factory SdkWorkResourceData.fromJson(Map<String, dynamic> json) {
    return SdkWorkResourceData(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('SdkWorkResourceData.item is required');
        }
        return map;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item,
    };
  }
}

class SdkWorkPageData {
  final List<Map<String, dynamic>> items;
  final PageInfo pageInfo;

  SdkWorkPageData({
    required this.items,
    required this.pageInfo
  });

  factory SdkWorkPageData.fromJson(Map<String, dynamic> json) {
    return SdkWorkPageData(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('SdkWorkPageData.items is required');
        }
        return list
            .map((item) => _sdkworkAsMap(item))
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        if (map == null) {
          throw FormatException('SdkWorkPageData.pageInfo is required');
        }
        return PageInfo.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item).toList(),
      'pageInfo': pageInfo.toJson(),
    };
  }
}

class SdkWorkCommandData {
  final bool accepted;
  final String? resourceId;
  final String? status;

  SdkWorkCommandData({
    required this.accepted,
    this.resourceId,
    this.status
  });

  factory SdkWorkCommandData.fromJson(Map<String, dynamic> json) {
    return SdkWorkCommandData(
      accepted: (() {
        final value = json['accepted'];
        if (value is! bool) {
          throw FormatException('SdkWorkCommandData.accepted is required');
        }
        return value;
      })(),
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
  final String mode;
  final int? page;
  final int? pageSize;
  final String? totalItems;
  final int? totalPages;
  final String? nextCursor;
  final bool? hasMore;

  PageInfo({
    required this.mode,
    this.page,
    this.pageSize,
    this.totalItems,
    this.totalPages,
    this.nextCursor,
    this.hasMore
  });

  factory PageInfo.fromJson(Map<String, dynamic> json) {
    return PageInfo(
      mode: (() {
        final value = json['mode']?.toString();
        if (value == null) {
          throw FormatException('PageInfo.mode is required');
        }
        return value;
      })(),
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
  final String type;
  final String title;
  final int status;
  final String? detail;
  final String? instance;
  final int code;
  final String traceId;
  final String? i18nKey;
  final String? locale;
  final List<FieldError>? errors;

  ProblemDetail({
    required this.type,
    required this.title,
    required this.status,
    this.detail,
    this.instance,
    required this.code,
    required this.traceId,
    this.i18nKey,
    this.locale,
    this.errors
  });

  factory ProblemDetail.fromJson(Map<String, dynamic> json) {
    return ProblemDetail(
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('ProblemDetail.type is required');
        }
        return value;
      })(),
      title: (() {
        final value = json['title']?.toString();
        if (value == null) {
          throw FormatException('ProblemDetail.title is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status'];
        if (value is! int) {
          throw FormatException('ProblemDetail.status is required');
        }
        return value;
      })(),
      detail: json['detail']?.toString(),
      instance: json['instance']?.toString(),
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ProblemDetail.code is required');
        }
        return value;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ProblemDetail.traceId is required');
        }
        return value;
      })(),
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
  final String field;
  final String message;
  final int? code;
  final String? i18nKey;
  final Map<String, dynamic>? params;

  FieldError({
    required this.field,
    required this.message,
    this.code,
    this.i18nKey,
    this.params
  });

  factory FieldError.fromJson(Map<String, dynamic> json) {
    return FieldError(
      field: (() {
        final value = json['field']?.toString();
        if (value == null) {
          throw FormatException('FieldError.field is required');
        }
        return value;
      })(),
      message: (() {
        final value = json['message']?.toString();
        if (value == null) {
          throw FormatException('FieldError.message is required');
        }
        return value;
      })(),
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
  final int code;
  final dynamic data;
  final String traceId;

  SdkWorkResourceResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SdkWorkResourceResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkResourceResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SdkWorkResourceResponse.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SdkWorkResourceResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SdkWorkListResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SdkWorkListResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkListResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SdkWorkListResponse.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SdkWorkListResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SdkWorkCommandResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SdkWorkCommandResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkCommandResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SdkWorkCommandResponse.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SdkWorkCommandResponse.traceId is required');
        }
        return value;
      })()
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
  final String environmentId;
  final String tenantId;
  final String? organizationId;
  final String installationId;
  final String environmentKey;
  final String? primaryDomain;
  final Map<String, dynamic>? domainConfig;
  final String status;
  final String createdAt;
  final String updatedAt;

  IamInstallationEnvironment({
    required this.environmentId,
    required this.tenantId,
    this.organizationId,
    required this.installationId,
    required this.environmentKey,
    this.primaryDomain,
    this.domainConfig,
    required this.status,
    required this.createdAt,
    required this.updatedAt
  });

  factory IamInstallationEnvironment.fromJson(Map<String, dynamic> json) {
    return IamInstallationEnvironment(
      environmentId: (() {
        final value = json['environmentId']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationEnvironment.environmentId is required');
        }
        return value;
      })(),
      tenantId: (() {
        final value = json['tenantId']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationEnvironment.tenantId is required');
        }
        return value;
      })(),
      organizationId: json['organizationId']?.toString(),
      installationId: (() {
        final value = json['installationId']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationEnvironment.installationId is required');
        }
        return value;
      })(),
      environmentKey: (() {
        final value = json['environmentKey']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationEnvironment.environmentKey is required');
        }
        return value;
      })(),
      primaryDomain: json['primaryDomain']?.toString(),
      domainConfig: _sdkworkAsMap(json['domainConfig']),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationEnvironment.status is required');
        }
        return value;
      })(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationEnvironment.createdAt is required');
        }
        return value;
      })(),
      updatedAt: (() {
        final value = json['updatedAt']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationEnvironment.updatedAt is required');
        }
        return value;
      })()
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
  final String credentialId;
  final String tenantId;
  final String installationEnvironmentId;
  final String environmentKey;
  final String clientId;
  final List<String> redirectUris;
  final List<String> grantedScopes;
  final String status;
  final String? rotatedAt;
  final String? retiredAt;
  final String createdAt;
  final String updatedAt;

  IamInstallationCredential({
    required this.credentialId,
    required this.tenantId,
    required this.installationEnvironmentId,
    required this.environmentKey,
    required this.clientId,
    required this.redirectUris,
    required this.grantedScopes,
    required this.status,
    this.rotatedAt,
    this.retiredAt,
    required this.createdAt,
    required this.updatedAt
  });

  factory IamInstallationCredential.fromJson(Map<String, dynamic> json) {
    return IamInstallationCredential(
      credentialId: (() {
        final value = json['credentialId']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredential.credentialId is required');
        }
        return value;
      })(),
      tenantId: (() {
        final value = json['tenantId']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredential.tenantId is required');
        }
        return value;
      })(),
      installationEnvironmentId: (() {
        final value = json['installationEnvironmentId']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredential.installationEnvironmentId is required');
        }
        return value;
      })(),
      environmentKey: (() {
        final value = json['environmentKey']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredential.environmentKey is required');
        }
        return value;
      })(),
      clientId: (() {
        final value = json['clientId']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredential.clientId is required');
        }
        return value;
      })(),
      redirectUris: (() {
        final list = _sdkworkAsList(json['redirectUris']);
        if (list == null) {
          throw FormatException('IamInstallationCredential.redirectUris is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      grantedScopes: (() {
        final list = _sdkworkAsList(json['grantedScopes']);
        if (list == null) {
          throw FormatException('IamInstallationCredential.grantedScopes is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredential.status is required');
        }
        return value;
      })(),
      rotatedAt: json['rotatedAt']?.toString(),
      retiredAt: json['retiredAt']?.toString(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredential.createdAt is required');
        }
        return value;
      })(),
      updatedAt: (() {
        final value = json['updatedAt']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredential.updatedAt is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'credentialId': credentialId,
      'tenantId': tenantId,
      'installationEnvironmentId': installationEnvironmentId,
      'environmentKey': environmentKey,
      'clientId': clientId,
      'redirectUris': redirectUris.map((item) => item).toList(),
      'grantedScopes': grantedScopes.map((item) => item).toList(),
      'status': status,
      'rotatedAt': rotatedAt,
      'retiredAt': retiredAt,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}

class IamInstallationCredentialWithSecret {
  final String credentialId;
  final String tenantId;
  final String installationEnvironmentId;
  final String environmentKey;
  final String clientId;
  final String clientSecret;
  final List<String> redirectUris;
  final List<String> grantedScopes;
  final String status;
  final String? rotatedAt;
  final String? retiredAt;
  final String createdAt;
  final String updatedAt;

  IamInstallationCredentialWithSecret({
    required this.credentialId,
    required this.tenantId,
    required this.installationEnvironmentId,
    required this.environmentKey,
    required this.clientId,
    required this.clientSecret,
    required this.redirectUris,
    required this.grantedScopes,
    required this.status,
    this.rotatedAt,
    this.retiredAt,
    required this.createdAt,
    required this.updatedAt
  });

  factory IamInstallationCredentialWithSecret.fromJson(Map<String, dynamic> json) {
    return IamInstallationCredentialWithSecret(
      credentialId: (() {
        final value = json['credentialId']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredentialWithSecret.credentialId is required');
        }
        return value;
      })(),
      tenantId: (() {
        final value = json['tenantId']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredentialWithSecret.tenantId is required');
        }
        return value;
      })(),
      installationEnvironmentId: (() {
        final value = json['installationEnvironmentId']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredentialWithSecret.installationEnvironmentId is required');
        }
        return value;
      })(),
      environmentKey: (() {
        final value = json['environmentKey']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredentialWithSecret.environmentKey is required');
        }
        return value;
      })(),
      clientId: (() {
        final value = json['clientId']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredentialWithSecret.clientId is required');
        }
        return value;
      })(),
      clientSecret: (() {
        final value = json['clientSecret']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredentialWithSecret.clientSecret is required');
        }
        return value;
      })(),
      redirectUris: (() {
        final list = _sdkworkAsList(json['redirectUris']);
        if (list == null) {
          throw FormatException('IamInstallationCredentialWithSecret.redirectUris is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      grantedScopes: (() {
        final list = _sdkworkAsList(json['grantedScopes']);
        if (list == null) {
          throw FormatException('IamInstallationCredentialWithSecret.grantedScopes is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredentialWithSecret.status is required');
        }
        return value;
      })(),
      rotatedAt: json['rotatedAt']?.toString(),
      retiredAt: json['retiredAt']?.toString(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredentialWithSecret.createdAt is required');
        }
        return value;
      })(),
      updatedAt: (() {
        final value = json['updatedAt']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredentialWithSecret.updatedAt is required');
        }
        return value;
      })()
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
      'redirectUris': redirectUris.map((item) => item).toList(),
      'grantedScopes': grantedScopes.map((item) => item).toList(),
      'status': status,
      'rotatedAt': rotatedAt,
      'retiredAt': retiredAt,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}

class IamInstallationCredentialCreateCommand {
  final String environmentKey;
  final String? clientId;
  final List<String>? redirectUris;
  final List<String>? grantedScopes;

  IamInstallationCredentialCreateCommand({
    required this.environmentKey,
    this.clientId,
    this.redirectUris,
    this.grantedScopes
  });

  factory IamInstallationCredentialCreateCommand.fromJson(Map<String, dynamic> json) {
    return IamInstallationCredentialCreateCommand(
      environmentKey: (() {
        final value = json['environmentKey']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredentialCreateCommand.environmentKey is required');
        }
        return value;
      })(),
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
  final int code;
  final dynamic data;
  final String traceId;

  IamInstallationEnvironmentListResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory IamInstallationEnvironmentListResponse.fromJson(Map<String, dynamic> json) {
    return IamInstallationEnvironmentListResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('IamInstallationEnvironmentListResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('IamInstallationEnvironmentListResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationEnvironmentListResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  IamInstallationEnvironmentResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory IamInstallationEnvironmentResponse.fromJson(Map<String, dynamic> json) {
    return IamInstallationEnvironmentResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('IamInstallationEnvironmentResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('IamInstallationEnvironmentResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationEnvironmentResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  IamInstallationCredentialResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory IamInstallationCredentialResponse.fromJson(Map<String, dynamic> json) {
    return IamInstallationCredentialResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('IamInstallationCredentialResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('IamInstallationCredentialResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredentialResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  IamInstallationCredentialListResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory IamInstallationCredentialListResponse.fromJson(Map<String, dynamic> json) {
    return IamInstallationCredentialListResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('IamInstallationCredentialListResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('IamInstallationCredentialListResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationCredentialListResponse.traceId is required');
        }
        return value;
      })()
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
  final String integrationId;
  final String providerCode;
  final String clientCode;
  final String displayName;
  final String providerClientId;
  final String? providerTenantId;

  IamOauthClientCreateCommand({
    required this.integrationId,
    required this.providerCode,
    required this.clientCode,
    required this.displayName,
    required this.providerClientId,
    this.providerTenantId
  });

  factory IamOauthClientCreateCommand.fromJson(Map<String, dynamic> json) {
    return IamOauthClientCreateCommand(
      integrationId: (() {
        final value = json['integrationId']?.toString();
        if (value == null) {
          throw FormatException('IamOauthClientCreateCommand.integrationId is required');
        }
        return value;
      })(),
      providerCode: (() {
        final value = json['providerCode']?.toString();
        if (value == null) {
          throw FormatException('IamOauthClientCreateCommand.providerCode is required');
        }
        return value;
      })(),
      clientCode: (() {
        final value = json['clientCode']?.toString();
        if (value == null) {
          throw FormatException('IamOauthClientCreateCommand.clientCode is required');
        }
        return value;
      })(),
      displayName: (() {
        final value = json['displayName']?.toString();
        if (value == null) {
          throw FormatException('IamOauthClientCreateCommand.displayName is required');
        }
        return value;
      })(),
      providerClientId: (() {
        final value = json['providerClientId']?.toString();
        if (value == null) {
          throw FormatException('IamOauthClientCreateCommand.providerClientId is required');
        }
        return value;
      })(),
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
  final String organizationId;
  final String instanceKey;
  final String displayName;
  final String environment;
  final String applicationType;
  final String? primaryDomain;
  final List<String>? accessPermissions;
  final Map<String, dynamic>? runtimeConfig;
  final String? deployApplicationId;
  final String? ownershipScope;
  final String? ownerUserId;
  final String? provisioningIdempotencyKey;

  IamInstallationManagementProvisionCommand({
    required this.organizationId,
    required this.instanceKey,
    required this.displayName,
    required this.environment,
    required this.applicationType,
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
      organizationId: (() {
        final value = json['organizationId']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationManagementProvisionCommand.organizationId is required');
        }
        return value;
      })(),
      instanceKey: (() {
        final value = json['instanceKey']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationManagementProvisionCommand.instanceKey is required');
        }
        return value;
      })(),
      displayName: (() {
        final value = json['displayName']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationManagementProvisionCommand.displayName is required');
        }
        return value;
      })(),
      environment: (() {
        final value = json['environment']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationManagementProvisionCommand.environment is required');
        }
        return value;
      })(),
      applicationType: (() {
        final value = json['applicationType']?.toString();
        if (value == null) {
          throw FormatException('IamInstallationManagementProvisionCommand.applicationType is required');
        }
        return value;
      })(),
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
  final String tenantId;
  final String organizationId;
  final String instanceKey;
  final String displayName;
  final String environment;
  final String applicationType;
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
    required this.tenantId,
    required this.organizationId,
    required this.instanceKey,
    required this.displayName,
    required this.environment,
    required this.applicationType,
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
      tenantId: (() {
        final value = json['tenantId']?.toString();
        if (value == null) {
          throw FormatException('AppbaseInstallationProvisionCommand.tenantId is required');
        }
        return value;
      })(),
      organizationId: (() {
        final value = json['organizationId']?.toString();
        if (value == null) {
          throw FormatException('AppbaseInstallationProvisionCommand.organizationId is required');
        }
        return value;
      })(),
      instanceKey: (() {
        final value = json['instanceKey']?.toString();
        if (value == null) {
          throw FormatException('AppbaseInstallationProvisionCommand.instanceKey is required');
        }
        return value;
      })(),
      displayName: (() {
        final value = json['displayName']?.toString();
        if (value == null) {
          throw FormatException('AppbaseInstallationProvisionCommand.displayName is required');
        }
        return value;
      })(),
      environment: (() {
        final value = json['environment']?.toString();
        if (value == null) {
          throw FormatException('AppbaseInstallationProvisionCommand.environment is required');
        }
        return value;
      })(),
      applicationType: (() {
        final value = json['applicationType']?.toString();
        if (value == null) {
          throw FormatException('AppbaseInstallationProvisionCommand.applicationType is required');
        }
        return value;
      })(),
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
  final String tenantId;
  final String organizationId;
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
    required this.tenantId,
    required this.organizationId,
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
      tenantId: (() {
        final value = json['tenantId']?.toString();
        if (value == null) {
          throw FormatException('AppbaseAccessCredentialCreateCommand.tenantId is required');
        }
        return value;
      })(),
      organizationId: (() {
        final value = json['organizationId']?.toString();
        if (value == null) {
          throw FormatException('AppbaseAccessCredentialCreateCommand.organizationId is required');
        }
        return value;
      })(),
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
  final String installationId;
  final String? expiresAt;

  ServiceAccountCredentialCreateCommand({
    required this.installationId,
    this.expiresAt
  });

  factory ServiceAccountCredentialCreateCommand.fromJson(Map<String, dynamic> json) {
    return ServiceAccountCredentialCreateCommand(
      installationId: (() {
        final value = json['installationId']?.toString();
        if (value == null) {
          throw FormatException('ServiceAccountCredentialCreateCommand.installationId is required');
        }
        return value;
      })(),
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
  final String clientId;
  final String clientSecret;

  ServiceAccountTokenExchangeCommand({
    required this.clientId,
    required this.clientSecret
  });

  factory ServiceAccountTokenExchangeCommand.fromJson(Map<String, dynamic> json) {
    return ServiceAccountTokenExchangeCommand(
      clientId: (() {
        final value = json['clientId']?.toString();
        if (value == null) {
          throw FormatException('ServiceAccountTokenExchangeCommand.clientId is required');
        }
        return value;
      })(),
      clientSecret: (() {
        final value = json['clientSecret']?.toString();
        if (value == null) {
          throw FormatException('ServiceAccountTokenExchangeCommand.clientSecret is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'clientId': clientId,
      'clientSecret': clientSecret,
    };
  }
}
