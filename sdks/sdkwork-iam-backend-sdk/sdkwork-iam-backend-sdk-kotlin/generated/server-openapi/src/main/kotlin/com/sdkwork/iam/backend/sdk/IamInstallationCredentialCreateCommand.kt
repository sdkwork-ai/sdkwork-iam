package com.sdkwork.iam.backend.sdk

data class IamInstallationCredentialCreateCommand(
    val environmentKey: String? = null,
    val clientId: String? = null,
    val redirectUris: List<String>? = null,
    val grantedScopes: List<String>? = null
)
