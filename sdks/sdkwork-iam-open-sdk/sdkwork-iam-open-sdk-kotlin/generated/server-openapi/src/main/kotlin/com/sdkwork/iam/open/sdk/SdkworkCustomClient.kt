package com.sdkwork.iam.open.sdk

import com.sdkwork.common.core.SdkConfig
import com.sdkwork.iam.open.sdk.http.HttpClient


open class SdkworkCustomClient {
    private val httpClient: HttpClient



    constructor(baseUrl: String) {
        this.httpClient = HttpClient(baseUrl)

    }

    constructor(config: SdkConfig) {
        this.httpClient = HttpClient(config)

    }

    fun setApiKey(apiKey: String): SdkworkCustomClient {
        httpClient.setApiKey(apiKey)
        return this
    }

    fun setAuthToken(token: String): SdkworkCustomClient {
        httpClient.setAuthToken(token)
        return this
    }

    fun setAccessToken(token: String): SdkworkCustomClient {
        httpClient.setAccessToken(token)
        return this
    }

    fun setHeader(key: String, value: String): SdkworkCustomClient {
        httpClient.setHeader(key, value)
        return this
    }
}
