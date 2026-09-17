package com.sdkwork.iam.backend.sdk.model;

import java.util.List;

public class IamTenantApplicationManagementProvisionCommand {
    private String organizationId;
    private String templateId;
    private String appKey;
    private String instanceKey;
    private String displayName;
    private String environment;
    private String applicationType;
    private String primaryDomain;
    private List<String> accessPermissions;

    public String getOrganizationId() {
        return this.organizationId;
    }

    public void setOrganizationId(String organizationId) {
        this.organizationId = organizationId;
    }

    public String getTemplateId() {
        return this.templateId;
    }

    public void setTemplateId(String templateId) {
        this.templateId = templateId;
    }

    public String getAppKey() {
        return this.appKey;
    }

    public void setAppKey(String appKey) {
        this.appKey = appKey;
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
}
