package com.sdkwork.iam.app.sdk.model;

import java.util.Map;

public class IamPersonaInterest {
    private String code;
    private Integer sortOrder;
    private Map<String, String> labels;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
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
}
