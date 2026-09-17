package com.sdkwork.iam.backend.sdk

data class ServiceAccountCredentialCreateCommand(
    val tenantApplicationId: String? = null,
    val expiresAt: String? = null
)
