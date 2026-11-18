package com.sdkwork.iam.backend.sdk

data class IamInstallationEnvironment(
    val environmentId: String? = null,
    val tenantId: String? = null,
    val organizationId: String? = null,
    val installationId: String? = null,
    val environmentKey: String? = null,
    val primaryDomain: String? = null,
    val domainConfig: Map<String, Any>? = null,
    val status: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)
