package com.sdkwork.iam.backend.sdk

data class IamInstallationManagementUpdateCommand(
    val primaryDomain: String? = null,
    val accessPermissions: List<String>? = null
)
