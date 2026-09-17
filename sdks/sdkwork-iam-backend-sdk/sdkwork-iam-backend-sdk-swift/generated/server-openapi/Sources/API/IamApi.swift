import Foundation

public class IamApi {
    private let client: HttpClient
    
    public init(client: HttpClient) {
        self.client = client
    }

    /// Access Credentials create.
    public func accessCredentialsCreate(body: AppbaseAccessCredentialCreateCommand) async throws -> SdkWorkResourceResponse? {
        return try await client.request("POST", ApiPaths.backendPath("/iam/access_credentials"), body: body, params: nil, headers: nil, contentType: "application/json", skipAuth: true, responseType: SdkWorkResourceResponse.self)
    }

    /// Account Binding Policy retrieve.
    public func accountBindingPolicyRetrieve() async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.backendPath("/iam/account_binding_policy"), responseType: SdkWorkResourceResponse.self)
    }

    /// Account Binding Policy update.
    public func accountBindingPolicyUpdate(body: [String: Any]? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.backendPath("/iam/account_binding_policy"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Api Keys list.
    public func apiKeysList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/api_keys"), query), responseType: SdkWorkListResponse.self)
    }

    /// Api Keys revoke.
    public func apiKeysRevoke(apiKeyId: String, body: [String: Any]) async throws -> SdkWorkCommandResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/api_keys/\(serializePathParameter(apiKeyId, PathParameterSpec(name: "apiKeyId", style: "simple", explode: false)))/revoke"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkCommandResponse.self)
    }

    /// Applications register.
    public func applicationsRegister(body: AppbaseApplicationRegisterCommand) async throws -> SdkWorkCommandResponse? {
        return try await client.request("POST", ApiPaths.backendPath("/iam/applications/register"), body: body, params: nil, headers: nil, contentType: "application/json", skipAuth: true, responseType: SdkWorkCommandResponse.self)
    }

    /// Audit Events list.
    public func auditEventsList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/audit_events"), query), responseType: SdkWorkListResponse.self)
    }

    /// Audit Events retrieve.
    public func auditEventsRetrieve(auditEventId: String) async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.backendPath("/iam/audit_events/\(serializePathParameter(auditEventId, PathParameterSpec(name: "auditEventId", style: "simple", explode: false)))"), responseType: SdkWorkResourceResponse.self)
    }

    /// Department Assignments list.
    public func departmentAssignmentsList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/department_assignments"), query), responseType: SdkWorkListResponse.self)
    }

    /// Department Assignments create.
    public func departmentAssignmentsCreate(body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/department_assignments"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Department Assignments update.
    public func departmentAssignmentsUpdate(assignmentId: String, body: [String: Any]? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.backendPath("/iam/department_assignments/\(serializePathParameter(assignmentId, PathParameterSpec(name: "assignmentId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Departments list.
    public func departmentsList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/departments"), query), responseType: SdkWorkListResponse.self)
    }

    /// Departments create.
    public func departmentsCreate(body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/departments"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Departments delete.
    public func departmentsDelete(departmentId: String) async throws -> Void {
        _ = try await client.delete(ApiPaths.backendPath("/iam/departments/\(serializePathParameter(departmentId, PathParameterSpec(name: "departmentId", style: "simple", explode: false)))"))
    }

    /// Departments retrieve.
    public func departmentsRetrieve(departmentId: String) async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.backendPath("/iam/departments/\(serializePathParameter(departmentId, PathParameterSpec(name: "departmentId", style: "simple", explode: false)))"), responseType: SdkWorkResourceResponse.self)
    }

    /// Departments update.
    public func departmentsUpdate(departmentId: String, body: [String: Any]? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.backendPath("/iam/departments/\(serializePathParameter(departmentId, PathParameterSpec(name: "departmentId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Departments tree retrieve.
    public func departmentsTreeRetrieve() async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.backendPath("/iam/departments/tree"), responseType: SdkWorkResourceResponse.self)
    }

    /// Groups list.
    public func groupsList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/groups"), query), responseType: SdkWorkListResponse.self)
    }

    /// Groups create.
    public func groupsCreate(body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/groups"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Groups delete.
    public func groupsDelete(groupId: String) async throws -> Void {
        _ = try await client.delete(ApiPaths.backendPath("/iam/groups/\(serializePathParameter(groupId, PathParameterSpec(name: "groupId", style: "simple", explode: false)))"))
    }

    /// Groups retrieve.
    public func groupsRetrieve(groupId: String) async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.backendPath("/iam/groups/\(serializePathParameter(groupId, PathParameterSpec(name: "groupId", style: "simple", explode: false)))"), responseType: SdkWorkResourceResponse.self)
    }

    /// Groups update.
    public func groupsUpdate(groupId: String, body: [String: Any]? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.backendPath("/iam/groups/\(serializePathParameter(groupId, PathParameterSpec(name: "groupId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Groups members list.
    public func groupsMembersList(groupId: String, page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/groups/\(serializePathParameter(groupId, PathParameterSpec(name: "groupId", style: "simple", explode: false)))/members"), query), responseType: SdkWorkListResponse.self)
    }

    /// Groups members create.
    public func groupsMembersCreate(groupId: String, body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/groups/\(serializePathParameter(groupId, PathParameterSpec(name: "groupId", style: "simple", explode: false)))/members"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Groups members delete.
    public func groupsMembersDelete(groupId: String, memberId: String) async throws -> Void {
        _ = try await client.delete(ApiPaths.backendPath("/iam/groups/\(serializePathParameter(groupId, PathParameterSpec(name: "groupId", style: "simple", explode: false)))/members/\(serializePathParameter(memberId, PathParameterSpec(name: "memberId", style: "simple", explode: false)))"))
    }

    /// Organization Memberships list.
    public func organizationMembershipsList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/organization_memberships"), query), responseType: SdkWorkListResponse.self)
    }

    /// Organization Memberships create.
    public func organizationMembershipsCreate(body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/organization_memberships"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Organization Memberships update.
    public func organizationMembershipsUpdate(membershipId: String, body: [String: Any]? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.backendPath("/iam/organization_memberships/\(serializePathParameter(membershipId, PathParameterSpec(name: "membershipId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Organizations list.
    public func organizationsList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/organizations"), query), responseType: SdkWorkListResponse.self)
    }

    /// Organizations create.
    public func organizationsCreate(body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/organizations"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Organizations delete.
    public func organizationsDelete(organizationId: String) async throws -> Void {
        _ = try await client.delete(ApiPaths.backendPath("/iam/organizations/\(serializePathParameter(organizationId, PathParameterSpec(name: "organizationId", style: "simple", explode: false)))"))
    }

    /// Organizations retrieve.
    public func organizationsRetrieve(organizationId: String) async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.backendPath("/iam/organizations/\(serializePathParameter(organizationId, PathParameterSpec(name: "organizationId", style: "simple", explode: false)))"), responseType: SdkWorkResourceResponse.self)
    }

    /// Organizations update.
    public func organizationsUpdate(organizationId: String, body: [String: Any]? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.backendPath("/iam/organizations/\(serializePathParameter(organizationId, PathParameterSpec(name: "organizationId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Organizations tree retrieve.
    public func organizationsTreeRetrieve() async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.backendPath("/iam/organizations/tree"), responseType: SdkWorkResourceResponse.self)
    }

    /// Permissions list.
    public func permissionsList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/permissions"), query), responseType: SdkWorkListResponse.self)
    }

    /// Permissions create.
    public func permissionsCreate(body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/permissions"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Permissions delete.
    public func permissionsDelete(permissionId: String) async throws -> Void {
        _ = try await client.delete(ApiPaths.backendPath("/iam/permissions/\(serializePathParameter(permissionId, PathParameterSpec(name: "permissionId", style: "simple", explode: false)))"))
    }

    /// Permissions retrieve.
    public func permissionsRetrieve(permissionId: String) async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.backendPath("/iam/permissions/\(serializePathParameter(permissionId, PathParameterSpec(name: "permissionId", style: "simple", explode: false)))"), responseType: SdkWorkResourceResponse.self)
    }

    /// Permissions update.
    public func permissionsUpdate(permissionId: String, body: [String: Any]? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.backendPath("/iam/permissions/\(serializePathParameter(permissionId, PathParameterSpec(name: "permissionId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Policies list.
    public func policiesList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/policies"), query), responseType: SdkWorkListResponse.self)
    }

    /// Policies create.
    public func policiesCreate(body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/policies"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Policies delete.
    public func policiesDelete(policyId: String) async throws -> Void {
        _ = try await client.delete(ApiPaths.backendPath("/iam/policies/\(serializePathParameter(policyId, PathParameterSpec(name: "policyId", style: "simple", explode: false)))"))
    }

    /// Policies retrieve.
    public func policiesRetrieve(policyId: String) async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.backendPath("/iam/policies/\(serializePathParameter(policyId, PathParameterSpec(name: "policyId", style: "simple", explode: false)))"), responseType: SdkWorkResourceResponse.self)
    }

    /// Policies update.
    public func policiesUpdate(policyId: String, body: [String: Any]? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.backendPath("/iam/policies/\(serializePathParameter(policyId, PathParameterSpec(name: "policyId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Position Assignments list.
    public func positionAssignmentsList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/position_assignments"), query), responseType: SdkWorkListResponse.self)
    }

    /// Position Assignments create.
    public func positionAssignmentsCreate(body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/position_assignments"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Position Assignments update.
    public func positionAssignmentsUpdate(assignmentId: String, body: [String: Any]? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.backendPath("/iam/position_assignments/\(serializePathParameter(assignmentId, PathParameterSpec(name: "assignmentId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Positions list.
    public func positionsList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/positions"), query), responseType: SdkWorkListResponse.self)
    }

    /// Positions create.
    public func positionsCreate(body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/positions"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Positions delete.
    public func positionsDelete(positionId: String) async throws -> Void {
        _ = try await client.delete(ApiPaths.backendPath("/iam/positions/\(serializePathParameter(positionId, PathParameterSpec(name: "positionId", style: "simple", explode: false)))"))
    }

    /// Positions update.
    public func positionsUpdate(positionId: String, body: [String: Any]? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.backendPath("/iam/positions/\(serializePathParameter(positionId, PathParameterSpec(name: "positionId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Provider Accounts list.
    public func providerAccountsList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil, vendorCode: String? = nil, scopeType: String? = nil, ownerUserId: String? = nil, organizationId: String? = nil, status: String? = nil, mine: Bool? = nil, includePlatform: Bool? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "vendorCode", value: vendorCode, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "scopeType", value: scopeType, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "ownerUserId", value: ownerUserId, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "organizationId", value: organizationId, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "status", value: status, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "mine", value: mine, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "includePlatform", value: includePlatform, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/provider_accounts"), query), responseType: SdkWorkListResponse.self)
    }

    /// Provider Accounts create.
    public func providerAccountsCreate(body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/provider_accounts"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Provider Accounts delete.
    public func providerAccountsDelete(providerAccountId: String) async throws -> Void {
        _ = try await client.delete(ApiPaths.backendPath("/iam/provider_accounts/\(serializePathParameter(providerAccountId, PathParameterSpec(name: "providerAccountId", style: "simple", explode: false)))"))
    }

    /// Provider Accounts retrieve.
    public func providerAccountsRetrieve(providerAccountId: String) async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.backendPath("/iam/provider_accounts/\(serializePathParameter(providerAccountId, PathParameterSpec(name: "providerAccountId", style: "simple", explode: false)))"), responseType: SdkWorkResourceResponse.self)
    }

    /// Provider Accounts update.
    public func providerAccountsUpdate(providerAccountId: String, body: [String: Any]? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.backendPath("/iam/provider_accounts/\(serializePathParameter(providerAccountId, PathParameterSpec(name: "providerAccountId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Provider Accounts credentials list.
    public func providerAccountsCredentialsList(providerAccountId: String, page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/provider_accounts/\(serializePathParameter(providerAccountId, PathParameterSpec(name: "providerAccountId", style: "simple", explode: false)))/credentials"), query), responseType: SdkWorkListResponse.self)
    }

    /// Provider Accounts credentials create.
    public func providerAccountsCredentialsCreate(providerAccountId: String, body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/provider_accounts/\(serializePathParameter(providerAccountId, PathParameterSpec(name: "providerAccountId", style: "simple", explode: false)))/credentials"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Provider Accounts set Default.
    public func providerAccountsSetDefault(providerAccountId: String, body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/provider_accounts/\(serializePathParameter(providerAccountId, PathParameterSpec(name: "providerAccountId", style: "simple", explode: false)))/default"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Provider Accounts resolve.
    public func providerAccountsResolve(vendorCode: String, capabilityCode: String? = nil, environment: String? = nil, userId: String? = nil, organizationId: String? = nil) async throws -> SdkWorkResourceResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "vendorCode", value: vendorCode, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "capabilityCode", value: capabilityCode, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "environment", value: environment, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "userId", value: userId, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "organizationId", value: organizationId, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/provider_accounts/resolve"), query), responseType: SdkWorkResourceResponse.self)
    }

    /// Provider Credentials revoke.
    public func providerCredentialsRevoke(credentialId: String, body: [String: Any]) async throws -> SdkWorkCommandResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/provider_credentials/\(serializePathParameter(credentialId, PathParameterSpec(name: "credentialId", style: "simple", explode: false)))/revoke"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkCommandResponse.self)
    }

    /// Role Bindings list.
    public func roleBindingsList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil, roleId: String? = nil, principalKind: String? = nil, principalId: String? = nil, scopeKind: String? = nil, scopeId: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "roleId", value: roleId, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "principalKind", value: principalKind, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "principalId", value: principalId, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "scopeKind", value: scopeKind, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "scopeId", value: scopeId, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/role_bindings"), query), responseType: SdkWorkListResponse.self)
    }

    /// Role Bindings create.
    public func roleBindingsCreate(body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/role_bindings"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Role Bindings delete.
    public func roleBindingsDelete(roleBindingId: String) async throws -> Void {
        _ = try await client.delete(ApiPaths.backendPath("/iam/role_bindings/\(serializePathParameter(roleBindingId, PathParameterSpec(name: "roleBindingId", style: "simple", explode: false)))"))
    }

    /// Roles list.
    public func rolesList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/roles"), query), responseType: SdkWorkListResponse.self)
    }

    /// Roles create.
    public func rolesCreate(body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/roles"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Roles delete.
    public func rolesDelete(roleId: String) async throws -> Void {
        _ = try await client.delete(ApiPaths.backendPath("/iam/roles/\(serializePathParameter(roleId, PathParameterSpec(name: "roleId", style: "simple", explode: false)))"))
    }

    /// Roles retrieve.
    public func rolesRetrieve(roleId: String) async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.backendPath("/iam/roles/\(serializePathParameter(roleId, PathParameterSpec(name: "roleId", style: "simple", explode: false)))"), responseType: SdkWorkResourceResponse.self)
    }

    /// Roles update.
    public func rolesUpdate(roleId: String, body: [String: Any]? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.backendPath("/iam/roles/\(serializePathParameter(roleId, PathParameterSpec(name: "roleId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Roles permissions list.
    public func rolesPermissionsList(roleId: String, page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/roles/\(serializePathParameter(roleId, PathParameterSpec(name: "roleId", style: "simple", explode: false)))/permissions"), query), responseType: SdkWorkListResponse.self)
    }

    /// Roles permissions create.
    public func rolesPermissionsCreate(roleId: String, body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/roles/\(serializePathParameter(roleId, PathParameterSpec(name: "roleId", style: "simple", explode: false)))/permissions"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Roles permissions delete.
    public func rolesPermissionsDelete(roleId: String, permissionId: String) async throws -> Void {
        _ = try await client.delete(ApiPaths.backendPath("/iam/roles/\(serializePathParameter(roleId, PathParameterSpec(name: "roleId", style: "simple", explode: false)))/permissions/\(serializePathParameter(permissionId, PathParameterSpec(name: "permissionId", style: "simple", explode: false)))"))
    }

    /// Security Events list.
    public func securityEventsList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/security_events"), query), responseType: SdkWorkListResponse.self)
    }

    /// Security Events retrieve.
    public func securityEventsRetrieve(securityEventId: String) async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.backendPath("/iam/security_events/\(serializePathParameter(securityEventId, PathParameterSpec(name: "securityEventId", style: "simple", explode: false)))"), responseType: SdkWorkResourceResponse.self)
    }

    /// Service Account Credentials revoke.
    public func serviceAccountCredentialsRevoke(credentialId: String, body: ServiceAccountCredentialRevokeCommand) async throws -> SdkWorkCommandResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/service_account_credentials/\(serializePathParameter(credentialId, PathParameterSpec(name: "credentialId", style: "simple", explode: false)))/revoke"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkCommandResponse.self)
    }

    /// Service Account Tokens create.
    public func serviceAccountTokensCreate(body: ServiceAccountTokenExchangeCommand) async throws -> SdkWorkResourceResponse? {
        return try await client.request("POST", ApiPaths.backendPath("/iam/service_account_tokens"), body: body, params: nil, headers: nil, contentType: "application/json", skipAuth: true, responseType: SdkWorkResourceResponse.self)
    }

    /// Service Accounts list.
    public func serviceAccountsList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/service_accounts"), query), responseType: SdkWorkListResponse.self)
    }

    /// Service Accounts create.
    public func serviceAccountsCreate(body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/service_accounts"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Service Accounts delete.
    public func serviceAccountsDelete(serviceAccountId: String) async throws -> Void {
        _ = try await client.delete(ApiPaths.backendPath("/iam/service_accounts/\(serializePathParameter(serviceAccountId, PathParameterSpec(name: "serviceAccountId", style: "simple", explode: false)))"))
    }

    /// Service Accounts retrieve.
    public func serviceAccountsRetrieve(serviceAccountId: String) async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.backendPath("/iam/service_accounts/\(serializePathParameter(serviceAccountId, PathParameterSpec(name: "serviceAccountId", style: "simple", explode: false)))"), responseType: SdkWorkResourceResponse.self)
    }

    /// Service Accounts update.
    public func serviceAccountsUpdate(serviceAccountId: String, body: [String: Any]? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.backendPath("/iam/service_accounts/\(serializePathParameter(serviceAccountId, PathParameterSpec(name: "serviceAccountId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Service Accounts credentials create.
    public func serviceAccountsCredentialsCreate(serviceAccountId: String, body: ServiceAccountCredentialCreateCommand) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/service_accounts/\(serializePathParameter(serviceAccountId, PathParameterSpec(name: "serviceAccountId", style: "simple", explode: false)))/credentials"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Tenant Applications create.
    public func tenantApplicationsCreate(body: AppbaseTenantApplicationProvisionCommand) async throws -> SdkWorkResourceResponse? {
        return try await client.request("POST", ApiPaths.backendPath("/iam/tenant_applications"), body: body, params: nil, headers: nil, contentType: "application/json", skipAuth: true, responseType: SdkWorkResourceResponse.self)
    }

    /// Tenant Applications retrieve.
    public func tenantApplicationsRetrieve(tenantApplicationId: String) async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.backendPath("/iam/tenant_applications/\(serializePathParameter(tenantApplicationId, PathParameterSpec(name: "tenantApplicationId", style: "simple", explode: false)))"), responseType: SdkWorkResourceResponse.self)
    }

    /// Tenant Applications update.
    public func tenantApplicationsUpdate(tenantApplicationId: String, body: AppbaseTenantApplicationUpdateCommand? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.request("PATCH", ApiPaths.backendPath("/iam/tenant_applications/\(serializePathParameter(tenantApplicationId, PathParameterSpec(name: "tenantApplicationId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", skipAuth: true, responseType: SdkWorkResourceResponse.self)
    }

    /// Tenant Applications enable.
    public func tenantApplicationsEnable(tenantApplicationId: String, body: AppbaseTenantApplicationEnableCommand) async throws -> SdkWorkCommandResponse? {
        return try await client.request("POST", ApiPaths.backendPath("/iam/tenant_applications/\(serializePathParameter(tenantApplicationId, PathParameterSpec(name: "tenantApplicationId", style: "simple", explode: false)))/enable"), body: body, params: nil, headers: nil, contentType: "application/json", skipAuth: true, responseType: SdkWorkCommandResponse.self)
    }

    /// Tenants list.
    public func tenantsList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/tenants"), query), responseType: SdkWorkListResponse.self)
    }

    /// Tenants create.
    public func tenantsCreate(body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/tenants"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Tenants delete.
    public func tenantsDelete(tenantId: String) async throws -> Void {
        _ = try await client.delete(ApiPaths.backendPath("/iam/tenants/\(serializePathParameter(tenantId, PathParameterSpec(name: "tenantId", style: "simple", explode: false)))"))
    }

    /// Tenants retrieve.
    public func tenantsRetrieve(tenantId: String) async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.backendPath("/iam/tenants/\(serializePathParameter(tenantId, PathParameterSpec(name: "tenantId", style: "simple", explode: false)))"), responseType: SdkWorkResourceResponse.self)
    }

    /// Tenants update.
    public func tenantsUpdate(tenantId: String, body: [String: Any]? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.backendPath("/iam/tenants/\(serializePathParameter(tenantId, PathParameterSpec(name: "tenantId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Tenant Applications list.
    public func tenantApplicationsList(tenantId: String, page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil, status: String? = nil, environment: String? = nil, applicationType: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "status", value: status, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "environment", value: environment, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "application_type", value: applicationType, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/tenants/\(serializePathParameter(tenantId, PathParameterSpec(name: "tenantId", style: "simple", explode: false)))/applications"), query), responseType: SdkWorkListResponse.self)
    }

    /// Tenant Applications management create.
    public func tenantApplicationsManagementCreate(tenantId: String, body: IamTenantApplicationManagementProvisionCommand) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/tenants/\(serializePathParameter(tenantId, PathParameterSpec(name: "tenantId", style: "simple", explode: false)))/applications"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Tenant Applications management update.
    public func tenantApplicationsManagementUpdate(tenantId: String, tenantApplicationId: String, body: IamTenantApplicationManagementUpdateCommand? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.backendPath("/iam/tenants/\(serializePathParameter(tenantId, PathParameterSpec(name: "tenantId", style: "simple", explode: false)))/applications/\(serializePathParameter(tenantApplicationId, PathParameterSpec(name: "tenantApplicationId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Tenant Applications management disable.
    public func tenantApplicationsManagementDisable(tenantId: String, tenantApplicationId: String, body: IamTenantApplicationStatusCommand) async throws -> SdkWorkCommandResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/tenants/\(serializePathParameter(tenantId, PathParameterSpec(name: "tenantId", style: "simple", explode: false)))/applications/\(serializePathParameter(tenantApplicationId, PathParameterSpec(name: "tenantApplicationId", style: "simple", explode: false)))/disable"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkCommandResponse.self)
    }

    /// Tenant Applications management enable.
    public func tenantApplicationsManagementEnable(tenantId: String, tenantApplicationId: String, body: IamTenantApplicationStatusCommand) async throws -> SdkWorkCommandResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/tenants/\(serializePathParameter(tenantId, PathParameterSpec(name: "tenantId", style: "simple", explode: false)))/applications/\(serializePathParameter(tenantApplicationId, PathParameterSpec(name: "tenantApplicationId", style: "simple", explode: false)))/enable"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkCommandResponse.self)
    }

    /// Tenant Applications summary retrieve.
    public func tenantApplicationsSummaryRetrieve(tenantId: String) async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.backendPath("/iam/tenants/\(serializePathParameter(tenantId, PathParameterSpec(name: "tenantId", style: "simple", explode: false)))/applications/summary"), responseType: SdkWorkResourceResponse.self)
    }

    /// Tenants members list.
    public func tenantsMembersList(tenantId: String, page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/tenants/\(serializePathParameter(tenantId, PathParameterSpec(name: "tenantId", style: "simple", explode: false)))/members"), query), responseType: SdkWorkListResponse.self)
    }

    /// Tenants members create.
    public func tenantsMembersCreate(tenantId: String, body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/tenants/\(serializePathParameter(tenantId, PathParameterSpec(name: "tenantId", style: "simple", explode: false)))/members"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Tenants members delete.
    public func tenantsMembersDelete(tenantId: String, userId: String) async throws -> Void {
        _ = try await client.delete(ApiPaths.backendPath("/iam/tenants/\(serializePathParameter(tenantId, PathParameterSpec(name: "tenantId", style: "simple", explode: false)))/members/\(serializePathParameter(userId, PathParameterSpec(name: "userId", style: "simple", explode: false)))"))
    }

    /// Tenants members update.
    public func tenantsMembersUpdate(tenantId: String, userId: String, body: [String: Any]? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.backendPath("/iam/tenants/\(serializePathParameter(tenantId, PathParameterSpec(name: "tenantId", style: "simple", explode: false)))/members/\(serializePathParameter(userId, PathParameterSpec(name: "userId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Users list.
    public func usersList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil, status: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "status", value: status, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/users"), query), responseType: SdkWorkListResponse.self)
    }

    /// Users create.
    public func usersCreate(body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/users"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Users delete.
    public func usersDelete(userId: String) async throws -> Void {
        _ = try await client.delete(ApiPaths.backendPath("/iam/users/\(serializePathParameter(userId, PathParameterSpec(name: "userId", style: "simple", explode: false)))"))
    }

    /// Users retrieve.
    public func usersRetrieve(userId: String) async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.backendPath("/iam/users/\(serializePathParameter(userId, PathParameterSpec(name: "userId", style: "simple", explode: false)))"), responseType: SdkWorkResourceResponse.self)
    }

    /// Users update.
    public func usersUpdate(userId: String, body: [String: Any]? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.backendPath("/iam/users/\(serializePathParameter(userId, PathParameterSpec(name: "userId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Users ban.
    public func usersBan(userId: String, body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/users/\(serializePathParameter(userId, PathParameterSpec(name: "userId", style: "simple", explode: false)))/ban"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Users unban.
    public func usersUnban(userId: String, body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.backendPath("/iam/users/\(serializePathParameter(userId, PathParameterSpec(name: "userId", style: "simple", explode: false)))/unban"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    private struct PathParameterSpec {
        let name: String
        let style: String
        let explode: Bool
    }

    private func serializePathParameter(_ value: Any?, _ spec: PathParameterSpec) -> String {
        guard let value else { return "" }
        let style = spec.style.isEmpty ? "simple" : spec.style
        if let array = value as? [Any] {
            return serializePathArray(spec.name, array, style, spec.explode)
        }
        if let object = value as? [String: Any] {
            return serializePathObject(spec.name, object, style, spec.explode)
        }
        return pathPrimitivePrefix(spec.name, style) + pathEncode(String(describing: value))
    }

    private func serializePathArray(_ name: String, _ values: [Any], _ style: String, _ explode: Bool) -> String {
        let serialized = values.map { pathEncode(String(describing: $0)) }
        if serialized.isEmpty { return pathPrefix(name, style) }
        if style == "matrix" {
            if explode {
                return serialized.map { ";\(name)=\($0)" }.joined()
            }
            return ";\(name)=" + serialized.joined(separator: ",")
        }
        let separator = explode ? "." : ","
        return pathPrefix(name, style) + serialized.joined(separator: separator)
    }

    private func serializePathObject(_ name: String, _ values: [String: Any], _ style: String, _ explode: Bool) -> String {
        var entries: [String] = []
        var exploded: [String] = []
        for (key, value) in values {
            let escapedKey = pathEncode(key)
            let escapedValue = pathEncode(String(describing: value))
            if explode {
                if style == "matrix" {
                    exploded.append(";\(escapedKey)=\(escapedValue)")
                } else {
                    exploded.append("\(escapedKey)=\(escapedValue)")
                }
            } else {
                entries.append(escapedKey)
                entries.append(escapedValue)
            }
        }
        if style == "matrix" {
            if explode {
                return exploded.joined()
            }
            return ";\(name)=" + entries.joined(separator: ",")
        }
        if explode {
            let separator = style == "label" ? "." : ","
            return pathPrefix(name, style) + exploded.joined(separator: separator)
        }
        return pathPrefix(name, style) + entries.joined(separator: ",")
    }

    private func pathPrefix(_ name: String, _ style: String) -> String {
        if style == "label" { return "." }
        if style == "matrix" { return ";\(name)" }
        return ""
    }

    private func pathPrimitivePrefix(_ name: String, _ style: String) -> String {
        style == "matrix" ? ";\(name)=" : pathPrefix(name, style)
    }

    private func pathEncode(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? value
    }

    private struct QueryParameterSpec {
        let name: String
        let value: Any?
        let style: String
        let explode: Bool
        let allowReserved: Bool
        let contentType: String?
    }

    private func buildQueryString(_ parameters: [QueryParameterSpec]) -> String {
        var pairs: [String] = []
        for parameter in parameters {
            appendSerializedParameter(&pairs, parameter)
        }
        return pairs.joined(separator: "&")
    }

    private func appendSerializedParameter(_ pairs: inout [String], _ parameter: QueryParameterSpec) {
        guard let value = parameter.value else { return }
        if let contentType = parameter.contentType, !contentType.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let data = (try? JSONSerialization.data(withJSONObject: value, options: [])) ?? Data(String(describing: value).utf8)
            let json = String(data: data, encoding: .utf8) ?? String(describing: value)
            pairs.append("\(urlEncode(parameter.name))=\(encodeQueryValue(json, allowReserved: parameter.allowReserved))")
            return
        }

        let style = parameter.style.isEmpty ? "form" : parameter.style
        if style == "deepObject", let object = value as? [String: Any] {
            appendDeepObjectParameter(&pairs, name: parameter.name, values: object, allowReserved: parameter.allowReserved)
        } else if let array = value as? [Any] {
            appendArrayParameter(&pairs, name: parameter.name, values: array, style: style, explode: parameter.explode, allowReserved: parameter.allowReserved)
        } else if let object = value as? [String: Any] {
            appendObjectParameter(&pairs, name: parameter.name, values: object, style: style, explode: parameter.explode, allowReserved: parameter.allowReserved)
        } else {
            pairs.append("\(urlEncode(parameter.name))=\(encodeQueryValue(String(describing: value), allowReserved: parameter.allowReserved))")
        }
    }

    private func appendArrayParameter(
        _ pairs: inout [String],
        name: String,
        values: [Any],
        style: String,
        explode: Bool,
        allowReserved: Bool
    ) {
        let serialized = values.map { String(describing: $0) }
        guard !serialized.isEmpty else { return }
        if style == "form" && explode {
            for item in serialized {
                pairs.append("\(urlEncode(name))=\(encodeQueryValue(item, allowReserved: allowReserved))")
            }
            return
        }
        pairs.append("\(urlEncode(name))=\(encodeQueryValue(serialized.joined(separator: ","), allowReserved: allowReserved))")
    }

    private func appendObjectParameter(
        _ pairs: inout [String],
        name: String,
        values: [String: Any],
        style: String,
        explode: Bool,
        allowReserved: Bool
    ) {
        var serialized: [String] = []
        for (key, value) in values {
            if style == "form" && explode {
                pairs.append("\(urlEncode(key))=\(encodeQueryValue(String(describing: value), allowReserved: allowReserved))")
            } else {
                serialized.append(key)
                serialized.append(String(describing: value))
            }
        }
        if !serialized.isEmpty {
            pairs.append("\(urlEncode(name))=\(encodeQueryValue(serialized.joined(separator: ","), allowReserved: allowReserved))")
        }
    }

    private func appendDeepObjectParameter(_ pairs: inout [String], name: String, values: [String: Any], allowReserved: Bool) {
        for (key, value) in values {
            pairs.append("\(urlEncode("\(name)[\(key)]"))=\(encodeQueryValue(String(describing: value), allowReserved: allowReserved))")
        }
    }

    private func encodeQueryValue(_ value: String, allowReserved: Bool) -> String {
        var encoded = urlEncode(value)
        if !allowReserved { return encoded }
        [
            "%3A": ":", "%2F": "/", "%3F": "?", "%23": "#",
            "%5B": "[", "%5D": "]", "%40": "@", "%21": "!",
            "%24": "$", "%26": "&", "%27": "'", "%28": "(",
            "%29": ")", "%2A": "*", "%2B": "+", "%2C": ",",
            "%3B": ";", "%3D": "=",
        ].forEach { encoded = encoded.replacingOccurrences(of: $0.key, with: $0.value) }
        return encoded
    }

    private func urlEncode(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? value
    }

}
