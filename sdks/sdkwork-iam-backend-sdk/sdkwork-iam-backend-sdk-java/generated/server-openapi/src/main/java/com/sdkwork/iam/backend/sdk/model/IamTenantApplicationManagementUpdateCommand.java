package com.sdkwork.iam.backend.sdk.model;

import java.util.List;

public class IamTenantApplicationManagementUpdateCommand {
    private String primaryDomain;
    private List<String> accessPermissions;

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
