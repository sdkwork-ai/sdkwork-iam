package com.sdkwork.iam.app.sdk

data class IamPersonaCatalog(
    val version: String? = null,
    val roles: List<IamPersonaRole>? = null,
    val interests: List<IamPersonaInterest>? = null
)
