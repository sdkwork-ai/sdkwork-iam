package com.sdkwork.iam.app.sdk

data class IamUserPersona(
    val role: String? = null,
    val interests: List<String>? = null,
    val promptDismissed: Boolean? = null,
    val hasSelection: Boolean? = null,
    val catalogVersion: String? = null,
    val updatedAt: String? = null
)
