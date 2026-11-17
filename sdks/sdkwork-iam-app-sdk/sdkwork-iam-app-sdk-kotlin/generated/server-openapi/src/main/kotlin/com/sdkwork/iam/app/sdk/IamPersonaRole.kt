package com.sdkwork.iam.app.sdk

data class IamPersonaRole(
    val code: String? = null,
    val iamRoleCode: String? = null,
    val sortOrder: Int? = null,
    val labels: Map<String, String>? = null,
    val descriptions: Map<String, String>? = null
)
