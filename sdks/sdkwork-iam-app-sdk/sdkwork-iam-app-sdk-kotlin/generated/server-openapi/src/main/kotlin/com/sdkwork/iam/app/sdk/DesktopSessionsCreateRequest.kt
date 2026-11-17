package com.sdkwork.iam.app.sdk

data class DesktopSessionsCreateRequest(
    val clientId: String? = null,
    val authorizationCode: String? = null,
    val codeVerifier: String? = null,
    val redirectUri: String? = null,
    val clientSecret: String? = null,
    val deviceId: String? = null
)
