import Foundation

public struct SdkWorkApiResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SdkWorkResourceData: Codable {
    public let item: [String: Any]?


    public init(item: [String: Any]? = nil) {
        self.item = item
    }
}

public struct SdkWorkPageData: Codable {
    public let items: [[String: Any]]?
    public let pageInfo: PageInfo?


    public init(items: [[String: Any]]? = nil, pageInfo: PageInfo? = nil) {
        self.items = items
        self.pageInfo = pageInfo
    }
}

public struct SdkWorkCommandData: Codable {
    public let accepted: Bool?
    public let resourceId: String?
    public let status: String?


    public init(accepted: Bool? = nil, resourceId: String? = nil, status: String? = nil) {
        self.accepted = accepted
        self.resourceId = resourceId
        self.status = status
    }
}

public struct PageInfo: Codable {
    public let mode: String?
    public let page: Int?
    public let pageSize: Int?
    public let totalItems: String?
    public let totalPages: Int?
    public let nextCursor: String?
    public let hasMore: Bool?


    public init(mode: String? = nil, page: Int? = nil, pageSize: Int? = nil, totalItems: String? = nil, totalPages: Int? = nil, nextCursor: String? = nil, hasMore: Bool? = nil) {
        self.mode = mode
        self.page = page
        self.pageSize = pageSize
        self.totalItems = totalItems
        self.totalPages = totalPages
        self.nextCursor = nextCursor
        self.hasMore = hasMore
    }
}

public struct ProblemDetail: Codable {
    public let type: String?
    public let title: String?
    public let status: Int?
    public let detail: String?
    public let instance: String?
    public let code: Int?
    public let traceId: String?
    public let i18nKey: String?
    public let locale: String?
    public let errors: [FieldError]?


    public init(type: String? = nil, title: String? = nil, status: Int? = nil, detail: String? = nil, instance: String? = nil, code: Int? = nil, traceId: String? = nil, i18nKey: String? = nil, locale: String? = nil, errors: [FieldError]? = nil) {
        self.type = type
        self.title = title
        self.status = status
        self.detail = detail
        self.instance = instance
        self.code = code
        self.traceId = traceId
        self.i18nKey = i18nKey
        self.locale = locale
        self.errors = errors
    }
}

public struct FieldError: Codable {
    public let field: String?
    public let message: String?
    public let code: Int?
    public let i18nKey: String?
    public let params: [String: String]?


    public init(field: String? = nil, message: String? = nil, code: Int? = nil, i18nKey: String? = nil, params: [String: String]? = nil) {
        self.field = field
        self.message = message
        self.code = code
        self.i18nKey = i18nKey
        self.params = params
    }
}

public struct SdkWorkResourceResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SdkWorkListResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SdkWorkCommandResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct IamOauthClientCreateCommand: Codable {
    public let integrationId: String?
    public let providerCode: String?
    public let clientCode: String?
    public let displayName: String?
    public let providerClientId: String?
    public let providerTenantId: String?


    public init(integrationId: String? = nil, providerCode: String? = nil, clientCode: String? = nil, displayName: String? = nil, providerClientId: String? = nil, providerTenantId: String? = nil) {
        self.integrationId = integrationId
        self.providerCode = providerCode
        self.clientCode = clientCode
        self.displayName = displayName
        self.providerClientId = providerClientId
        self.providerTenantId = providerTenantId
    }
}

public struct AppbaseApplicationRegisterCommand: Codable {
    public let authToken: String?
    public let username: String?
    public let email: String?
    public let phone: String?
    public let password: String?
    public let ownerTenantId: String?
    public let appKey: String?
    public let name: String?
    public let displayName: String?
    public let appType: String?
    public let packageName: String?
    public let bundleId: String?
    public let desktopAppId: String?
    public let version: String?
    public let channel: String?
    public let manifestHash: String?
    public let defaultAccessPermissions: [String]?
    public let config: [String: Any]?
    public let packages: [[String: Any]]?


    public init(authToken: String? = nil, username: String? = nil, email: String? = nil, phone: String? = nil, password: String? = nil, ownerTenantId: String? = nil, appKey: String? = nil, name: String? = nil, displayName: String? = nil, appType: String? = nil, packageName: String? = nil, bundleId: String? = nil, desktopAppId: String? = nil, version: String? = nil, channel: String? = nil, manifestHash: String? = nil, defaultAccessPermissions: [String]? = nil, config: [String: Any]? = nil, packages: [[String: Any]]? = nil) {
        self.authToken = authToken
        self.username = username
        self.email = email
        self.phone = phone
        self.password = password
        self.ownerTenantId = ownerTenantId
        self.appKey = appKey
        self.name = name
        self.displayName = displayName
        self.appType = appType
        self.packageName = packageName
        self.bundleId = bundleId
        self.desktopAppId = desktopAppId
        self.version = version
        self.channel = channel
        self.manifestHash = manifestHash
        self.defaultAccessPermissions = defaultAccessPermissions
        self.config = config
        self.packages = packages
    }
}

public struct IamTenantApplicationManagementProvisionCommand: Codable {
    public let organizationId: String?
    public let templateId: String?
    public let appKey: String?
    public let instanceKey: String?
    public let displayName: String?
    public let environment: String?
    public let applicationType: String?
    public let primaryDomain: String?
    public let accessPermissions: [String]?


    public init(organizationId: String? = nil, templateId: String? = nil, appKey: String? = nil, instanceKey: String? = nil, displayName: String? = nil, environment: String? = nil, applicationType: String? = nil, primaryDomain: String? = nil, accessPermissions: [String]? = nil) {
        self.organizationId = organizationId
        self.templateId = templateId
        self.appKey = appKey
        self.instanceKey = instanceKey
        self.displayName = displayName
        self.environment = environment
        self.applicationType = applicationType
        self.primaryDomain = primaryDomain
        self.accessPermissions = accessPermissions
    }
}

public struct IamTenantApplicationManagementUpdateCommand: Codable {
    public let primaryDomain: String?
    public let accessPermissions: [String]?


    public init(primaryDomain: String? = nil, accessPermissions: [String]? = nil) {
        self.primaryDomain = primaryDomain
        self.accessPermissions = accessPermissions
    }
}

public struct IamTenantApplicationStatusCommand: Codable {

    public init() {}
}

public struct AppbaseTenantApplicationProvisionCommand: Codable {
    public let authToken: String?
    public let username: String?
    public let email: String?
    public let phone: String?
    public let password: String?
    public let tenantId: String?
    public let organizationId: String?
    public let templateId: String?
    public let appKey: String?
    public let instanceKey: String?
    public let displayName: String?
    public let environment: String?
    public let applicationType: String?
    public let primaryDomain: String?
    public let accessPermissions: [String]?
    public let runtimeConfig: [String: Any]?


    public init(authToken: String? = nil, username: String? = nil, email: String? = nil, phone: String? = nil, password: String? = nil, tenantId: String? = nil, organizationId: String? = nil, templateId: String? = nil, appKey: String? = nil, instanceKey: String? = nil, displayName: String? = nil, environment: String? = nil, applicationType: String? = nil, primaryDomain: String? = nil, accessPermissions: [String]? = nil, runtimeConfig: [String: Any]? = nil) {
        self.authToken = authToken
        self.username = username
        self.email = email
        self.phone = phone
        self.password = password
        self.tenantId = tenantId
        self.organizationId = organizationId
        self.templateId = templateId
        self.appKey = appKey
        self.instanceKey = instanceKey
        self.displayName = displayName
        self.environment = environment
        self.applicationType = applicationType
        self.primaryDomain = primaryDomain
        self.accessPermissions = accessPermissions
        self.runtimeConfig = runtimeConfig
    }
}

public struct AppbaseTenantApplicationUpdateCommand: Codable {
    public let authToken: String?
    public let username: String?
    public let email: String?
    public let phone: String?
    public let password: String?
    public let primaryDomain: String?
    public let domainConfig: [String: Any]?
    public let accessPermissions: [String]?
    public let runtimeConfig: [String: Any]?


    public init(authToken: String? = nil, username: String? = nil, email: String? = nil, phone: String? = nil, password: String? = nil, primaryDomain: String? = nil, domainConfig: [String: Any]? = nil, accessPermissions: [String]? = nil, runtimeConfig: [String: Any]? = nil) {
        self.authToken = authToken
        self.username = username
        self.email = email
        self.phone = phone
        self.password = password
        self.primaryDomain = primaryDomain
        self.domainConfig = domainConfig
        self.accessPermissions = accessPermissions
        self.runtimeConfig = runtimeConfig
    }
}

public struct AppbaseTenantApplicationEnableCommand: Codable {
    public let authToken: String?
    public let username: String?
    public let email: String?
    public let phone: String?
    public let password: String?


    public init(authToken: String? = nil, username: String? = nil, email: String? = nil, phone: String? = nil, password: String? = nil) {
        self.authToken = authToken
        self.username = username
        self.email = email
        self.phone = phone
        self.password = password
    }
}

public struct AppbaseAccessCredentialCreateCommand: Codable {
    public let authToken: String?
    public let username: String?
    public let email: String?
    public let phone: String?
    public let password: String?
    public let tenantId: String?
    public let organizationId: String?
    public let tenantApplicationId: String?
    public let appId: String?
    public let instanceKey: String?


    public init(authToken: String? = nil, username: String? = nil, email: String? = nil, phone: String? = nil, password: String? = nil, tenantId: String? = nil, organizationId: String? = nil, tenantApplicationId: String? = nil, appId: String? = nil, instanceKey: String? = nil) {
        self.authToken = authToken
        self.username = username
        self.email = email
        self.phone = phone
        self.password = password
        self.tenantId = tenantId
        self.organizationId = organizationId
        self.tenantApplicationId = tenantApplicationId
        self.appId = appId
        self.instanceKey = instanceKey
    }
}

public struct ServiceAccountCredentialCreateCommand: Codable {
    public let tenantApplicationId: String?
    public let expiresAt: String?


    public init(tenantApplicationId: String? = nil, expiresAt: String? = nil) {
        self.tenantApplicationId = tenantApplicationId
        self.expiresAt = expiresAt
    }
}

public struct ServiceAccountCredentialRevokeCommand: Codable {

    public init() {}
}

public struct ServiceAccountTokenExchangeCommand: Codable {
    public let clientId: String?
    public let clientSecret: String?


    public init(clientId: String? = nil, clientSecret: String? = nil) {
        self.clientId = clientId
        self.clientSecret = clientSecret
    }
}
