package com.sdkwork.iam.app.sdk.model;

import java.util.List;

public class IamUserPersona {
    private String role;
    private List<String> interests;
    private Boolean promptDismissed;
    private Boolean hasSelection;
    private String catalogVersion;
    private String updatedAt;

    public String getRole() {
        return this.role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public List<String> getInterests() {
        return this.interests;
    }

    public void setInterests(List<String> interests) {
        this.interests = interests;
    }

    public Boolean getPromptDismissed() {
        return this.promptDismissed;
    }

    public void setPromptDismissed(Boolean promptDismissed) {
        this.promptDismissed = promptDismissed;
    }

    public Boolean getHasSelection() {
        return this.hasSelection;
    }

    public void setHasSelection(Boolean hasSelection) {
        this.hasSelection = hasSelection;
    }

    public String getCatalogVersion() {
        return this.catalogVersion;
    }

    public void setCatalogVersion(String catalogVersion) {
        this.catalogVersion = catalogVersion;
    }

    public String getUpdatedAt() {
        return this.updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
