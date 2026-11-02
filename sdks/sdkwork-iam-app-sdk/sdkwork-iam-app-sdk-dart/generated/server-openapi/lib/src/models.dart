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

class IamPersonaRole {
  final String? code;
  final String? iamRoleCode;
  final int? sortOrder;
  final Map<String, String>? labels;
  final Map<String, String>? descriptions;

  IamPersonaRole({
    this.code,
    this.iamRoleCode,
    this.sortOrder,
    this.labels,
    this.descriptions
  });

  factory IamPersonaRole.fromJson(Map<String, dynamic> json) {
    return IamPersonaRole(
      code: json['code']?.toString(),
      iamRoleCode: json['iamRoleCode']?.toString(),
      sortOrder: json['sortOrder'] is int ? json['sortOrder'] : null,
      labels: (() {
        final map = _sdkworkAsMap(json['labels']);
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
      })(),
      descriptions: (() {
        final map = _sdkworkAsMap(json['descriptions']);
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
      'code': code,
      'iamRoleCode': iamRoleCode,
      'sortOrder': sortOrder,
      'labels': labels?.map((key, item) => MapEntry(key, item)),
      'descriptions': descriptions?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class IamPersonaInterest {
  final String? code;
  final int? sortOrder;
  final Map<String, String>? labels;

  IamPersonaInterest({
    this.code,
    this.sortOrder,
    this.labels
  });

  factory IamPersonaInterest.fromJson(Map<String, dynamic> json) {
    return IamPersonaInterest(
      code: json['code']?.toString(),
      sortOrder: json['sortOrder'] is int ? json['sortOrder'] : null,
      labels: (() {
        final map = _sdkworkAsMap(json['labels']);
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
      'code': code,
      'sortOrder': sortOrder,
      'labels': labels?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class IamPersonaCatalog {
  final String? version;
  final List<IamPersonaRole>? roles;
  final List<IamPersonaInterest>? interests;

  IamPersonaCatalog({
    this.version,
    this.roles,
    this.interests
  });

  factory IamPersonaCatalog.fromJson(Map<String, dynamic> json) {
    return IamPersonaCatalog(
      version: json['version']?.toString(),
      roles: (() {
        final list = _sdkworkAsList(json['roles']);
        if (list == null) {
          return null;
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
          return null;
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
      'roles': roles?.map((item) => item.toJson()).toList(),
      'interests': interests?.map((item) => item.toJson()).toList(),
    };
  }
}

class IamUserPersona {
  final String? role;
  final List<String>? interests;
  final bool? promptDismissed;
  final bool? hasSelection;
  final String? catalogVersion;
  final String? updatedAt;

  IamUserPersona({
    this.role,
    this.interests,
    this.promptDismissed,
    this.hasSelection,
    this.catalogVersion,
    this.updatedAt
  });

  factory IamUserPersona.fromJson(Map<String, dynamic> json) {
    return IamUserPersona(
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
      promptDismissed: json['promptDismissed'] is bool ? json['promptDismissed'] : null,
      hasSelection: json['hasSelection'] is bool ? json['hasSelection'] : null,
      catalogVersion: json['catalogVersion']?.toString(),
      updatedAt: json['updatedAt']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'role': role,
      'interests': interests?.map((item) => item).toList(),
      'promptDismissed': promptDismissed,
      'hasSelection': hasSelection,
      'catalogVersion': catalogVersion,
      'updatedAt': updatedAt,
    };
  }
}

class IamPersonaCatalogResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  IamPersonaCatalogResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory IamPersonaCatalogResponse.fromJson(Map<String, dynamic> json) {
    return IamPersonaCatalogResponse(
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

class IamUserPersonaResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  IamUserPersonaResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory IamUserPersonaResponse.fromJson(Map<String, dynamic> json) {
    return IamUserPersonaResponse(
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

class WechatMiniProgramSessionCreateCommand {
  final String? jsCode;
  final String? providerCode;
  final String? surfaceCode;

  WechatMiniProgramSessionCreateCommand({
    this.jsCode,
    this.providerCode,
    this.surfaceCode
  });

  factory WechatMiniProgramSessionCreateCommand.fromJson(Map<String, dynamic> json) {
    return WechatMiniProgramSessionCreateCommand(
      jsCode: json['jsCode']?.toString(),
      providerCode: json['providerCode']?.toString(),
      surfaceCode: json['surfaceCode']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'jsCode': jsCode,
      'providerCode': providerCode,
      'surfaceCode': surfaceCode,
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
    this.organizationId
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
      organizationId: json['organizationId']?.toString()
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

class AuthorizationsCompletionsCreateResponse {
  final int? code;
  final String? traceId;
  final Map<String, dynamic>? data;

  AuthorizationsCompletionsCreateResponse({
    this.code,
    this.traceId,
    this.data
  });

  factory AuthorizationsCompletionsCreateResponse.fromJson(Map<String, dynamic> json) {
    return AuthorizationsCompletionsCreateResponse(
      code: json['code'] is int ? json['code'] : null,
      traceId: json['traceId']?.toString(),
      data: _sdkworkAsMap(json['data'])
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
  final String? clientId;
  final String? authorizationCode;
  final String? codeVerifier;
  final String? redirectUri;
  final String? clientSecret;

  DesktopSessionsCreateRequest({
    this.clientId,
    this.authorizationCode,
    this.codeVerifier,
    this.redirectUri,
    this.clientSecret
  });

  factory DesktopSessionsCreateRequest.fromJson(Map<String, dynamic> json) {
    return DesktopSessionsCreateRequest(
      clientId: json['clientId']?.toString(),
      authorizationCode: json['authorizationCode']?.toString(),
      codeVerifier: json['codeVerifier']?.toString(),
      redirectUri: json['redirectUri']?.toString(),
      clientSecret: json['clientSecret']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'clientId': clientId,
      'authorizationCode': authorizationCode,
      'codeVerifier': codeVerifier,
      'redirectUri': redirectUri,
      'clientSecret': clientSecret,
    };
  }
}

class DesktopSessionsCreateResponse {
  final int? code;
  final String? traceId;
  final Map<String, dynamic>? data;

  DesktopSessionsCreateResponse({
    this.code,
    this.traceId,
    this.data
  });

  factory DesktopSessionsCreateResponse.fromJson(Map<String, dynamic> json) {
    return DesktopSessionsCreateResponse(
      code: json['code'] is int ? json['code'] : null,
      traceId: json['traceId']?.toString(),
      data: _sdkworkAsMap(json['data'])
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
