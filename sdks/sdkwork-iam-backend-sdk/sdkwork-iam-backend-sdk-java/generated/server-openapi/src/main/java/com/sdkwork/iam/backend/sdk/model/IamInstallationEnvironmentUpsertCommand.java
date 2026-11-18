package com.sdkwork.iam.backend.sdk.model;

import java.util.Map;

public class IamInstallationEnvironmentUpsertCommand {
    private String environmentKey;
    private String primaryDomain;
    private Map<String, Object> domainConfig;
    private String status;

    public String getEnvironmentKey() {
        return this.environmentKey;
    }

    public void setEnvironmentKey(String environmentKey) {
        this.environmentKey = environmentKey;
    }

    public String getPrimaryDomain() {
        return this.primaryDomain;
    }

    public void setPrimaryDomain(String primaryDomain) {
        this.primaryDomain = primaryDomain;
    }

    public Map<String, Object> getDomainConfig() {
        return this.domainConfig;
    }

    public void setDomainConfig(Map<String, Object> domainConfig) {
        this.domainConfig = domainConfig;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
