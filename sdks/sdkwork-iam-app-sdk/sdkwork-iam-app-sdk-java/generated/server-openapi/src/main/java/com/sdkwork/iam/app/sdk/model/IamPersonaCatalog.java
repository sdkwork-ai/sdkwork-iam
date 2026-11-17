package com.sdkwork.iam.app.sdk.model;

import java.util.List;

public class IamPersonaCatalog {
    private String version;
    private List<IamPersonaRole> roles;
    private List<IamPersonaInterest> interests;

    public String getVersion() {
        return this.version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public List<IamPersonaRole> getRoles() {
        return this.roles;
    }

    public void setRoles(List<IamPersonaRole> roles) {
        this.roles = roles;
    }

    public List<IamPersonaInterest> getInterests() {
        return this.interests;
    }

    public void setInterests(List<IamPersonaInterest> interests) {
        this.interests = interests;
    }
}
