package com.sdkwork.iam.backend.sdk.model;

import java.util.List;
import java.util.Map;

public class AppbaseTenantApplicationProvisionCommand {
    private String authToken;
    private String username;
    private String email;
    private String phone;
    private String password;
    private String tenantId;
    private String organizationId;
    private String instanceKey;
    private String displayName;
    private String environment;
    private String applicationType;
    private String primaryDomain;
    private List<String> accessPermissions;
    private Map<String, Object> runtimeConfig;
    private String deployApplicationId;
    private String ownershipScope;
    private String ownerUserId;
    private String provisioningIdempotencyKey;

    public String getAuthToken() {
        return this.authToken;
    }

    public void setAuthToken(String authToken) {
        this.authToken = authToken;
    }

    public String getUsername() {
        return this.username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return this.email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return this.phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getPassword() {
        return this.password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getTenantId() {
        return this.tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getOrganizationId() {
        return this.organizationId;
    }

    public void setOrganizationId(String organizationId) {
        this.organizationId = organizationId;
    }

    public String getInstanceKey() {
        return this.instanceKey;
    }

    public void setInstanceKey(String instanceKey) {
        this.instanceKey = instanceKey;
    }

    public String getDisplayName() {
        return this.displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getEnvironment() {
        return this.environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public String getApplicationType() {
        return this.applicationType;
    }

    public void setApplicationType(String applicationType) {
        this.applicationType = applicationType;
    }

    public String getPrimaryDomain() {
        return this.primaryDomain;
    }

    public void setPrimaryDomain(String primaryDomain) {
        this.primaryDomain = primaryDomain;
    }

    public List<String> getAccessPermissions() {
        return this.accessPermissions;
    }

    public void setAccessPermissions(List<String> accessPermissions) {
        this.accessPermissions = accessPermissions;
    }

    public Map<String, Object> getRuntimeConfig() {
        return this.runtimeConfig;
    }

    public void setRuntimeConfig(Map<String, Object> runtimeConfig) {
        this.runtimeConfig = runtimeConfig;
    }

    public String getDeployApplicationId() {
        return this.deployApplicationId;
    }

    public void setDeployApplicationId(String deployApplicationId) {
        this.deployApplicationId = deployApplicationId;
    }

    public String getOwnershipScope() {
        return this.ownershipScope;
    }

    public void setOwnershipScope(String ownershipScope) {
        this.ownershipScope = ownershipScope;
    }

    public String getOwnerUserId() {
        return this.ownerUserId;
    }

    public void setOwnerUserId(String ownerUserId) {
        this.ownerUserId = ownerUserId;
    }

    public String getProvisioningIdempotencyKey() {
        return this.provisioningIdempotencyKey;
    }

    public void setProvisioningIdempotencyKey(String provisioningIdempotencyKey) {
        this.provisioningIdempotencyKey = provisioningIdempotencyKey;
    }
}
