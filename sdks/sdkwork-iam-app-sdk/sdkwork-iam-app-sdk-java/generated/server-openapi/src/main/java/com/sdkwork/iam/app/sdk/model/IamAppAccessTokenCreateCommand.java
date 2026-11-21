package com.sdkwork.iam.app.sdk.model;


public class IamAppAccessTokenCreateCommand {
    private String appId;
    private String installationId;
    private String instanceKey;
    private String environment;
    private String ownershipScope;

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

    public String getInstanceKey() {
        return this.instanceKey;
    }

    public void setInstanceKey(String instanceKey) {
        this.instanceKey = instanceKey;
    }

    public String getEnvironment() {
        return this.environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public String getOwnershipScope() {
        return this.ownershipScope;
    }

    public void setOwnershipScope(String ownershipScope) {
        this.ownershipScope = ownershipScope;
    }
}
