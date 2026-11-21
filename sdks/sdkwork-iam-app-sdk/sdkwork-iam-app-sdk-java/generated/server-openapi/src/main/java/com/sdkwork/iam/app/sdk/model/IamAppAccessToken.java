package com.sdkwork.iam.app.sdk.model;


public class IamAppAccessToken {
    private String accessToken;
    private String authToken;
    private String expiresAt;
    private String appId;
    private String installationId;
    private String organizationId;
    private String ownershipScope;
    private String sessionId;
    private String environment;

    public String getAccessToken() {
        return this.accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getAuthToken() {
        return this.authToken;
    }

    public void setAuthToken(String authToken) {
        this.authToken = authToken;
    }

    public String getExpiresAt() {
        return this.expiresAt;
    }

    public void setExpiresAt(String expiresAt) {
        this.expiresAt = expiresAt;
    }

    public String getAppId() {
        return this.appId;
    }

    public void setAppId(String appId) {
        this.appId = appId;
    }

    public String getInstallationId() {
        return this.installationId;
    }

    public void setInstallationId(String installationId) {
        this.installationId = installationId;
    }

    public String getOrganizationId() {
        return this.organizationId;
    }

    public void setOrganizationId(String organizationId) {
        this.organizationId = organizationId;
    }

    public String getOwnershipScope() {
        return this.ownershipScope;
    }

    public void setOwnershipScope(String ownershipScope) {
        this.ownershipScope = ownershipScope;
    }

    public String getSessionId() {
        return this.sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getEnvironment() {
        return this.environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }
}
