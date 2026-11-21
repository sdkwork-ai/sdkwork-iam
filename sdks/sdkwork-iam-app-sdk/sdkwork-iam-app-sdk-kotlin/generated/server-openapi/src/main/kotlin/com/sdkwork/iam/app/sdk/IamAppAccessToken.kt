package com.sdkwork.iam.app.sdk

data class IamAppAccessToken(
    val accessToken: String? = null,
    val authToken: String? = null,
    val expiresAt: String? = null,
    val appId: String? = null,
    val installationId: String? = null,
    val organizationId: String? = null,
    val ownershipScope: String? = null,
    val sessionId: String? = null,
    val environment: String? = null
)
