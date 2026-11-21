import Foundation

public class IamApi {
    private let client: HttpClient
    
    public init(client: HttpClient) {
        self.client = client
    }

    /// App Access Tokens create.
    public func appAccessTokensCreate(body: IamAppAccessTokenCreateCommand) async throws -> IamAppAccessTokenResponse? {
        return try await client.post(ApiPaths.appPath("/iam/app_access_tokens"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: IamAppAccessTokenResponse.self)
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
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/iam/department_assignments"), query), responseType: SdkWorkListResponse.self)
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
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/iam/departments"), query), responseType: SdkWorkListResponse.self)
    }

    /// Departments tree retrieve.
    public func departmentsTreeRetrieve() async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.appPath("/iam/departments/tree"), responseType: SdkWorkResourceResponse.self)
    }

    /// Oauth official Account Settings retrieve.
    public func oauthOfficialAccountSettingsRetrieve() async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.appPath("/iam/oauth/official_account_settings"), responseType: SdkWorkResourceResponse.self)
    }

    /// Oauth official Accounts list.
    public func oauthOfficialAccountsList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/iam/oauth/official_accounts"), query), responseType: SdkWorkListResponse.self)
    }

    /// Oauth official Accounts create.
    public func oauthOfficialAccountsCreate(body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.appPath("/iam/oauth/official_accounts"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Oauth official Accounts delete.
    public func oauthOfficialAccountsDelete(officialAccountId: String) async throws -> Void {
        _ = try await client.delete(ApiPaths.appPath("/iam/oauth/official_accounts/\(serializePathParameter(officialAccountId, PathParameterSpec(name: "officialAccountId", style: "simple", explode: false)))"))
    }

    /// Oauth official Accounts retrieve.
    public func oauthOfficialAccountsRetrieve(officialAccountId: String) async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.appPath("/iam/oauth/official_accounts/\(serializePathParameter(officialAccountId, PathParameterSpec(name: "officialAccountId", style: "simple", explode: false)))"), responseType: SdkWorkResourceResponse.self)
    }

    /// Oauth official Accounts update.
    public func oauthOfficialAccountsUpdate(officialAccountId: String, body: [String: Any]? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.appPath("/iam/oauth/official_accounts/\(serializePathParameter(officialAccountId, PathParameterSpec(name: "officialAccountId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Oauth official Accounts custom Menus publish.
    public func oauthOfficialAccountsCustomMenusPublish(officialAccountId: String, body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.appPath("/iam/oauth/official_accounts/\(serializePathParameter(officialAccountId, PathParameterSpec(name: "officialAccountId", style: "simple", explode: false)))/custom_menus/publish"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Oauth official Accounts custom Menus rollback.
    public func oauthOfficialAccountsCustomMenusRollback(officialAccountId: String, body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.appPath("/iam/oauth/official_accounts/\(serializePathParameter(officialAccountId, PathParameterSpec(name: "officialAccountId", style: "simple", explode: false)))/custom_menus/rollback"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Oauth official Accounts custom Menus sync.
    public func oauthOfficialAccountsCustomMenusSync(officialAccountId: String, body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.appPath("/iam/oauth/official_accounts/\(serializePathParameter(officialAccountId, PathParameterSpec(name: "officialAccountId", style: "simple", explode: false)))/custom_menus/sync"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
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
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/iam/organization_memberships"), query), responseType: SdkWorkListResponse.self)
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
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/iam/organizations"), query), responseType: SdkWorkListResponse.self)
    }

    /// Organizations members list.
    public func organizationsMembersList(organizationId: String, page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil, role: String? = nil) async throws -> IamOrganizationMemberListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "role", value: role, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/iam/organizations/\(serializePathParameter(organizationId, PathParameterSpec(name: "organizationId", style: "simple", explode: false)))/members"), query), responseType: IamOrganizationMemberListResponse.self)
    }

    /// Organizations tree retrieve.
    public func organizationsTreeRetrieve() async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.appPath("/iam/organizations/tree"), responseType: SdkWorkResourceResponse.self)
    }

    /// Persona Catalog retrieve.
    public func personaCatalogRetrieve() async throws -> IamPersonaCatalogResponse? {
        return try await client.get(ApiPaths.appPath("/iam/persona_catalog"), responseType: IamPersonaCatalogResponse.self)
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
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/iam/position_assignments"), query), responseType: SdkWorkListResponse.self)
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
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/iam/positions"), query), responseType: SdkWorkListResponse.self)
    }

    /// Role Bindings list.
    public func roleBindingsList(page: Int? = nil, pageSize: Int? = nil, cursor: String? = nil, sort: String? = nil, q: String? = nil, roleId: String? = nil, principalKind: String? = nil, principalId: String? = nil, scopeKind: String? = nil, scopeId: String? = nil) async throws -> SdkWorkListResponse? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "sort", value: sort, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "role_id", value: roleId, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "principal_kind", value: principalKind, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "principal_id", value: principalId, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "scope_kind", value: scopeKind, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "scope_id", value: scopeId, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/iam/role_bindings"), query), responseType: SdkWorkListResponse.self)
    }

    /// Users current retrieve.
    public func usersCurrentRetrieve() async throws -> SdkWorkResourceResponse? {
        return try await client.get(ApiPaths.appPath("/iam/users/current"), responseType: SdkWorkResourceResponse.self)
    }

    /// Users current update.
    public func usersCurrentUpdate(body: [String: Any]? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.appPath("/iam/users/current"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Users current email Bindings delete.
    public func usersCurrentEmailBindingsDelete() async throws -> Void {
        _ = try await client.delete(ApiPaths.appPath("/iam/users/current/email_bindings"))
    }

    /// Users current email Bindings create.
    public func usersCurrentEmailBindingsCreate(body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.appPath("/iam/users/current/email_bindings"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Users current password update.
    public func usersCurrentPasswordUpdate(body: [String: Any]? = nil) async throws -> SdkWorkResourceResponse? {
        return try await client.patch(ApiPaths.appPath("/iam/users/current/password"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
    }

    /// Users current persona delete.
    public func usersCurrentPersonaDelete() async throws -> Void {
        _ = try await client.delete(ApiPaths.appPath("/iam/users/current/persona"))
    }

    /// Users current persona retrieve.
    public func usersCurrentPersonaRetrieve() async throws -> IamUserPersonaResponse? {
        return try await client.get(ApiPaths.appPath("/iam/users/current/persona"), responseType: IamUserPersonaResponse.self)
    }

    /// Users current persona update.
    public func usersCurrentPersonaUpdate(body: IamUserPersonaUpdateCommand) async throws -> IamUserPersonaResponse? {
        return try await client.put(ApiPaths.appPath("/iam/users/current/persona"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: IamUserPersonaResponse.self)
    }

    /// Users current phone Bindings delete.
    public func usersCurrentPhoneBindingsDelete() async throws -> Void {
        _ = try await client.delete(ApiPaths.appPath("/iam/users/current/phone_bindings"))
    }

    /// Users current phone Bindings create.
    public func usersCurrentPhoneBindingsCreate(body: [String: Any]) async throws -> SdkWorkResourceResponse? {
        return try await client.post(ApiPaths.appPath("/iam/users/current/phone_bindings"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SdkWorkResourceResponse.self)
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
