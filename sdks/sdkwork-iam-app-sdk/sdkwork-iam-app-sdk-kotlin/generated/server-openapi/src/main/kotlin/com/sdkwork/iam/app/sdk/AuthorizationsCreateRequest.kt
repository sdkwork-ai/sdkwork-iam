package com.sdkwork.iam.app.sdk

data class AuthorizationsCreateRequest(
    val clientId: String? = null,
    val responseType: String? = null,
    val redirectUri: String? = null,
    val scope: String? = null,
    val state: String? = null,
    val codeChallenge: String? = null,
    val codeChallengeMethod: String? = null,
    val tenantId: String? = null
)
