package com.sdkwork.iam.app.sdk

data class IamOrganizationMember(
    val userId: String? = null,
    val membershipId: String? = null,
    val displayName: String? = null,
    val username: String? = null,
    val email: String? = null,
    val membershipKind: String? = null,
    val status: String? = null,
    val isPrimary: Boolean? = null
)
