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

class IamAppAccessTokenCreateCommand {
  final String? appId;
  final String? installationId;
  final String? instanceKey;
  final String? environment;
  final String? ownershipScope;

  IamAppAccessTokenCreateCommand({
    this.appId,
    this.installationId,
    this.instanceKey,
    this.environment,
    this.ownershipScope
  });

  factory IamAppAccessTokenCreateCommand.fromJson(Map<String, dynamic> json) {
    return IamAppAccessTokenCreateCommand(
      appId: json['appId']?.toString(),
      installationId: json['installationId']?.toString(),
      instanceKey: json['instanceKey']?.toString(),
      environment: json['environment']?.toString(),
      ownershipScope: json['ownershipScope']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'appId': appId,
      'installationId': installationId,
      'instanceKey': instanceKey,
      'environment': environment,
      'ownershipScope': ownershipScope,
    };
  }
}

class IamAppAccessToken {
  final String accessToken;
  final String authToken;
  final String expiresAt;
  final String appId;
  final String installationId;
  final String? organizationId;
  final String ownershipScope;
  final String? sessionId;
  final String? environment;

  IamAppAccessToken({
    required this.accessToken,
    required this.authToken,
    required this.expiresAt,
    required this.appId,
    required this.installationId,
    this.organizationId,
    required this.ownershipScope,
    this.sessionId,
    this.environment
  });

  factory IamAppAccessToken.fromJson(Map<String, dynamic> json) {
    return IamAppAccessToken(
      accessToken: (() {
        final value = json['accessToken']?.toString();
        if (value == null) {
          throw FormatException('IamAppAccessToken.accessToken is required');
        }
        return value;
      })(),
      authToken: (() {
        final value = json['authToken']?.toString();
        if (value == null) {
          throw FormatException('IamAppAccessToken.authToken is required');
        }
        return value;
      })(),
      expiresAt: (() {
        final value = json['expiresAt']?.toString();
        if (value == null) {
          throw FormatException('IamAppAccessToken.expiresAt is required');
        }
        return value;
      })(),
      appId: (() {
        final value = json['appId']?.toString();
        if (value == null) {
          throw FormatException('IamAppAccessToken.appId is required');
        }
        return value;
      })(),
      installationId: (() {
        final value = json['installationId']?.toString();
        if (value == null) {
          throw FormatException('IamAppAccessToken.installationId is required');
        }
        return value;
      })(),
      organizationId: json['organizationId']?.toString(),
      ownershipScope: (() {
        final value = json['ownershipScope']?.toString();
        if (value == null) {
          throw FormatException('IamAppAccessToken.ownershipScope is required');
        }
        return value;
      })(),
      sessionId: json['sessionId']?.toString(),
      environment: json['environment']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accessToken': accessToken,
      'authToken': authToken,
      'expiresAt': expiresAt,
      'appId': appId,
      'installationId': installationId,
      'organizationId': organizationId,
      'ownershipScope': ownershipScope,
      'sessionId': sessionId,
      'environment': environment,
    };
  }
}

class IamAppAccessTokenResponse {
  final int code;
  final dynamic data;
  final String traceId;

  IamAppAccessTokenResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory IamAppAccessTokenResponse.fromJson(Map<String, dynamic> json) {
    return IamAppAccessTokenResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('IamAppAccessTokenResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('IamAppAccessTokenResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('IamAppAccessTokenResponse.traceId is required');
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

class IamPersonaRole {
  final String code;
  final String? iamRoleCode;
  final int sortOrder;
  final Map<String, String> labels;
  final Map<String, String> descriptions;

  IamPersonaRole({
    required this.code,
    this.iamRoleCode,
    required this.sortOrder,
    required this.labels,
    required this.descriptions
  });

  factory IamPersonaRole.fromJson(Map<String, dynamic> json) {
    return IamPersonaRole(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('IamPersonaRole.code is required');
        }
        return value;
      })(),
      iamRoleCode: json['iamRoleCode']?.toString(),
      sortOrder: (() {
        final value = json['sortOrder'];
        if (value is! int) {
          throw FormatException('IamPersonaRole.sortOrder is required');
        }
        return value;
      })(),
      labels: (() {
        final map = _sdkworkAsMap(json['labels']);
        if (map == null) {
          throw FormatException('IamPersonaRole.labels is required');
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      descriptions: (() {
        final map = _sdkworkAsMap(json['descriptions']);
        if (map == null) {
          throw FormatException('IamPersonaRole.descriptions is required');
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
      'code': code,
      'iamRoleCode': iamRoleCode,
      'sortOrder': sortOrder,
      'labels': labels.map((key, item) => MapEntry(key, item)),
      'descriptions': descriptions.map((key, item) => MapEntry(key, item)),
    };
  }
}

class IamPersonaInterest {
  final String code;
  final int sortOrder;
  final Map<String, String> labels;

  IamPersonaInterest({
    required this.code,
    required this.sortOrder,
    required this.labels
  });

  factory IamPersonaInterest.fromJson(Map<String, dynamic> json) {
    return IamPersonaInterest(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('IamPersonaInterest.code is required');
        }
        return value;
      })(),
      sortOrder: (() {
        final value = json['sortOrder'];
        if (value is! int) {
          throw FormatException('IamPersonaInterest.sortOrder is required');
        }
        return value;
      })(),
      labels: (() {
        final map = _sdkworkAsMap(json['labels']);
        if (map == null) {
          throw FormatException('IamPersonaInterest.labels is required');
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
      'code': code,
      'sortOrder': sortOrder,
      'labels': labels.map((key, item) => MapEntry(key, item)),
    };
  }
}

class IamPersonaCatalog {
  final String version;
  final List<IamPersonaRole> roles;
  final List<IamPersonaInterest> interests;

  IamPersonaCatalog({
    required this.version,
    required this.roles,
    required this.interests
  });

  factory IamPersonaCatalog.fromJson(Map<String, dynamic> json) {
    return IamPersonaCatalog(
      version: (() {
        final value = json['version']?.toString();
        if (value == null) {
          throw FormatException('IamPersonaCatalog.version is required');
        }
        return value;
      })(),
      roles: (() {
        final list = _sdkworkAsList(json['roles']);
        if (list == null) {
          throw FormatException('IamPersonaCatalog.roles is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : IamPersonaRole.fromJson(map);
      })())
            .whereType<IamPersonaRole>()
            .toList();
      })(),
      interests: (() {
        final list = _sdkworkAsList(json['interests']);
        if (list == null) {
          throw FormatException('IamPersonaCatalog.interests is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : IamPersonaInterest.fromJson(map);
      })())
            .whereType<IamPersonaInterest>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'version': version,
      'roles': roles.map((item) => item.toJson()).toList(),
      'interests': interests.map((item) => item.toJson()).toList(),
    };
  }
}

class IamUserPersona {
  final String? role;
  final List<String> interests;
  final bool promptDismissed;
  final bool hasSelection;
  final String? catalogVersion;
  final String? updatedAt;

  IamUserPersona({
    required this.role,
    required this.interests,
    required this.promptDismissed,
    required this.hasSelection,
    required this.catalogVersion,
    required this.updatedAt
  });

  factory IamUserPersona.fromJson(Map<String, dynamic> json) {
    return IamUserPersona(
      role: (() {
        if (!json.containsKey('role')) {
          throw FormatException('IamUserPersona.role is required');
        }
        final _sdkworkRequiredValue = json['role'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('IamUserPersona.role is required');
        }
        return value;
      })();
      })(),
      interests: (() {
        final list = _sdkworkAsList(json['interests']);
        if (list == null) {
          throw FormatException('IamUserPersona.interests is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      promptDismissed: (() {
        final value = json['promptDismissed'];
        if (value is! bool) {
          throw FormatException('IamUserPersona.promptDismissed is required');
        }
        return value;
      })(),
      hasSelection: (() {
        final value = json['hasSelection'];
        if (value is! bool) {
          throw FormatException('IamUserPersona.hasSelection is required');
        }
        return value;
      })(),
      catalogVersion: (() {
        if (!json.containsKey('catalogVersion')) {
          throw FormatException('IamUserPersona.catalogVersion is required');
        }
        final _sdkworkRequiredValue = json['catalogVersion'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('IamUserPersona.catalogVersion is required');
        }
        return value;
      })();
      })(),
      updatedAt: (() {
        if (!json.containsKey('updatedAt')) {
          throw FormatException('IamUserPersona.updatedAt is required');
        }
        final _sdkworkRequiredValue = json['updatedAt'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('IamUserPersona.updatedAt is required');
        }
        return value;
      })();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'role': role,
      'interests': interests.map((item) => item).toList(),
      'promptDismissed': promptDismissed,
      'hasSelection': hasSelection,
      'catalogVersion': catalogVersion,
      'updatedAt': updatedAt,
    };
  }
}

class IamPersonaCatalogResponse {
  final int code;
  final dynamic data;
  final String traceId;

  IamPersonaCatalogResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory IamPersonaCatalogResponse.fromJson(Map<String, dynamic> json) {
    return IamPersonaCatalogResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('IamPersonaCatalogResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('IamPersonaCatalogResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('IamPersonaCatalogResponse.traceId is required');
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

class IamUserPersonaResponse {
  final int code;
  final dynamic data;
  final String traceId;

  IamUserPersonaResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory IamUserPersonaResponse.fromJson(Map<String, dynamic> json) {
    return IamUserPersonaResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('IamUserPersonaResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('IamUserPersonaResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('IamUserPersonaResponse.traceId is required');
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

class IamUserPersonaUpdateCommand {
  final String? role;
  final List<String>? interests;
  final bool? promptDismissed;

  IamUserPersonaUpdateCommand({
    this.role,
    this.interests,
    this.promptDismissed
  });

  factory IamUserPersonaUpdateCommand.fromJson(Map<String, dynamic> json) {
    return IamUserPersonaUpdateCommand(
      role: json['role']?.toString(),
      interests: (() {
        final list = _sdkworkAsList(json['interests']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      promptDismissed: json['promptDismissed'] is bool ? json['promptDismissed'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'role': role,
      'interests': interests?.map((item) => item).toList(),
      'promptDismissed': promptDismissed,
    };
  }
}

class IamOrganizationMember {
  final String userId;
  final String membershipId;
  final String? displayName;
  final String? username;
  final String? email;
  final String membershipKind;
  final String status;
  final bool isPrimary;

  IamOrganizationMember({
    required this.userId,
    required this.membershipId,
    this.displayName,
    this.username,
    this.email,
    required this.membershipKind,
    required this.status,
    required this.isPrimary
  });

  factory IamOrganizationMember.fromJson(Map<String, dynamic> json) {
    return IamOrganizationMember(
      userId: (() {
        final value = json['userId']?.toString();
        if (value == null) {
          throw FormatException('IamOrganizationMember.userId is required');
        }
        return value;
      })(),
      membershipId: (() {
        final value = json['membershipId']?.toString();
        if (value == null) {
          throw FormatException('IamOrganizationMember.membershipId is required');
        }
        return value;
      })(),
      displayName: json['displayName']?.toString(),
      username: json['username']?.toString(),
      email: json['email']?.toString(),
      membershipKind: (() {
        final value = json['membershipKind']?.toString();
        if (value == null) {
          throw FormatException('IamOrganizationMember.membershipKind is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('IamOrganizationMember.status is required');
        }
        return value;
      })(),
      isPrimary: (() {
        final value = json['isPrimary'];
        if (value is! bool) {
          throw FormatException('IamOrganizationMember.isPrimary is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'userId': userId,
      'membershipId': membershipId,
      'displayName': displayName,
      'username': username,
      'email': email,
      'membershipKind': membershipKind,
      'status': status,
      'isPrimary': isPrimary,
    };
  }
}

class IamOrganizationMemberListResponse {
  final int code;
  final dynamic data;
  final String traceId;

  IamOrganizationMemberListResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory IamOrganizationMemberListResponse.fromJson(Map<String, dynamic> json) {
    return IamOrganizationMemberListResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('IamOrganizationMemberListResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('IamOrganizationMemberListResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('IamOrganizationMemberListResponse.traceId is required');
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

class WechatMiniProgramSessionCreateCommand {
  final String jsCode;
  final String? phoneCode;
  final String? providerCode;
  final String? surfaceCode;
  final String? deviceId;

  WechatMiniProgramSessionCreateCommand({
    required this.jsCode,
    this.phoneCode,
    this.providerCode,
    this.surfaceCode,
    this.deviceId
  });

  factory WechatMiniProgramSessionCreateCommand.fromJson(Map<String, dynamic> json) {
    return WechatMiniProgramSessionCreateCommand(
      jsCode: (() {
        final value = json['jsCode']?.toString();
        if (value == null) {
          throw FormatException('WechatMiniProgramSessionCreateCommand.jsCode is required');
        }
        return value;
      })(),
      phoneCode: json['phoneCode']?.toString(),
      providerCode: json['providerCode']?.toString(),
      surfaceCode: json['surfaceCode']?.toString(),
      deviceId: json['deviceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'jsCode': jsCode,
      'phoneCode': phoneCode,
      'providerCode': providerCode,
      'surfaceCode': surfaceCode,
      'deviceId': deviceId,
    };
  }
}

class OauthPhoneBindingSessionCreateCommand {
  final String continuationToken;
  final String phone;
  final String verificationCode;
  final String? surfaceCode;
  final String? deviceId;

  OauthPhoneBindingSessionCreateCommand({
    required this.continuationToken,
    required this.phone,
    required this.verificationCode,
    this.surfaceCode,
    this.deviceId
  });

  factory OauthPhoneBindingSessionCreateCommand.fromJson(Map<String, dynamic> json) {
    return OauthPhoneBindingSessionCreateCommand(
      continuationToken: (() {
        final value = json['continuationToken']?.toString();
        if (value == null) {
          throw FormatException('OauthPhoneBindingSessionCreateCommand.continuationToken is required');
        }
        return value;
      })(),
      phone: (() {
        final value = json['phone']?.toString();
        if (value == null) {
          throw FormatException('OauthPhoneBindingSessionCreateCommand.phone is required');
        }
        return value;
      })(),
      verificationCode: (() {
        final value = json['verificationCode']?.toString();
        if (value == null) {
          throw FormatException('OauthPhoneBindingSessionCreateCommand.verificationCode is required');
        }
        return value;
      })(),
      surfaceCode: json['surfaceCode']?.toString(),
      deviceId: json['deviceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'continuationToken': continuationToken,
      'phone': phone,
      'verificationCode': verificationCode,
      'surfaceCode': surfaceCode,
      'deviceId': deviceId,
    };
  }
}

class OauthPhoneBindingVerificationCodeRequestCommand {
  final String continuationToken;
  final String phone;

  OauthPhoneBindingVerificationCodeRequestCommand({
    required this.continuationToken,
    required this.phone
  });

  factory OauthPhoneBindingVerificationCodeRequestCommand.fromJson(Map<String, dynamic> json) {
    return OauthPhoneBindingVerificationCodeRequestCommand(
      continuationToken: (() {
        final value = json['continuationToken']?.toString();
        if (value == null) {
          throw FormatException('OauthPhoneBindingVerificationCodeRequestCommand.continuationToken is required');
        }
        return value;
      })(),
      phone: (() {
        final value = json['phone']?.toString();
        if (value == null) {
          throw FormatException('OauthPhoneBindingVerificationCodeRequestCommand.phone is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'continuationToken': continuationToken,
      'phone': phone,
    };
  }
}

class AppbaseSessionCreateCommand {
  final String? grantType;
  final String? account;
  final String? email;
  final String? username;
  final String? phone;
  final String? password;
  final String? externalToken;
  final String? providerKey;
  final String? tenantId;
  final String? organizationId;
  final String? deviceId;

  AppbaseSessionCreateCommand({
    this.grantType,
    this.account,
    this.email,
    this.username,
    this.phone,
    this.password,
    this.externalToken,
    this.providerKey,
    this.tenantId,
    this.organizationId,
    this.deviceId
  });

  factory AppbaseSessionCreateCommand.fromJson(Map<String, dynamic> json) {
    return AppbaseSessionCreateCommand(
      grantType: json['grantType']?.toString(),
      account: json['account']?.toString(),
      email: json['email']?.toString(),
      username: json['username']?.toString(),
      phone: json['phone']?.toString(),
      password: json['password']?.toString(),
      externalToken: json['externalToken']?.toString(),
      providerKey: json['providerKey']?.toString(),
      tenantId: json['tenantId']?.toString(),
      organizationId: json['organizationId']?.toString(),
      deviceId: json['deviceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'grantType': grantType,
      'account': account,
      'email': email,
      'username': username,
      'phone': phone,
      'password': password,
      'externalToken': externalToken,
      'providerKey': providerKey,
      'tenantId': tenantId,
      'organizationId': organizationId,
      'deviceId': deviceId,
    };
  }
}

class SessionsCurrentLogoutRequest {
  final String refreshToken;

  SessionsCurrentLogoutRequest({
    required this.refreshToken
  });

  factory SessionsCurrentLogoutRequest.fromJson(Map<String, dynamic> json) {
    return SessionsCurrentLogoutRequest(
      refreshToken: (() {
        final value = json['refreshToken']?.toString();
        if (value == null) {
          throw FormatException('SessionsCurrentLogoutRequest.refreshToken is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'refreshToken': refreshToken,
    };
  }
}

class AuthorizationsCreateRequest {
  final String clientId;
  final String responseType;
  final String redirectUri;
  final String scope;
  final String state;
  final String codeChallenge;
  final String codeChallengeMethod;
  final String? tenantId;

  AuthorizationsCreateRequest({
    required this.clientId,
    required this.responseType,
    required this.redirectUri,
    required this.scope,
    required this.state,
    required this.codeChallenge,
    required this.codeChallengeMethod,
    this.tenantId
  });

  factory AuthorizationsCreateRequest.fromJson(Map<String, dynamic> json) {
    return AuthorizationsCreateRequest(
      clientId: (() {
        final value = json['clientId']?.toString();
        if (value == null) {
          throw FormatException('AuthorizationsCreateRequest.clientId is required');
        }
        return value;
      })(),
      responseType: (() {
        final value = json['responseType']?.toString();
        if (value == null) {
          throw FormatException('AuthorizationsCreateRequest.responseType is required');
        }
        return value;
      })(),
      redirectUri: (() {
        final value = json['redirectUri']?.toString();
        if (value == null) {
          throw FormatException('AuthorizationsCreateRequest.redirectUri is required');
        }
        return value;
      })(),
      scope: (() {
        final value = json['scope']?.toString();
        if (value == null) {
          throw FormatException('AuthorizationsCreateRequest.scope is required');
        }
        return value;
      })(),
      state: (() {
        final value = json['state']?.toString();
        if (value == null) {
          throw FormatException('AuthorizationsCreateRequest.state is required');
        }
        return value;
      })(),
      codeChallenge: (() {
        final value = json['codeChallenge']?.toString();
        if (value == null) {
          throw FormatException('AuthorizationsCreateRequest.codeChallenge is required');
        }
        return value;
      })(),
      codeChallengeMethod: (() {
        final value = json['codeChallengeMethod']?.toString();
        if (value == null) {
          throw FormatException('AuthorizationsCreateRequest.codeChallengeMethod is required');
        }
        return value;
      })(),
      tenantId: json['tenantId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'clientId': clientId,
      'responseType': responseType,
      'redirectUri': redirectUri,
      'scope': scope,
      'state': state,
      'codeChallenge': codeChallenge,
      'codeChallengeMethod': codeChallengeMethod,
      'tenantId': tenantId,
    };
  }
}

class AuthorizationsCreateResponse201 {
  final int code;
  final String traceId;
  final Map<String, dynamic> data;

  AuthorizationsCreateResponse201({
    required this.code,
    required this.traceId,
    required this.data
  });

  factory AuthorizationsCreateResponse201.fromJson(Map<String, dynamic> json) {
    return AuthorizationsCreateResponse201(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AuthorizationsCreateResponse201.code is required');
        }
        return value;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AuthorizationsCreateResponse201.traceId is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('AuthorizationsCreateResponse201.data is required');
        }
        return map;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'traceId': traceId,
      'data': data,
    };
  }
}

class AuthorizationsCompletionsCreateRequest {


  AuthorizationsCompletionsCreateRequest();

  factory AuthorizationsCompletionsCreateRequest.fromJson(Map<String, dynamic> json) {
    return AuthorizationsCompletionsCreateRequest();
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{};
  }
}

class AuthorizationsCompletionsCreateResponse201 {
  final int code;
  final String traceId;
  final Map<String, dynamic> data;

  AuthorizationsCompletionsCreateResponse201({
    required this.code,
    required this.traceId,
    required this.data
  });

  factory AuthorizationsCompletionsCreateResponse201.fromJson(Map<String, dynamic> json) {
    return AuthorizationsCompletionsCreateResponse201(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AuthorizationsCompletionsCreateResponse201.code is required');
        }
        return value;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AuthorizationsCompletionsCreateResponse201.traceId is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('AuthorizationsCompletionsCreateResponse201.data is required');
        }
        return map;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'traceId': traceId,
      'data': data,
    };
  }
}

class DesktopSessionsCreateRequest {
  final String clientId;
  final String authorizationCode;
  final String codeVerifier;
  final String redirectUri;
  final String? clientSecret;
  final String? deviceId;

  DesktopSessionsCreateRequest({
    required this.clientId,
    required this.authorizationCode,
    required this.codeVerifier,
    required this.redirectUri,
    this.clientSecret,
    this.deviceId
  });

  factory DesktopSessionsCreateRequest.fromJson(Map<String, dynamic> json) {
    return DesktopSessionsCreateRequest(
      clientId: (() {
        final value = json['clientId']?.toString();
        if (value == null) {
          throw FormatException('DesktopSessionsCreateRequest.clientId is required');
        }
        return value;
      })(),
      authorizationCode: (() {
        final value = json['authorizationCode']?.toString();
        if (value == null) {
          throw FormatException('DesktopSessionsCreateRequest.authorizationCode is required');
        }
        return value;
      })(),
      codeVerifier: (() {
        final value = json['codeVerifier']?.toString();
        if (value == null) {
          throw FormatException('DesktopSessionsCreateRequest.codeVerifier is required');
        }
        return value;
      })(),
      redirectUri: (() {
        final value = json['redirectUri']?.toString();
        if (value == null) {
          throw FormatException('DesktopSessionsCreateRequest.redirectUri is required');
        }
        return value;
      })(),
      clientSecret: json['clientSecret']?.toString(),
      deviceId: json['deviceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'clientId': clientId,
      'authorizationCode': authorizationCode,
      'codeVerifier': codeVerifier,
      'redirectUri': redirectUri,
      'clientSecret': clientSecret,
      'deviceId': deviceId,
    };
  }
}

class DesktopSessionsCreateResponse201 {
  final int code;
  final String traceId;
  final Map<String, dynamic> data;

  DesktopSessionsCreateResponse201({
    required this.code,
    required this.traceId,
    required this.data
  });

  factory DesktopSessionsCreateResponse201.fromJson(Map<String, dynamic> json) {
    return DesktopSessionsCreateResponse201(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('DesktopSessionsCreateResponse201.code is required');
        }
        return value;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('DesktopSessionsCreateResponse201.traceId is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('DesktopSessionsCreateResponse201.data is required');
        }
        return map;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'traceId': traceId,
      'data': data,
    };
  }
}
