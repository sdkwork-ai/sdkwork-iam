import Foundation

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
