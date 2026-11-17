package com.sdkwork.iam.app.sdk.model;

import java.util.List;

public class IamUserPersonaUpdateCommand {
    private String role;
    private List<String> interests;
    private Boolean promptDismissed;

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
}
