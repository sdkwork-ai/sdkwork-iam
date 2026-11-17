package com.sdkwork.iam.backend.sdk

data class IamTenantApplicationManagementProvisionCommand(
    val organizationId: String? = null,
    val instanceKey: String? = null,
    val displayName: String? = null,
    val environment: String? = null,
    val applicationType: String? = null,
    val primaryDomain: String? = null,
    val accessPermissions: List<String>? = null,
    val runtimeConfig: Map<String, Any>? = null,
    val deployApplicationId: String? = null,
    val provisioningIdempotencyKey: String? = null
)
