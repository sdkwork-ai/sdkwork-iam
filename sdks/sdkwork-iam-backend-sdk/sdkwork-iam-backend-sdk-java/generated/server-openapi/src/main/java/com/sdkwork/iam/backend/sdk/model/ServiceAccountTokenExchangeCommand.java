package com.sdkwork.iam.backend.sdk.model;


public class ServiceAccountTokenExchangeCommand {
    private String clientId;
    private String clientSecret;

    public String getClientId() {
        return this.clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecret() {
        return this.clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }
}
