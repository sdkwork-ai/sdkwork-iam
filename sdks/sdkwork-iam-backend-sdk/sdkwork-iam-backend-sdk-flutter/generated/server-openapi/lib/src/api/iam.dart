import 'dart:convert';
import '../http/client.dart';
import '../models.dart';

import 'paths.dart';
import 'response_helpers.dart';


class IamApi {
  final HttpClient _client;

  IamApi(this._client);

  /// Access Credentials create.
  Future<SdkWorkResourceResponse?> accessCredentialsCreate(AppbaseAccessCredentialCreateCommand body) async {
    final payload = body.toJson();
    final response = await _client.request('POST', ApiPaths.backendPath('/iam/access_credentials'), body: payload, contentType: 'application/json', skipAuth: true);
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Account Binding Policy retrieve.
  Future<SdkWorkResourceResponse?> accountBindingPolicyRetrieve() async {
    final response = await _client.get(ApiPaths.backendPath('/iam/account_binding_policy'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Account Binding Policy update.
  Future<SdkWorkResourceResponse?> accountBindingPolicyUpdate([Map<String, dynamic>? body]) async {
    final payload = body;
    final response = await _client.patch(ApiPaths.backendPath('/iam/account_binding_policy'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Api Keys list.
  Future<SdkWorkListResponse?> apiKeysList([int? page, int? pageSize, String? cursor, String? sort, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/api_keys'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Api Keys revoke.
  Future<SdkWorkCommandResponse?> apiKeysRevoke(String apiKeyId, Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/api_keys/${serializePathParameter(apiKeyId, const PathParameterSpec('apiKeyId', 'simple', false))}/revoke'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkCommandResponse.fromJson(map);
    })();
  }

  /// Applications register.
  Future<SdkWorkCommandResponse?> applicationsRegister(AppbaseApplicationRegisterCommand body) async {
    final payload = body.toJson();
    final response = await _client.request('POST', ApiPaths.backendPath('/iam/applications/register'), body: payload, contentType: 'application/json', skipAuth: true);
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkCommandResponse.fromJson(map);
    })();
  }

  /// Audit Events list.
  Future<SdkWorkListResponse?> auditEventsList([int? page, int? pageSize, String? cursor, String? sort, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/audit_events'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Audit Events retrieve.
  Future<SdkWorkResourceResponse?> auditEventsRetrieve(String auditEventId) async {
    final response = await _client.get(ApiPaths.backendPath('/iam/audit_events/${serializePathParameter(auditEventId, const PathParameterSpec('auditEventId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Department Assignments list.
  Future<SdkWorkListResponse?> departmentAssignmentsList([int? page, int? pageSize, String? cursor, String? sort, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/department_assignments'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Department Assignments create.
  Future<SdkWorkResourceResponse?> departmentAssignmentsCreate(Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/department_assignments'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Department Assignments update.
  Future<SdkWorkResourceResponse?> departmentAssignmentsUpdate(String assignmentId, [Map<String, dynamic>? body]) async {
    final payload = body;
    final response = await _client.patch(ApiPaths.backendPath('/iam/department_assignments/${serializePathParameter(assignmentId, const PathParameterSpec('assignmentId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Departments list.
  Future<SdkWorkListResponse?> departmentsList([int? page, int? pageSize, String? cursor, String? sort, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/departments'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Departments create.
  Future<SdkWorkResourceResponse?> departmentsCreate(Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/departments'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Departments delete.
  Future<void> departmentsDelete(String departmentId) async {
    await _client.delete(ApiPaths.backendPath('/iam/departments/${serializePathParameter(departmentId, const PathParameterSpec('departmentId', 'simple', false))}'));
  }

  /// Departments retrieve.
  Future<SdkWorkResourceResponse?> departmentsRetrieve(String departmentId) async {
    final response = await _client.get(ApiPaths.backendPath('/iam/departments/${serializePathParameter(departmentId, const PathParameterSpec('departmentId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Departments update.
  Future<SdkWorkResourceResponse?> departmentsUpdate(String departmentId, [Map<String, dynamic>? body]) async {
    final payload = body;
    final response = await _client.patch(ApiPaths.backendPath('/iam/departments/${serializePathParameter(departmentId, const PathParameterSpec('departmentId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Departments tree retrieve.
  Future<SdkWorkResourceResponse?> departmentsTreeRetrieve() async {
    final response = await _client.get(ApiPaths.backendPath('/iam/departments/tree'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Groups list.
  Future<SdkWorkListResponse?> groupsList([int? page, int? pageSize, String? cursor, String? sort, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/groups'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Groups create.
  Future<SdkWorkResourceResponse?> groupsCreate(Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/groups'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Groups delete.
  Future<void> groupsDelete(String groupId) async {
    await _client.delete(ApiPaths.backendPath('/iam/groups/${serializePathParameter(groupId, const PathParameterSpec('groupId', 'simple', false))}'));
  }

  /// Groups retrieve.
  Future<SdkWorkResourceResponse?> groupsRetrieve(String groupId) async {
    final response = await _client.get(ApiPaths.backendPath('/iam/groups/${serializePathParameter(groupId, const PathParameterSpec('groupId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Groups update.
  Future<SdkWorkResourceResponse?> groupsUpdate(String groupId, [Map<String, dynamic>? body]) async {
    final payload = body;
    final response = await _client.patch(ApiPaths.backendPath('/iam/groups/${serializePathParameter(groupId, const PathParameterSpec('groupId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Groups members list.
  Future<SdkWorkListResponse?> groupsMembersList(String groupId, [int? page, int? pageSize, String? cursor, String? sort, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/groups/${serializePathParameter(groupId, const PathParameterSpec('groupId', 'simple', false))}/members'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Groups members create.
  Future<SdkWorkResourceResponse?> groupsMembersCreate(String groupId, Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/groups/${serializePathParameter(groupId, const PathParameterSpec('groupId', 'simple', false))}/members'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Groups members delete.
  Future<void> groupsMembersDelete(String groupId, String memberId) async {
    await _client.delete(ApiPaths.backendPath('/iam/groups/${serializePathParameter(groupId, const PathParameterSpec('groupId', 'simple', false))}/members/${serializePathParameter(memberId, const PathParameterSpec('memberId', 'simple', false))}'));
  }

  /// Organization Memberships list.
  Future<SdkWorkListResponse?> organizationMembershipsList([int? page, int? pageSize, String? cursor, String? sort, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/organization_memberships'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Organization Memberships create.
  Future<SdkWorkResourceResponse?> organizationMembershipsCreate(Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/organization_memberships'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Organization Memberships update.
  Future<SdkWorkResourceResponse?> organizationMembershipsUpdate(String membershipId, [Map<String, dynamic>? body]) async {
    final payload = body;
    final response = await _client.patch(ApiPaths.backendPath('/iam/organization_memberships/${serializePathParameter(membershipId, const PathParameterSpec('membershipId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Organizations list.
  Future<SdkWorkListResponse?> organizationsList([int? page, int? pageSize, String? cursor, String? sort, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/organizations'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Organizations create.
  Future<SdkWorkResourceResponse?> organizationsCreate(Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/organizations'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Organizations delete.
  Future<void> organizationsDelete(String organizationId) async {
    await _client.delete(ApiPaths.backendPath('/iam/organizations/${serializePathParameter(organizationId, const PathParameterSpec('organizationId', 'simple', false))}'));
  }

  /// Organizations retrieve.
  Future<SdkWorkResourceResponse?> organizationsRetrieve(String organizationId) async {
    final response = await _client.get(ApiPaths.backendPath('/iam/organizations/${serializePathParameter(organizationId, const PathParameterSpec('organizationId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Organizations update.
  Future<SdkWorkResourceResponse?> organizationsUpdate(String organizationId, [Map<String, dynamic>? body]) async {
    final payload = body;
    final response = await _client.patch(ApiPaths.backendPath('/iam/organizations/${serializePathParameter(organizationId, const PathParameterSpec('organizationId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Organizations tree retrieve.
  Future<SdkWorkResourceResponse?> organizationsTreeRetrieve() async {
    final response = await _client.get(ApiPaths.backendPath('/iam/organizations/tree'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Permissions list.
  Future<SdkWorkListResponse?> permissionsList([int? page, int? pageSize, String? cursor, String? sort, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/permissions'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Permissions create.
  Future<SdkWorkResourceResponse?> permissionsCreate(Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/permissions'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Permissions delete.
  Future<void> permissionsDelete(String permissionId) async {
    await _client.delete(ApiPaths.backendPath('/iam/permissions/${serializePathParameter(permissionId, const PathParameterSpec('permissionId', 'simple', false))}'));
  }

  /// Permissions retrieve.
  Future<SdkWorkResourceResponse?> permissionsRetrieve(String permissionId) async {
    final response = await _client.get(ApiPaths.backendPath('/iam/permissions/${serializePathParameter(permissionId, const PathParameterSpec('permissionId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Permissions update.
  Future<SdkWorkResourceResponse?> permissionsUpdate(String permissionId, [Map<String, dynamic>? body]) async {
    final payload = body;
    final response = await _client.patch(ApiPaths.backendPath('/iam/permissions/${serializePathParameter(permissionId, const PathParameterSpec('permissionId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Policies list.
  Future<SdkWorkListResponse?> policiesList([int? page, int? pageSize, String? cursor, String? sort, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/policies'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Policies create.
  Future<SdkWorkResourceResponse?> policiesCreate(Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/policies'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Policies delete.
  Future<void> policiesDelete(String policyId) async {
    await _client.delete(ApiPaths.backendPath('/iam/policies/${serializePathParameter(policyId, const PathParameterSpec('policyId', 'simple', false))}'));
  }

  /// Policies retrieve.
  Future<SdkWorkResourceResponse?> policiesRetrieve(String policyId) async {
    final response = await _client.get(ApiPaths.backendPath('/iam/policies/${serializePathParameter(policyId, const PathParameterSpec('policyId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Policies update.
  Future<SdkWorkResourceResponse?> policiesUpdate(String policyId, [Map<String, dynamic>? body]) async {
    final payload = body;
    final response = await _client.patch(ApiPaths.backendPath('/iam/policies/${serializePathParameter(policyId, const PathParameterSpec('policyId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Position Assignments list.
  Future<SdkWorkListResponse?> positionAssignmentsList([int? page, int? pageSize, String? cursor, String? sort, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/position_assignments'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Position Assignments create.
  Future<SdkWorkResourceResponse?> positionAssignmentsCreate(Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/position_assignments'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Position Assignments update.
  Future<SdkWorkResourceResponse?> positionAssignmentsUpdate(String assignmentId, [Map<String, dynamic>? body]) async {
    final payload = body;
    final response = await _client.patch(ApiPaths.backendPath('/iam/position_assignments/${serializePathParameter(assignmentId, const PathParameterSpec('assignmentId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Positions list.
  Future<SdkWorkListResponse?> positionsList([int? page, int? pageSize, String? cursor, String? sort, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/positions'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Positions create.
  Future<SdkWorkResourceResponse?> positionsCreate(Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/positions'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Positions delete.
  Future<void> positionsDelete(String positionId) async {
    await _client.delete(ApiPaths.backendPath('/iam/positions/${serializePathParameter(positionId, const PathParameterSpec('positionId', 'simple', false))}'));
  }

  /// Positions update.
  Future<SdkWorkResourceResponse?> positionsUpdate(String positionId, [Map<String, dynamic>? body]) async {
    final payload = body;
    final response = await _client.patch(ApiPaths.backendPath('/iam/positions/${serializePathParameter(positionId, const PathParameterSpec('positionId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Provider Accounts list.
  Future<SdkWorkListResponse?> providerAccountsList([int? page, int? pageSize, String? cursor, String? sort, String? q, String? vendorCode, String? scopeType, String? ownerUserId, String? organizationId, String? status, bool? mine, bool? includePlatform]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null),
      QueryParameterSpec('vendorCode', vendorCode, 'form', true, false, null),
      QueryParameterSpec('scopeType', scopeType, 'form', true, false, null),
      QueryParameterSpec('ownerUserId', ownerUserId, 'form', true, false, null),
      QueryParameterSpec('organizationId', organizationId, 'form', true, false, null),
      QueryParameterSpec('status', status, 'form', true, false, null),
      QueryParameterSpec('mine', mine, 'form', true, false, null),
      QueryParameterSpec('includePlatform', includePlatform, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/provider_accounts'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Provider Accounts create.
  Future<SdkWorkResourceResponse?> providerAccountsCreate(Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/provider_accounts'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Provider Accounts delete.
  Future<void> providerAccountsDelete(String providerAccountId) async {
    await _client.delete(ApiPaths.backendPath('/iam/provider_accounts/${serializePathParameter(providerAccountId, const PathParameterSpec('providerAccountId', 'simple', false))}'));
  }

  /// Provider Accounts retrieve.
  Future<SdkWorkResourceResponse?> providerAccountsRetrieve(String providerAccountId) async {
    final response = await _client.get(ApiPaths.backendPath('/iam/provider_accounts/${serializePathParameter(providerAccountId, const PathParameterSpec('providerAccountId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Provider Accounts update.
  Future<SdkWorkResourceResponse?> providerAccountsUpdate(String providerAccountId, [Map<String, dynamic>? body]) async {
    final payload = body;
    final response = await _client.patch(ApiPaths.backendPath('/iam/provider_accounts/${serializePathParameter(providerAccountId, const PathParameterSpec('providerAccountId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Provider Accounts credentials list.
  Future<SdkWorkListResponse?> providerAccountsCredentialsList(String providerAccountId, [int? page, int? pageSize, String? cursor, String? sort, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/provider_accounts/${serializePathParameter(providerAccountId, const PathParameterSpec('providerAccountId', 'simple', false))}/credentials'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Provider Accounts credentials create.
  Future<SdkWorkResourceResponse?> providerAccountsCredentialsCreate(String providerAccountId, Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/provider_accounts/${serializePathParameter(providerAccountId, const PathParameterSpec('providerAccountId', 'simple', false))}/credentials'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Provider Accounts set Default.
  Future<SdkWorkResourceResponse?> providerAccountsSetDefault(String providerAccountId, Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/provider_accounts/${serializePathParameter(providerAccountId, const PathParameterSpec('providerAccountId', 'simple', false))}/default'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Provider Accounts resolve.
  Future<SdkWorkResourceResponse?> providerAccountsResolve(String vendorCode, [String? capabilityCode, String? environment, String? userId, String? organizationId]) async {
    final query = buildQueryString([
      QueryParameterSpec('vendorCode', vendorCode, 'form', true, false, null),
      QueryParameterSpec('capabilityCode', capabilityCode, 'form', true, false, null),
      QueryParameterSpec('environment', environment, 'form', true, false, null),
      QueryParameterSpec('userId', userId, 'form', true, false, null),
      QueryParameterSpec('organizationId', organizationId, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/provider_accounts/resolve'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Provider Credentials revoke.
  Future<SdkWorkCommandResponse?> providerCredentialsRevoke(String credentialId, Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/provider_credentials/${serializePathParameter(credentialId, const PathParameterSpec('credentialId', 'simple', false))}/revoke'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkCommandResponse.fromJson(map);
    })();
  }

  /// Role Bindings list.
  Future<SdkWorkListResponse?> roleBindingsList([int? page, int? pageSize, String? cursor, String? sort, String? q, String? roleId, String? principalKind, String? principalId, String? scopeKind, String? scopeId]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null),
      QueryParameterSpec('roleId', roleId, 'form', true, false, null),
      QueryParameterSpec('principalKind', principalKind, 'form', true, false, null),
      QueryParameterSpec('principalId', principalId, 'form', true, false, null),
      QueryParameterSpec('scopeKind', scopeKind, 'form', true, false, null),
      QueryParameterSpec('scopeId', scopeId, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/role_bindings'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Role Bindings create.
  Future<SdkWorkResourceResponse?> roleBindingsCreate(Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/role_bindings'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Role Bindings delete.
  Future<void> roleBindingsDelete(String roleBindingId) async {
    await _client.delete(ApiPaths.backendPath('/iam/role_bindings/${serializePathParameter(roleBindingId, const PathParameterSpec('roleBindingId', 'simple', false))}'));
  }

  /// Roles list.
  Future<SdkWorkListResponse?> rolesList([int? page, int? pageSize, String? cursor, String? sort, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/roles'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Roles create.
  Future<SdkWorkResourceResponse?> rolesCreate(Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/roles'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Roles delete.
  Future<void> rolesDelete(String roleId) async {
    await _client.delete(ApiPaths.backendPath('/iam/roles/${serializePathParameter(roleId, const PathParameterSpec('roleId', 'simple', false))}'));
  }

  /// Roles retrieve.
  Future<SdkWorkResourceResponse?> rolesRetrieve(String roleId) async {
    final response = await _client.get(ApiPaths.backendPath('/iam/roles/${serializePathParameter(roleId, const PathParameterSpec('roleId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Roles update.
  Future<SdkWorkResourceResponse?> rolesUpdate(String roleId, [Map<String, dynamic>? body]) async {
    final payload = body;
    final response = await _client.patch(ApiPaths.backendPath('/iam/roles/${serializePathParameter(roleId, const PathParameterSpec('roleId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Roles permissions list.
  Future<SdkWorkListResponse?> rolesPermissionsList(String roleId, [int? page, int? pageSize, String? cursor, String? sort, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/roles/${serializePathParameter(roleId, const PathParameterSpec('roleId', 'simple', false))}/permissions'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Roles permissions create.
  Future<SdkWorkResourceResponse?> rolesPermissionsCreate(String roleId, Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/roles/${serializePathParameter(roleId, const PathParameterSpec('roleId', 'simple', false))}/permissions'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Roles permissions delete.
  Future<void> rolesPermissionsDelete(String roleId, String permissionId) async {
    await _client.delete(ApiPaths.backendPath('/iam/roles/${serializePathParameter(roleId, const PathParameterSpec('roleId', 'simple', false))}/permissions/${serializePathParameter(permissionId, const PathParameterSpec('permissionId', 'simple', false))}'));
  }

  /// Security Events list.
  Future<SdkWorkListResponse?> securityEventsList([int? page, int? pageSize, String? cursor, String? sort, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/security_events'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Security Events retrieve.
  Future<SdkWorkResourceResponse?> securityEventsRetrieve(String securityEventId) async {
    final response = await _client.get(ApiPaths.backendPath('/iam/security_events/${serializePathParameter(securityEventId, const PathParameterSpec('securityEventId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Service Account Credentials revoke.
  Future<SdkWorkCommandResponse?> serviceAccountCredentialsRevoke(String credentialId, ServiceAccountCredentialRevokeCommand body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/iam/service_account_credentials/${serializePathParameter(credentialId, const PathParameterSpec('credentialId', 'simple', false))}/revoke'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkCommandResponse.fromJson(map);
    })();
  }

  /// Service Account Tokens create.
  Future<SdkWorkResourceResponse?> serviceAccountTokensCreate(ServiceAccountTokenExchangeCommand body) async {
    final payload = body.toJson();
    final response = await _client.request('POST', ApiPaths.backendPath('/iam/service_account_tokens'), body: payload, contentType: 'application/json', skipAuth: true);
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Service Accounts list.
  Future<SdkWorkListResponse?> serviceAccountsList([int? page, int? pageSize, String? cursor, String? sort, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/service_accounts'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Service Accounts create.
  Future<SdkWorkResourceResponse?> serviceAccountsCreate(Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/service_accounts'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Service Accounts delete.
  Future<void> serviceAccountsDelete(String serviceAccountId) async {
    await _client.delete(ApiPaths.backendPath('/iam/service_accounts/${serializePathParameter(serviceAccountId, const PathParameterSpec('serviceAccountId', 'simple', false))}'));
  }

  /// Service Accounts retrieve.
  Future<SdkWorkResourceResponse?> serviceAccountsRetrieve(String serviceAccountId) async {
    final response = await _client.get(ApiPaths.backendPath('/iam/service_accounts/${serializePathParameter(serviceAccountId, const PathParameterSpec('serviceAccountId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Service Accounts update.
  Future<SdkWorkResourceResponse?> serviceAccountsUpdate(String serviceAccountId, [Map<String, dynamic>? body]) async {
    final payload = body;
    final response = await _client.patch(ApiPaths.backendPath('/iam/service_accounts/${serializePathParameter(serviceAccountId, const PathParameterSpec('serviceAccountId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Service Accounts credentials create.
  Future<SdkWorkResourceResponse?> serviceAccountsCredentialsCreate(String serviceAccountId, ServiceAccountCredentialCreateCommand body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/iam/service_accounts/${serializePathParameter(serviceAccountId, const PathParameterSpec('serviceAccountId', 'simple', false))}/credentials'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Tenant Applications create.
  Future<SdkWorkResourceResponse?> tenantApplicationsCreate(AppbaseTenantApplicationProvisionCommand body) async {
    final payload = body.toJson();
    final response = await _client.request('POST', ApiPaths.backendPath('/iam/tenant_applications'), body: payload, contentType: 'application/json', skipAuth: true);
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Tenant Applications retrieve.
  Future<SdkWorkResourceResponse?> tenantApplicationsRetrieve(String tenantApplicationId) async {
    final response = await _client.get(ApiPaths.backendPath('/iam/tenant_applications/${serializePathParameter(tenantApplicationId, const PathParameterSpec('tenantApplicationId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Tenant Applications update.
  Future<SdkWorkResourceResponse?> tenantApplicationsUpdate(String tenantApplicationId, [AppbaseTenantApplicationUpdateCommand? body]) async {
    final payload = body?.toJson();
    final response = await _client.request('PATCH', ApiPaths.backendPath('/iam/tenant_applications/${serializePathParameter(tenantApplicationId, const PathParameterSpec('tenantApplicationId', 'simple', false))}'), body: payload, contentType: 'application/json', skipAuth: true);
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Tenant Applications enable.
  Future<SdkWorkCommandResponse?> tenantApplicationsEnable(String tenantApplicationId, AppbaseTenantApplicationEnableCommand body) async {
    final payload = body.toJson();
    final response = await _client.request('POST', ApiPaths.backendPath('/iam/tenant_applications/${serializePathParameter(tenantApplicationId, const PathParameterSpec('tenantApplicationId', 'simple', false))}/enable'), body: payload, contentType: 'application/json', skipAuth: true);
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkCommandResponse.fromJson(map);
    })();
  }

  /// Tenants list.
  Future<SdkWorkListResponse?> tenantsList([int? page, int? pageSize, String? cursor, String? sort, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/tenants'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Tenants create.
  Future<SdkWorkResourceResponse?> tenantsCreate(Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/tenants'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Tenants delete.
  Future<void> tenantsDelete(String tenantId) async {
    await _client.delete(ApiPaths.backendPath('/iam/tenants/${serializePathParameter(tenantId, const PathParameterSpec('tenantId', 'simple', false))}'));
  }

  /// Tenants retrieve.
  Future<SdkWorkResourceResponse?> tenantsRetrieve(String tenantId) async {
    final response = await _client.get(ApiPaths.backendPath('/iam/tenants/${serializePathParameter(tenantId, const PathParameterSpec('tenantId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Tenants update.
  Future<SdkWorkResourceResponse?> tenantsUpdate(String tenantId, [Map<String, dynamic>? body]) async {
    final payload = body;
    final response = await _client.patch(ApiPaths.backendPath('/iam/tenants/${serializePathParameter(tenantId, const PathParameterSpec('tenantId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Tenant Applications list.
  Future<SdkWorkListResponse?> tenantApplicationsList(String tenantId, [int? page, int? pageSize, String? cursor, String? sort, String? q, String? status, String? environment, String? applicationType]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null),
      QueryParameterSpec('status', status, 'form', true, false, null),
      QueryParameterSpec('environment', environment, 'form', true, false, null),
      QueryParameterSpec('application_type', applicationType, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/tenants/${serializePathParameter(tenantId, const PathParameterSpec('tenantId', 'simple', false))}/applications'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Tenant Applications management create.
  Future<SdkWorkResourceResponse?> tenantApplicationsManagementCreate(String tenantId, IamTenantApplicationManagementProvisionCommand body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/iam/tenants/${serializePathParameter(tenantId, const PathParameterSpec('tenantId', 'simple', false))}/applications'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Tenant Applications management update.
  Future<SdkWorkResourceResponse?> tenantApplicationsManagementUpdate(String tenantId, String tenantApplicationId, [IamTenantApplicationManagementUpdateCommand? body]) async {
    final payload = body?.toJson();
    final response = await _client.patch(ApiPaths.backendPath('/iam/tenants/${serializePathParameter(tenantId, const PathParameterSpec('tenantId', 'simple', false))}/applications/${serializePathParameter(tenantApplicationId, const PathParameterSpec('tenantApplicationId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Tenant Applications management disable.
  Future<SdkWorkCommandResponse?> tenantApplicationsManagementDisable(String tenantId, String tenantApplicationId, IamTenantApplicationStatusCommand body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/iam/tenants/${serializePathParameter(tenantId, const PathParameterSpec('tenantId', 'simple', false))}/applications/${serializePathParameter(tenantApplicationId, const PathParameterSpec('tenantApplicationId', 'simple', false))}/disable'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkCommandResponse.fromJson(map);
    })();
  }

  /// Tenant Applications management enable.
  Future<SdkWorkCommandResponse?> tenantApplicationsManagementEnable(String tenantId, String tenantApplicationId, IamTenantApplicationStatusCommand body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/iam/tenants/${serializePathParameter(tenantId, const PathParameterSpec('tenantId', 'simple', false))}/applications/${serializePathParameter(tenantApplicationId, const PathParameterSpec('tenantApplicationId', 'simple', false))}/enable'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkCommandResponse.fromJson(map);
    })();
  }

  /// Tenant Applications summary retrieve.
  Future<SdkWorkResourceResponse?> tenantApplicationsSummaryRetrieve(String tenantId) async {
    final response = await _client.get(ApiPaths.backendPath('/iam/tenants/${serializePathParameter(tenantId, const PathParameterSpec('tenantId', 'simple', false))}/applications/summary'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Tenants members list.
  Future<SdkWorkListResponse?> tenantsMembersList(String tenantId, [int? page, int? pageSize, String? cursor, String? sort, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/tenants/${serializePathParameter(tenantId, const PathParameterSpec('tenantId', 'simple', false))}/members'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Tenants members create.
  Future<SdkWorkResourceResponse?> tenantsMembersCreate(String tenantId, Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/tenants/${serializePathParameter(tenantId, const PathParameterSpec('tenantId', 'simple', false))}/members'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Tenants members delete.
  Future<void> tenantsMembersDelete(String tenantId, String userId) async {
    await _client.delete(ApiPaths.backendPath('/iam/tenants/${serializePathParameter(tenantId, const PathParameterSpec('tenantId', 'simple', false))}/members/${serializePathParameter(userId, const PathParameterSpec('userId', 'simple', false))}'));
  }

  /// Tenants members update.
  Future<SdkWorkResourceResponse?> tenantsMembersUpdate(String tenantId, String userId, [Map<String, dynamic>? body]) async {
    final payload = body;
    final response = await _client.patch(ApiPaths.backendPath('/iam/tenants/${serializePathParameter(tenantId, const PathParameterSpec('tenantId', 'simple', false))}/members/${serializePathParameter(userId, const PathParameterSpec('userId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Users list.
  Future<SdkWorkListResponse?> usersList([int? page, int? pageSize, String? cursor, String? sort, String? q, String? status]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('sort', sort, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null),
      QueryParameterSpec('status', status, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/iam/users'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkListResponse.fromJson(map);
    })();
  }

  /// Users create.
  Future<SdkWorkResourceResponse?> usersCreate(Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/users'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Users delete.
  Future<void> usersDelete(String userId) async {
    await _client.delete(ApiPaths.backendPath('/iam/users/${serializePathParameter(userId, const PathParameterSpec('userId', 'simple', false))}'));
  }

  /// Users retrieve.
  Future<SdkWorkResourceResponse?> usersRetrieve(String userId) async {
    final response = await _client.get(ApiPaths.backendPath('/iam/users/${serializePathParameter(userId, const PathParameterSpec('userId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Users update.
  Future<SdkWorkResourceResponse?> usersUpdate(String userId, [Map<String, dynamic>? body]) async {
    final payload = body;
    final response = await _client.patch(ApiPaths.backendPath('/iam/users/${serializePathParameter(userId, const PathParameterSpec('userId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Users ban.
  Future<SdkWorkResourceResponse?> usersBan(String userId, Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/users/${serializePathParameter(userId, const PathParameterSpec('userId', 'simple', false))}/ban'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }

  /// Users unban.
  Future<SdkWorkResourceResponse?> usersUnban(String userId, Map<String, dynamic> body) async {
    final payload = body;
    final response = await _client.post(ApiPaths.backendPath('/iam/users/${serializePathParameter(userId, const PathParameterSpec('userId', 'simple', false))}/unban'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SdkWorkResourceResponse.fromJson(map);
    })();
  }
}

class PathParameterSpec {
  final String name;
  final String style;
  final bool explode;

  const PathParameterSpec(this.name, this.style, this.explode);
}

String serializePathParameter(dynamic value, PathParameterSpec spec) {
  if (value == null) return '';
  final style = spec.style.trim().isEmpty ? 'simple' : spec.style;
  if (value is Iterable) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (value is Map) {
    return serializePathObject(spec.name, value, style, spec.explode);
  }
  return pathPrimitivePrefix(spec.name, style) + Uri.encodeComponent(value.toString());
}

String serializePathArray(String name, Iterable values, String style, bool explode) {
  final serialized = values.where((item) => item != null).map((item) => Uri.encodeComponent(item.toString())).toList();
  if (serialized.isEmpty) return pathPrefix(name, style);
  if (style == 'matrix') {
    if (explode) {
      return serialized.map((item) => ';$name=$item').join();
    }
    return ';$name=${serialized.join(',')}';
  }
  final separator = explode ? '.' : ',';
  return pathPrefix(name, style) + serialized.join(separator);
}

String serializePathObject(String name, Map values, String style, bool explode) {
  final entries = <String>[];
  final exploded = <String>[];
  values.forEach((key, value) {
    if (value == null) return;
    final escapedKey = Uri.encodeComponent(key.toString());
    final escapedValue = Uri.encodeComponent(value.toString());
    if (explode) {
      if (style == 'matrix') {
        exploded.add(';$escapedKey=$escapedValue');
      } else {
        exploded.add('$escapedKey=$escapedValue');
      }
    } else {
      entries.add(escapedKey);
      entries.add(escapedValue);
    }
  });
  if (style == 'matrix') {
    if (explode) return exploded.join();
    return ';$name=${entries.join(',')}';
  }
  if (explode) {
    final separator = style == 'label' ? '.' : ',';
    return pathPrefix(name, style) + exploded.join(separator);
  }
  return pathPrefix(name, style) + entries.join(',');
}

String pathPrefix(String name, String style) {
  if (style == 'label') return '.';
  if (style == 'matrix') return ';$name';
  return '';
}

String pathPrimitivePrefix(String name, String style) {
  return style == 'matrix' ? ';$name=' : pathPrefix(name, style);
}
class QueryParameterSpec {
  final String name;
  final dynamic value;
  final String style;
  final bool explode;
  final bool allowReserved;
  final String? contentType;

  const QueryParameterSpec(
    this.name,
    this.value,
    this.style,
    this.explode,
    this.allowReserved,
    this.contentType,
  );
}

String buildQueryString(List<QueryParameterSpec> parameters) {
  final pairs = <String>[];
  for (final parameter in parameters) {
    appendSerializedParameter(pairs, parameter);
  }
  return pairs.join('&');
}

void appendSerializedParameter(List<String> pairs, QueryParameterSpec parameter) {
  final value = parameter.value;
  if (value == null) return;

  final contentType = parameter.contentType;
  if (contentType != null && contentType.trim().isNotEmpty) {
    pairs.add('${urlEncode(parameter.name)}=${encodeQueryValue(jsonEncode(value), parameter.allowReserved)}');
    return;
  }

  final style = parameter.style.trim().isEmpty ? 'form' : parameter.style;
  if (style == 'deepObject' && value is Map) {
    appendDeepObjectParameter(pairs, parameter.name, value, parameter.allowReserved);
    return;
  }
  if (value is Iterable) {
    appendArrayParameter(pairs, parameter.name, value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  if (value is Map) {
    appendObjectParameter(pairs, parameter.name, value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  pairs.add('${urlEncode(parameter.name)}=${encodeQueryValue(value.toString(), parameter.allowReserved)}');
}

void appendArrayParameter(
  List<String> pairs,
  String name,
  Iterable values,
  String style,
  bool explode,
  bool allowReserved,
) {
  final serialized = values.where((item) => item != null).map((item) => item.toString()).toList();
  if (serialized.isEmpty) return;
  if (style == 'form' && explode) {
    for (final item in serialized) {
      pairs.add('${urlEncode(name)}=${encodeQueryValue(item, allowReserved)}');
    }
    return;
  }
  pairs.add('${urlEncode(name)}=${encodeQueryValue(serialized.join(','), allowReserved)}');
}

void appendObjectParameter(
  List<String> pairs,
  String name,
  Map values,
  String style,
  bool explode,
  bool allowReserved,
) {
  final serialized = <String>[];
  values.forEach((key, value) {
    if (value == null) return;
    if (style == 'form' && explode) {
      pairs.add('${urlEncode(key.toString())}=${encodeQueryValue(value.toString(), allowReserved)}');
      return;
    }
    serialized.add(key.toString());
    serialized.add(value.toString());
  });
  if (serialized.isNotEmpty) {
    pairs.add('${urlEncode(name)}=${encodeQueryValue(serialized.join(','), allowReserved)}');
  }
}

void appendDeepObjectParameter(List<String> pairs, String name, Map values, bool allowReserved) {
  values.forEach((key, value) {
    if (value != null) {
      pairs.add('${urlEncode('$name[$key]')}=${encodeQueryValue(value.toString(), allowReserved)}');
    }
  });
}

String encodeQueryValue(String value, bool allowReserved) {
  var encoded = urlEncode(value);
  if (!allowReserved) return encoded;
  const replacements = <String, String>{
    '%3A': ':',
    '%2F': '/',
    '%3F': '?',
    '%23': '#',
    '%5B': '[',
    '%5D': ']',
    '%40': '@',
    '%21': '!',
    '%24': r'$',
    '%26': '&',
    '%27': "'",
    '%28': '(',
    '%29': ')',
    '%2A': '*',
    '%2B': '+',
    '%2C': ',',
    '%3B': ';',
    '%3D': '=',
  };
  replacements.forEach((escaped, reserved) {
    encoded = encoded.replaceAll(escaped, reserved);
  });
  return encoded;
}

String urlEncode(String value) => Uri.encodeQueryComponent(value);
