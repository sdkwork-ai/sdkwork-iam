package com.sdkwork.iam.app.sdk

data class AppbaseSessionCreateCommand(
    val grantType: String? = null,
    val account: String? = null,
    val email: String? = null,
    val username: String? = null,
    val phone: String? = null,
    val password: String? = null,
    val externalToken: String? = null,
    val providerKey: String? = null,
    val tenantId: String? = null,
    val organizationId: String? = null,
    val deviceId: String? = null
)
