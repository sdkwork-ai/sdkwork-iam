package com.sdkwork.iam.app.sdk.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.iam.app.sdk.*
import com.sdkwork.iam.app.sdk.http.HttpClient

class IamApi(private val client: HttpClient) {

    /** Department Assignments list. */
    suspend fun departmentAssignmentsList(page: Int? = null, pageSize: Int? = null, cursor: String? = null, sort: String? = null, q: String? = null): SdkWorkListResponse? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("cursor", cursor, "form", true, false, null),
            QueryParameterSpec("sort", sort, "form", true, false, null),
            QueryParameterSpec("q", q, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/iam/department_assignments"), query))
        return client.convertValue(raw, object : TypeReference<SdkWorkListResponse>() {})
    }

    /** Departments list. */
    suspend fun departmentsList(page: Int? = null, pageSize: Int? = null, cursor: String? = null, sort: String? = null, q: String? = null): SdkWorkListResponse? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("cursor", cursor, "form", true, false, null),
            QueryParameterSpec("sort", sort, "form", true, false, null),
            QueryParameterSpec("q", q, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/iam/departments"), query))
        return client.convertValue(raw, object : TypeReference<SdkWorkListResponse>() {})
    }

    /** Departments tree retrieve. */
    suspend fun departmentsTreeRetrieve(): SdkWorkResourceResponse? {
        val raw = client.get(ApiPaths.appPath("/iam/departments/tree"))
        return client.convertValue(raw, object : TypeReference<SdkWorkResourceResponse>() {})
    }

    /** Iam oauth official Account Settings retrieve. */
    suspend fun oauthOfficialAccountSettingsRetrieve(): SdkWorkResourceResponse? {
        val raw = client.get(ApiPaths.appPath("/iam/oauth/official_account_settings"))
        return client.convertValue(raw, object : TypeReference<SdkWorkResourceResponse>() {})
    }

    /** Iam oauth official Accounts list. */
    suspend fun oauthOfficialAccountsList(page: Int? = null, pageSize: Int? = null, cursor: String? = null, sort: String? = null, q: String? = null): SdkWorkListResponse? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("cursor", cursor, "form", true, false, null),
            QueryParameterSpec("sort", sort, "form", true, false, null),
            QueryParameterSpec("q", q, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/iam/oauth/official_accounts"), query))
        return client.convertValue(raw, object : TypeReference<SdkWorkListResponse>() {})
    }

    /** Iam oauth official Accounts create. */
    suspend fun oauthOfficialAccountsCreate(body: Map<String, Any>): SdkWorkResourceResponse? {
        val raw = client.post(ApiPaths.appPath("/iam/oauth/official_accounts"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<SdkWorkResourceResponse>() {})
    }

    /** Iam oauth official Accounts delete. */
    suspend fun oauthOfficialAccountsDelete(officialAccountId: String): Unit {
        client.delete(ApiPaths.appPath("/iam/oauth/official_accounts/${serializePathParameter(officialAccountId, PathParameterSpec("officialAccountId", "simple", false))}"))
    }

    /** Iam oauth official Accounts retrieve. */
    suspend fun oauthOfficialAccountsRetrieve(officialAccountId: String): SdkWorkResourceResponse? {
        val raw = client.get(ApiPaths.appPath("/iam/oauth/official_accounts/${serializePathParameter(officialAccountId, PathParameterSpec("officialAccountId", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<SdkWorkResourceResponse>() {})
    }

    /** Iam oauth official Accounts update. */
    suspend fun oauthOfficialAccountsUpdate(officialAccountId: String, body: Map<String, Any>? = null): SdkWorkResourceResponse? {
        val raw = client.patch(ApiPaths.appPath("/iam/oauth/official_accounts/${serializePathParameter(officialAccountId, PathParameterSpec("officialAccountId", "simple", false))}"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<SdkWorkResourceResponse>() {})
    }

    /** Iam oauth official Accounts custom Menus publish. */
    suspend fun oauthOfficialAccountsCustomMenusPublish(officialAccountId: String, body: Map<String, Any>): SdkWorkResourceResponse? {
        val raw = client.post(ApiPaths.appPath("/iam/oauth/official_accounts/${serializePathParameter(officialAccountId, PathParameterSpec("officialAccountId", "simple", false))}/custom_menus/publish"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<SdkWorkResourceResponse>() {})
    }

    /** Iam oauth official Accounts custom Menus rollback. */
    suspend fun oauthOfficialAccountsCustomMenusRollback(officialAccountId: String, body: Map<String, Any>): SdkWorkResourceResponse? {
        val raw = client.post(ApiPaths.appPath("/iam/oauth/official_accounts/${serializePathParameter(officialAccountId, PathParameterSpec("officialAccountId", "simple", false))}/custom_menus/rollback"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<SdkWorkResourceResponse>() {})
    }

    /** Iam oauth official Accounts custom Menus sync. */
    suspend fun oauthOfficialAccountsCustomMenusSync(officialAccountId: String, body: Map<String, Any>): SdkWorkResourceResponse? {
        val raw = client.post(ApiPaths.appPath("/iam/oauth/official_accounts/${serializePathParameter(officialAccountId, PathParameterSpec("officialAccountId", "simple", false))}/custom_menus/sync"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<SdkWorkResourceResponse>() {})
    }

    /** Organization Memberships list. */
    suspend fun organizationMembershipsList(page: Int? = null, pageSize: Int? = null, cursor: String? = null, sort: String? = null, q: String? = null): SdkWorkListResponse? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("cursor", cursor, "form", true, false, null),
            QueryParameterSpec("sort", sort, "form", true, false, null),
            QueryParameterSpec("q", q, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/iam/organization_memberships"), query))
        return client.convertValue(raw, object : TypeReference<SdkWorkListResponse>() {})
    }

    /** Organizations list. */
    suspend fun organizationsList(page: Int? = null, pageSize: Int? = null, cursor: String? = null, sort: String? = null, q: String? = null): SdkWorkListResponse? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("cursor", cursor, "form", true, false, null),
            QueryParameterSpec("sort", sort, "form", true, false, null),
            QueryParameterSpec("q", q, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/iam/organizations"), query))
        return client.convertValue(raw, object : TypeReference<SdkWorkListResponse>() {})
    }

    /** Organizations members list. */
    suspend fun organizationsMembersList(organizationId: String, page: Int? = null, pageSize: Int? = null, cursor: String? = null, sort: String? = null, q: String? = null, role: String? = null): IamOrganizationMemberListResponse? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("cursor", cursor, "form", true, false, null),
            QueryParameterSpec("sort", sort, "form", true, false, null),
            QueryParameterSpec("q", q, "form", true, false, null),
            QueryParameterSpec("role", role, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/iam/organizations/${serializePathParameter(organizationId, PathParameterSpec("organizationId", "simple", false))}/members"), query))
        return client.convertValue(raw, object : TypeReference<IamOrganizationMemberListResponse>() {})
    }

    /** Organizations tree retrieve. */
    suspend fun organizationsTreeRetrieve(): SdkWorkResourceResponse? {
        val raw = client.get(ApiPaths.appPath("/iam/organizations/tree"))
        return client.convertValue(raw, object : TypeReference<SdkWorkResourceResponse>() {})
    }

    /** Persona Catalog retrieve. */
    suspend fun personaCatalogRetrieve(): IamPersonaCatalogResponse? {
        val raw = client.get(ApiPaths.appPath("/iam/persona_catalog"))
        return client.convertValue(raw, object : TypeReference<IamPersonaCatalogResponse>() {})
    }

    /** Position Assignments list. */
    suspend fun positionAssignmentsList(page: Int? = null, pageSize: Int? = null, cursor: String? = null, sort: String? = null, q: String? = null): SdkWorkListResponse? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("cursor", cursor, "form", true, false, null),
            QueryParameterSpec("sort", sort, "form", true, false, null),
            QueryParameterSpec("q", q, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/iam/position_assignments"), query))
        return client.convertValue(raw, object : TypeReference<SdkWorkListResponse>() {})
    }

    /** Positions list. */
    suspend fun positionsList(page: Int? = null, pageSize: Int? = null, cursor: String? = null, sort: String? = null, q: String? = null): SdkWorkListResponse? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("cursor", cursor, "form", true, false, null),
            QueryParameterSpec("sort", sort, "form", true, false, null),
            QueryParameterSpec("q", q, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/iam/positions"), query))
        return client.convertValue(raw, object : TypeReference<SdkWorkListResponse>() {})
    }

    /** Role Bindings list. */
    suspend fun roleBindingsList(page: Int? = null, pageSize: Int? = null, cursor: String? = null, sort: String? = null, q: String? = null, roleId: String? = null, principalKind: String? = null, principalId: String? = null, scopeKind: String? = null, scopeId: String? = null): SdkWorkListResponse? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("cursor", cursor, "form", true, false, null),
            QueryParameterSpec("sort", sort, "form", true, false, null),
            QueryParameterSpec("q", q, "form", true, false, null),
            QueryParameterSpec("roleId", roleId, "form", true, false, null),
            QueryParameterSpec("principalKind", principalKind, "form", true, false, null),
            QueryParameterSpec("principalId", principalId, "form", true, false, null),
            QueryParameterSpec("scopeKind", scopeKind, "form", true, false, null),
            QueryParameterSpec("scopeId", scopeId, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/iam/role_bindings"), query))
        return client.convertValue(raw, object : TypeReference<SdkWorkListResponse>() {})
    }

    /** Users current retrieve. */
    suspend fun usersCurrentRetrieve(): SdkWorkResourceResponse? {
        val raw = client.get(ApiPaths.appPath("/iam/users/current"))
        return client.convertValue(raw, object : TypeReference<SdkWorkResourceResponse>() {})
    }

    /** Users current update. */
    suspend fun usersCurrentUpdate(body: Map<String, Any>? = null): SdkWorkResourceResponse? {
        val raw = client.patch(ApiPaths.appPath("/iam/users/current"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<SdkWorkResourceResponse>() {})
    }

    /** Users current email Bindings delete. */
    suspend fun usersCurrentEmailBindingsDelete(): Unit {
        client.delete(ApiPaths.appPath("/iam/users/current/email_bindings"))
    }

    /** Users current email Bindings create. */
    suspend fun usersCurrentEmailBindingsCreate(body: Map<String, Any>): SdkWorkResourceResponse? {
        val raw = client.post(ApiPaths.appPath("/iam/users/current/email_bindings"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<SdkWorkResourceResponse>() {})
    }

    /** Users current password update. */
    suspend fun usersCurrentPasswordUpdate(body: Map<String, Any>? = null): SdkWorkResourceResponse? {
        val raw = client.patch(ApiPaths.appPath("/iam/users/current/password"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<SdkWorkResourceResponse>() {})
    }

    /** Users current persona delete. */
    suspend fun usersCurrentPersonaDelete(): Unit {
        client.delete(ApiPaths.appPath("/iam/users/current/persona"))
    }

    /** Users current persona retrieve. */
    suspend fun usersCurrentPersonaRetrieve(): IamUserPersonaResponse? {
        val raw = client.get(ApiPaths.appPath("/iam/users/current/persona"))
        return client.convertValue(raw, object : TypeReference<IamUserPersonaResponse>() {})
    }

    /** Users current persona update. */
    suspend fun usersCurrentPersonaUpdate(body: IamUserPersonaUpdateCommand): IamUserPersonaResponse? {
        val raw = client.put(ApiPaths.appPath("/iam/users/current/persona"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<IamUserPersonaResponse>() {})
    }

    /** Users current phone Bindings delete. */
    suspend fun usersCurrentPhoneBindingsDelete(): Unit {
        client.delete(ApiPaths.appPath("/iam/users/current/phone_bindings"))
    }

    /** Users current phone Bindings create. */
    suspend fun usersCurrentPhoneBindingsCreate(body: Map<String, Any>): SdkWorkResourceResponse? {
        val raw = client.post(ApiPaths.appPath("/iam/users/current/phone_bindings"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<SdkWorkResourceResponse>() {})
    }

    private data class PathParameterSpec(val name: String, val style: String, val explode: Boolean)

    private fun serializePathParameter(value: Any?, spec: PathParameterSpec): String {
        if (value == null) return ""
        val style = spec.style.ifBlank { "simple" }
        return when (value) {
            is Iterable<*> -> serializePathArray(spec.name, value, style, spec.explode)
            is Map<*, *> -> serializePathObject(spec.name, value, style, spec.explode)
            else -> pathPrimitivePrefix(spec.name, style) + pathEncode(value.toString())
        }
    }

    private fun serializePathArray(name: String, values: Iterable<*>, style: String, explode: Boolean): String {
        val serialized = values.mapNotNull { it?.toString()?.let(::pathEncode) }
        if (serialized.isEmpty()) return pathPrefix(name, style)
        if (style == "matrix") {
            if (explode) {
                return serialized.joinToString("") { ";$name=$it" }
            }
            return ";$name=" + serialized.joinToString(",")
        }
        val separator = if (explode) "." else ","
        return pathPrefix(name, style) + serialized.joinToString(separator)
    }

    private fun serializePathObject(name: String, values: Map<*, *>, style: String, explode: Boolean): String {
        val entries = mutableListOf<String>()
        val exploded = mutableListOf<String>()
        values.forEach { (key, value) ->
            if (value == null) return@forEach
            val escapedKey = pathEncode(key.toString())
            val escapedValue = pathEncode(value.toString())
            if (explode) {
                if (style == "matrix") {
                    exploded += ";$escapedKey=$escapedValue"
                } else {
                    exploded += "$escapedKey=$escapedValue"
                }
            } else {
                entries += escapedKey
                entries += escapedValue
            }
        }
        if (style == "matrix") {
            if (explode) return exploded.joinToString("")
            return ";$name=" + entries.joinToString(",")
        }
        if (explode) {
            val separator = if (style == "label") "." else ","
            return pathPrefix(name, style) + exploded.joinToString(separator)
        }
        return pathPrefix(name, style) + entries.joinToString(",")
    }

    private fun pathPrefix(name: String, style: String): String {
        return when (style) {
            "label" -> "."
            "matrix" -> ";$name"
            else -> ""
        }
    }

    private fun pathPrimitivePrefix(name: String, style: String): String {
        return if (style == "matrix") ";$name=" else pathPrefix(name, style)
    }

    private fun pathEncode(value: String): String {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20")
    }

    private data class QueryParameterSpec(
        val name: String,
        val value: Any?,
        val style: String,
        val explode: Boolean,
        val allowReserved: Boolean,
        val contentType: String?,
    )

    private val queryObjectMapper = ObjectMapper().registerKotlinModule()

    private fun buildQueryString(parameters: List<QueryParameterSpec>): String {
        val pairs = mutableListOf<String>()
        parameters.forEach { appendSerializedParameter(pairs, it) }
        return pairs.joinToString("&")
    }

    private fun appendSerializedParameter(pairs: MutableList<String>, parameter: QueryParameterSpec) {
        val value = parameter.value ?: return
        if (!parameter.contentType.isNullOrBlank()) {
            val json = queryObjectMapper.writeValueAsString(value)
            pairs += urlEncode(parameter.name) + "=" + encodeQueryValue(json, parameter.allowReserved)
            return
        }

        val style = parameter.style.ifBlank { "form" }
        when (value) {
            is Iterable<*> -> appendArrayParameter(pairs, parameter.name, value, style, parameter.explode, parameter.allowReserved)
            is Map<*, *> -> if (style == "deepObject") {
                appendDeepObjectParameter(pairs, parameter.name, value, parameter.allowReserved)
            } else {
                appendObjectParameter(pairs, parameter.name, value, style, parameter.explode, parameter.allowReserved)
            }
            else -> pairs += urlEncode(parameter.name) + "=" + encodeQueryValue(value.toString(), parameter.allowReserved)
        }
    }

    private fun appendArrayParameter(
        pairs: MutableList<String>,
        name: String,
        values: Iterable<*>,
        style: String,
        explode: Boolean,
        allowReserved: Boolean,
    ) {
        val serialized = values.mapNotNull { it?.toString() }
        if (serialized.isEmpty()) return
        if (style == "form" && explode) {
            serialized.forEach { pairs += urlEncode(name) + "=" + encodeQueryValue(it, allowReserved) }
            return
        }
        pairs += urlEncode(name) + "=" + encodeQueryValue(serialized.joinToString(","), allowReserved)
    }

    private fun appendObjectParameter(
        pairs: MutableList<String>,
        name: String,
        values: Map<*, *>,
        style: String,
        explode: Boolean,
        allowReserved: Boolean,
    ) {
        val serialized = mutableListOf<String>()
        values.forEach { (key, value) ->
            if (value == null) return@forEach
            if (style == "form" && explode) {
                pairs += urlEncode(key.toString()) + "=" + encodeQueryValue(value.toString(), allowReserved)
            } else {
                serialized += key.toString()
                serialized += value.toString()
            }
        }
        if (serialized.isNotEmpty()) {
            pairs += urlEncode(name) + "=" + encodeQueryValue(serialized.joinToString(","), allowReserved)
        }
    }

    private fun appendDeepObjectParameter(pairs: MutableList<String>, name: String, values: Map<*, *>, allowReserved: Boolean) {
        values.forEach { (key, value) ->
            if (value != null) {
                pairs += urlEncode("$name[$key]") + "=" + encodeQueryValue(value.toString(), allowReserved)
            }
        }
    }

    private fun encodeQueryValue(value: String, allowReserved: Boolean): String {
        var encoded = urlEncode(value)
        if (!allowReserved) return encoded
        mapOf(
            "%3A" to ":", "%2F" to "/", "%3F" to "?", "%23" to "#",
            "%5B" to "[", "%5D" to "]", "%40" to "@", "%21" to "!",
            "%24" to "$", "%26" to "&", "%27" to "'", "%28" to "(",
            "%29" to ")", "%2A" to "*", "%2B" to "+", "%2C" to ",",
            "%3B" to ";", "%3D" to "=",
        ).forEach { (escaped, reserved) -> encoded = encoded.replace(escaped, reserved) }
        return encoded
    }

    private fun urlEncode(value: String): String {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8)
    }

}
