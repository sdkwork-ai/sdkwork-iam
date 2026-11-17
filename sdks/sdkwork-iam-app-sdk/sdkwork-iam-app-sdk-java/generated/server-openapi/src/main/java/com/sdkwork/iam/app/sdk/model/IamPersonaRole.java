package com.sdkwork.iam.app.sdk.model;

import java.util.Map;

public class IamPersonaRole {
    private String code;
    private String iamRoleCode;
    private Integer sortOrder;
    private Map<String, String> labels;
    private Map<String, String> descriptions;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getIamRoleCode() {
        return this.iamRoleCode;
    }

    public void setIamRoleCode(String iamRoleCode) {
        this.iamRoleCode = iamRoleCode;
    }

    public Integer getSortOrder() {
        return this.sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public Map<String, String> getLabels() {
        return this.labels;
    }

    public void setLabels(Map<String, String> labels) {
        this.labels = labels;
    }

    public Map<String, String> getDescriptions() {
        return this.descriptions;
    }

    public void setDescriptions(Map<String, String> descriptions) {
        this.descriptions = descriptions;
    }
}
