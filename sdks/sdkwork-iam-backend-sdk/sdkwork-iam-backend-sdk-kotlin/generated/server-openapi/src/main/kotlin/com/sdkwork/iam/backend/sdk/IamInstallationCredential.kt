package com.sdkwork.iam.backend.sdk

data class IamInstallationCredential(
    val credentialId: String? = null,
    val tenantId: String? = null,
    val installationEnvironmentId: String? = null,
    val environmentKey: String? = null,
    val clientId: String? = null,
    val redirectUris: List<String>? = null,
    val grantedScopes: List<String>? = null,
    val status: String? = null,
    val rotatedAt: String? = null,
    val retiredAt: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)
