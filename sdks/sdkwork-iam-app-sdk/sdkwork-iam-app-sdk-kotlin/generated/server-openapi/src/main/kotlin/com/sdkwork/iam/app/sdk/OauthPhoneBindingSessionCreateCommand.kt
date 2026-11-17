package com.sdkwork.iam.app.sdk

data class OauthPhoneBindingSessionCreateCommand(
    val continuationToken: String? = null,
    val phone: String? = null,
    val verificationCode: String? = null,
    val surfaceCode: String? = null,
    val deviceId: String? = null
)
