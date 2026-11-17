package com.sdkwork.iam.app.sdk.model;


public class OauthPhoneBindingVerificationCodeRequestCommand {
    private String continuationToken;
    private String phone;

    public String getContinuationToken() {
        return this.continuationToken;
    }

    public void setContinuationToken(String continuationToken) {
        this.continuationToken = continuationToken;
    }

    public String getPhone() {
        return this.phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }
}
