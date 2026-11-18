package com.sdkwork.iam.backend.sdk

data class IamInstallationEnvironmentUpsertCommand(
    val environmentKey: String? = null,
    val primaryDomain: String? = null,
    val domainConfig: Map<String, Any>? = null,
    val status: String? = null
)
