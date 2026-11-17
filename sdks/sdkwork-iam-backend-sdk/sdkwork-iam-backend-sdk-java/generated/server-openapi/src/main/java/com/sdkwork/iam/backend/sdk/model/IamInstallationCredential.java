package com.sdkwork.iam.backend.sdk.model;

import java.util.List;

public class IamInstallationCredential {
    private String credentialId;
    private String tenantId;
    private String installationEnvironmentId;
    private String environmentKey;
    private String clientId;
    private List<String> redirectUris;
    private List<String> grantedScopes;
    private String status;
    private String rotatedAt;
    private String retiredAt;
    private String createdAt;
    private String updatedAt;

    public String getCredentialId() {
        return this.credentialId;
    }

    public void setCredentialId(String credentialId) {
        this.credentialId = credentialId;
    }

    public String getTenantId() {
        return this.tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getInstallationEnvironmentId() {
        return this.installationEnvironmentId;
    }

    public void setInstallationEnvironmentId(String installationEnvironmentId) {
        this.installationEnvironmentId = installationEnvironmentId;
    }

    public String getEnvironmentKey() {
        return this.environmentKey;
    }

    public void setEnvironmentKey(String environmentKey) {
        this.environmentKey = environmentKey;
    }

    public String getClientId() {
        return this.clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public List<String> getRedirectUris() {
        return this.redirectUris;
    }

    public void setRedirectUris(List<String> redirectUris) {
        this.redirectUris = redirectUris;
    }

    public List<String> getGrantedScopes() {
        return this.grantedScopes;
    }

    public void setGrantedScopes(List<String> grantedScopes) {
        this.grantedScopes = grantedScopes;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getRotatedAt() {
        return this.rotatedAt;
    }

    public void setRotatedAt(String rotatedAt) {
        this.rotatedAt = rotatedAt;
    }

    public String getRetiredAt() {
        return this.retiredAt;
    }

    public void setRetiredAt(String retiredAt) {
        this.retiredAt = retiredAt;
    }

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return this.updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
