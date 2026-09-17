package com.sdkwork.iam.backend.sdk

data class IamTenantApplicationManagementUpdateCommand(
    val primaryDomain: String? = null,
    val accessPermissions: List<String>? = null
)
