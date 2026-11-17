package com.sdkwork.iam.app.sdk.model;

import java.util.Map;

public class DesktopSessionsCreateResponse {
    private Integer code;
    private String traceId;
    private Map<String, Object> data;

    public Integer getCode() {
        return this.code;
    }

    public void setCode(Integer code) {
        this.code = code;
    }

    public String getTraceId() {
        return this.traceId;
    }

    public void setTraceId(String traceId) {
        this.traceId = traceId;
    }

    public Map<String, Object> getData() {
        return this.data;
    }

    public void setData(Map<String, Object> data) {
        this.data = data;
    }
}
