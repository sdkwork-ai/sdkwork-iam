package com.sdkwork.iam.backend.sdk

data class ServiceAccountCredentialCreateCommand(
    val installationId: String? = null,
    val expiresAt: String? = null
)
