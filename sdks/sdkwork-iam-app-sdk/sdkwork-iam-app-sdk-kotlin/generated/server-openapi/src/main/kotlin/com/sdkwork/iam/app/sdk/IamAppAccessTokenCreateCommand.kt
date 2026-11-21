package com.sdkwork.iam.app.sdk

data class IamAppAccessTokenCreateCommand(
    val appId: String? = null,
    val installationId: String? = null,
    val instanceKey: String? = null,
    val environment: String? = null,
    val ownershipScope: String? = null
)
