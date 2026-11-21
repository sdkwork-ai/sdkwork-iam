import Foundation
import SDKworkCommon

public class SdkworkCustomClient {
    private let httpClient: HttpClient


    public init(baseURL: String) {
        self.httpClient = HttpClient(baseURL: baseURL)

    }

    public init(config: SdkConfig) {
        self.httpClient = HttpClient(config: config)

    }

    public func setApiKey(_ apiKey: String) -> SdkworkCustomClient {
        httpClient.setApiKey(apiKey)
        return self
    }

    public func setAuthToken(_ token: String) -> SdkworkCustomClient {
        httpClient.setAuthToken(token)
        return self
    }

    public func setAccessToken(_ token: String) -> SdkworkCustomClient {
        httpClient.setAccessToken(token)
        return self
    }

    public func setHeader(_ key: String, value: String) -> SdkworkCustomClient {
        httpClient.setHeader(key, value: value)
        return self
    }
}
