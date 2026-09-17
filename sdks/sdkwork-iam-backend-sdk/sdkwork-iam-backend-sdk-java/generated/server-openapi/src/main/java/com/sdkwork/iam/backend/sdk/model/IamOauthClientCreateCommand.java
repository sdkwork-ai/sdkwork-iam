package com.sdkwork.iam.backend.sdk.model;


public class IamOauthClientCreateCommand {
    private String integrationId;
    private String providerCode;
    private String clientCode;
    private String displayName;
    private String providerClientId;
    private String providerTenantId;

    public String getIntegrationId() {
        return this.integrationId;
    }

    public void setIntegrationId(String integrationId) {
        this.integrationId = integrationId;
    }

    public String getProviderCode() {
        return this.providerCode;
    }

    public void setProviderCode(String providerCode) {
        this.providerCode = providerCode;
    }

    public String getClientCode() {
        return this.clientCode;
    }

    public void setClientCode(String clientCode) {
        this.clientCode = clientCode;
    }

    public String getDisplayName() {
        return this.displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getProviderClientId() {
        return this.providerClientId;
    }

    public void setProviderClientId(String providerClientId) {
        this.providerClientId = providerClientId;
    }

    public String getProviderTenantId() {
        return this.providerTenantId;
    }

    public void setProviderTenantId(String providerTenantId) {
        this.providerTenantId = providerTenantId;
    }
}
