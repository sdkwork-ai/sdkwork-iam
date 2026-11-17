package com.sdkwork.iam.app.sdk.model;


public class SessionsCurrentLogoutRequest {
    private String refreshToken;

    public String getRefreshToken() {
        return this.refreshToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }
}
