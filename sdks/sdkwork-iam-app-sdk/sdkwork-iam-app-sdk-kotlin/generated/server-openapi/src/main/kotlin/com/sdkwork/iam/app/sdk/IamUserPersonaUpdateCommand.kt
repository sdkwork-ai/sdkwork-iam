package com.sdkwork.iam.app.sdk

data class IamUserPersonaUpdateCommand(
    val role: String? = null,
    val interests: List<String>? = null,
    val promptDismissed: Boolean? = null
)
