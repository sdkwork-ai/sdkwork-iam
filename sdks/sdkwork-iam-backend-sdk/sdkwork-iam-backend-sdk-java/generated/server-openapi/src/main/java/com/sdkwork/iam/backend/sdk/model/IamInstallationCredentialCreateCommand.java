package com.sdkwork.iam.backend.sdk.model;

import java.util.List;

public class IamInstallationCredentialCreateCommand {
    private String environmentKey;
    private String clientId;
    private List<String> redirectUris;
    private List<String> grantedScopes;

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
}
