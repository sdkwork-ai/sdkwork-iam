package com.sdkwork.iam.backend.sdk

data class IamOauthClientCreateCommand(
    val integrationId: String? = null,
    val providerCode: String? = null,
    val clientCode: String? = null,
    val displayName: String? = null,
    val providerClientId: String? = null,
    val providerTenantId: String? = null
)
