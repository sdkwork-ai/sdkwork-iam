package com.sdkwork.iam.backend.sdk.model;


public class ServiceAccountCredentialCreateCommand {
    private String tenantApplicationId;
    private String expiresAt;

    public String getTenantApplicationId() {
        return this.tenantApplicationId;
    }

    public void setTenantApplicationId(String tenantApplicationId) {
        this.tenantApplicationId = tenantApplicationId;
    }

    public String getExpiresAt() {
        return this.expiresAt;
    }

    public void setExpiresAt(String expiresAt) {
        this.expiresAt = expiresAt;
    }
}
