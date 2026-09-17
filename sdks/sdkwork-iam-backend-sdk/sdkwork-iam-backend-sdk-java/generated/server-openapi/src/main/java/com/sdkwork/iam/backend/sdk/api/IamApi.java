package com.sdkwork.iam.backend.sdk.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.iam.backend.sdk.http.HttpClient;
import com.sdkwork.iam.backend.sdk.model.*;
import java.util.List;
import java.util.Map;

public class IamApi {
    private final HttpClient client;

    public IamApi(HttpClient client) {
        this.client = client;
    }

    /** Access Credentials create. */
    public SdkWorkResourceResponse accessCredentialsCreate(AppbaseAccessCredentialCreateCommand body) throws Exception {
        Object raw = client.request("POST", ApiPaths.backendPath("/iam/access_credentials"), body, null, null, "application/json", true, false);
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Account Binding Policy retrieve. */
    public SdkWorkResourceResponse accountBindingPolicyRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/iam/account_binding_policy"));
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Account Binding Policy update. */
    public SdkWorkResourceResponse accountBindingPolicyUpdate(Map<String, Object> body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/iam/account_binding_policy"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Api Keys list. */
    public SdkWorkListResponse apiKeysList(Integer page, Integer pageSize, String cursor, String sort, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/api_keys"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Api Keys revoke. */
    public SdkWorkCommandResponse apiKeysRevoke(String apiKeyId, Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/api_keys/" + serializePathParameter(apiKeyId, new PathParameterSpec("apiKeyId", "simple", false)) + "/revoke"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkCommandResponse>() {});
    }

    /** Applications register. */
    public SdkWorkCommandResponse applicationsRegister(AppbaseApplicationRegisterCommand body) throws Exception {
        Object raw = client.request("POST", ApiPaths.backendPath("/iam/applications/register"), body, null, null, "application/json", true, false);
        return client.convertValue(raw, new TypeReference<SdkWorkCommandResponse>() {});
    }

    /** Audit Events list. */
    public SdkWorkListResponse auditEventsList(Integer page, Integer pageSize, String cursor, String sort, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/audit_events"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Audit Events retrieve. */
    public SdkWorkResourceResponse auditEventsRetrieve(String auditEventId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/iam/audit_events/" + serializePathParameter(auditEventId, new PathParameterSpec("auditEventId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Department Assignments list. */
    public SdkWorkListResponse departmentAssignmentsList(Integer page, Integer pageSize, String cursor, String sort, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/department_assignments"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Department Assignments create. */
    public SdkWorkResourceResponse departmentAssignmentsCreate(Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/department_assignments"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Department Assignments update. */
    public SdkWorkResourceResponse departmentAssignmentsUpdate(String assignmentId, Map<String, Object> body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/iam/department_assignments/" + serializePathParameter(assignmentId, new PathParameterSpec("assignmentId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Departments list. */
    public SdkWorkListResponse departmentsList(Integer page, Integer pageSize, String cursor, String sort, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/departments"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Departments create. */
    public SdkWorkResourceResponse departmentsCreate(Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/departments"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Departments delete. */
    public Void departmentsDelete(String departmentId) throws Exception {
        client.delete(ApiPaths.backendPath("/iam/departments/" + serializePathParameter(departmentId, new PathParameterSpec("departmentId", "simple", false)) + ""));
        return null;
    }

    /** Departments retrieve. */
    public SdkWorkResourceResponse departmentsRetrieve(String departmentId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/iam/departments/" + serializePathParameter(departmentId, new PathParameterSpec("departmentId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Departments update. */
    public SdkWorkResourceResponse departmentsUpdate(String departmentId, Map<String, Object> body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/iam/departments/" + serializePathParameter(departmentId, new PathParameterSpec("departmentId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Departments tree retrieve. */
    public SdkWorkResourceResponse departmentsTreeRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/iam/departments/tree"));
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Groups list. */
    public SdkWorkListResponse groupsList(Integer page, Integer pageSize, String cursor, String sort, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/groups"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Groups create. */
    public SdkWorkResourceResponse groupsCreate(Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/groups"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Groups delete. */
    public Void groupsDelete(String groupId) throws Exception {
        client.delete(ApiPaths.backendPath("/iam/groups/" + serializePathParameter(groupId, new PathParameterSpec("groupId", "simple", false)) + ""));
        return null;
    }

    /** Groups retrieve. */
    public SdkWorkResourceResponse groupsRetrieve(String groupId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/iam/groups/" + serializePathParameter(groupId, new PathParameterSpec("groupId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Groups update. */
    public SdkWorkResourceResponse groupsUpdate(String groupId, Map<String, Object> body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/iam/groups/" + serializePathParameter(groupId, new PathParameterSpec("groupId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Groups members list. */
    public SdkWorkListResponse groupsMembersList(String groupId, Integer page, Integer pageSize, String cursor, String sort, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/groups/" + serializePathParameter(groupId, new PathParameterSpec("groupId", "simple", false)) + "/members"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Groups members create. */
    public SdkWorkResourceResponse groupsMembersCreate(String groupId, Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/groups/" + serializePathParameter(groupId, new PathParameterSpec("groupId", "simple", false)) + "/members"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Groups members delete. */
    public Void groupsMembersDelete(String groupId, String memberId) throws Exception {
        client.delete(ApiPaths.backendPath("/iam/groups/" + serializePathParameter(groupId, new PathParameterSpec("groupId", "simple", false)) + "/members/" + serializePathParameter(memberId, new PathParameterSpec("memberId", "simple", false)) + ""));
        return null;
    }

    /** Organization Memberships list. */
    public SdkWorkListResponse organizationMembershipsList(Integer page, Integer pageSize, String cursor, String sort, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/organization_memberships"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Organization Memberships create. */
    public SdkWorkResourceResponse organizationMembershipsCreate(Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/organization_memberships"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Organization Memberships update. */
    public SdkWorkResourceResponse organizationMembershipsUpdate(String membershipId, Map<String, Object> body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/iam/organization_memberships/" + serializePathParameter(membershipId, new PathParameterSpec("membershipId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Organizations list. */
    public SdkWorkListResponse organizationsList(Integer page, Integer pageSize, String cursor, String sort, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/organizations"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Organizations create. */
    public SdkWorkResourceResponse organizationsCreate(Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/organizations"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Organizations delete. */
    public Void organizationsDelete(String organizationId) throws Exception {
        client.delete(ApiPaths.backendPath("/iam/organizations/" + serializePathParameter(organizationId, new PathParameterSpec("organizationId", "simple", false)) + ""));
        return null;
    }

    /** Organizations retrieve. */
    public SdkWorkResourceResponse organizationsRetrieve(String organizationId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/iam/organizations/" + serializePathParameter(organizationId, new PathParameterSpec("organizationId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Organizations update. */
    public SdkWorkResourceResponse organizationsUpdate(String organizationId, Map<String, Object> body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/iam/organizations/" + serializePathParameter(organizationId, new PathParameterSpec("organizationId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Organizations tree retrieve. */
    public SdkWorkResourceResponse organizationsTreeRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/iam/organizations/tree"));
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Permissions list. */
    public SdkWorkListResponse permissionsList(Integer page, Integer pageSize, String cursor, String sort, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/permissions"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Permissions create. */
    public SdkWorkResourceResponse permissionsCreate(Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/permissions"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Permissions delete. */
    public Void permissionsDelete(String permissionId) throws Exception {
        client.delete(ApiPaths.backendPath("/iam/permissions/" + serializePathParameter(permissionId, new PathParameterSpec("permissionId", "simple", false)) + ""));
        return null;
    }

    /** Permissions retrieve. */
    public SdkWorkResourceResponse permissionsRetrieve(String permissionId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/iam/permissions/" + serializePathParameter(permissionId, new PathParameterSpec("permissionId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Permissions update. */
    public SdkWorkResourceResponse permissionsUpdate(String permissionId, Map<String, Object> body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/iam/permissions/" + serializePathParameter(permissionId, new PathParameterSpec("permissionId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Policies list. */
    public SdkWorkListResponse policiesList(Integer page, Integer pageSize, String cursor, String sort, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/policies"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Policies create. */
    public SdkWorkResourceResponse policiesCreate(Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/policies"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Policies delete. */
    public Void policiesDelete(String policyId) throws Exception {
        client.delete(ApiPaths.backendPath("/iam/policies/" + serializePathParameter(policyId, new PathParameterSpec("policyId", "simple", false)) + ""));
        return null;
    }

    /** Policies retrieve. */
    public SdkWorkResourceResponse policiesRetrieve(String policyId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/iam/policies/" + serializePathParameter(policyId, new PathParameterSpec("policyId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Policies update. */
    public SdkWorkResourceResponse policiesUpdate(String policyId, Map<String, Object> body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/iam/policies/" + serializePathParameter(policyId, new PathParameterSpec("policyId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Position Assignments list. */
    public SdkWorkListResponse positionAssignmentsList(Integer page, Integer pageSize, String cursor, String sort, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/position_assignments"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Position Assignments create. */
    public SdkWorkResourceResponse positionAssignmentsCreate(Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/position_assignments"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Position Assignments update. */
    public SdkWorkResourceResponse positionAssignmentsUpdate(String assignmentId, Map<String, Object> body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/iam/position_assignments/" + serializePathParameter(assignmentId, new PathParameterSpec("assignmentId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Positions list. */
    public SdkWorkListResponse positionsList(Integer page, Integer pageSize, String cursor, String sort, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/positions"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Positions create. */
    public SdkWorkResourceResponse positionsCreate(Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/positions"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Positions delete. */
    public Void positionsDelete(String positionId) throws Exception {
        client.delete(ApiPaths.backendPath("/iam/positions/" + serializePathParameter(positionId, new PathParameterSpec("positionId", "simple", false)) + ""));
        return null;
    }

    /** Positions update. */
    public SdkWorkResourceResponse positionsUpdate(String positionId, Map<String, Object> body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/iam/positions/" + serializePathParameter(positionId, new PathParameterSpec("positionId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Provider Accounts list. */
    public SdkWorkListResponse providerAccountsList(Integer page, Integer pageSize, String cursor, String sort, String q, String vendorCode, String scopeType, String ownerUserId, String organizationId, String status, Boolean mine, Boolean includePlatform) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null),
            new QueryParameterSpec("vendorCode", vendorCode, "form", true, false, null),
            new QueryParameterSpec("scopeType", scopeType, "form", true, false, null),
            new QueryParameterSpec("ownerUserId", ownerUserId, "form", true, false, null),
            new QueryParameterSpec("organizationId", organizationId, "form", true, false, null),
            new QueryParameterSpec("status", status, "form", true, false, null),
            new QueryParameterSpec("mine", mine, "form", true, false, null),
            new QueryParameterSpec("includePlatform", includePlatform, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/provider_accounts"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Provider Accounts create. */
    public SdkWorkResourceResponse providerAccountsCreate(Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/provider_accounts"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Provider Accounts delete. */
    public Void providerAccountsDelete(String providerAccountId) throws Exception {
        client.delete(ApiPaths.backendPath("/iam/provider_accounts/" + serializePathParameter(providerAccountId, new PathParameterSpec("providerAccountId", "simple", false)) + ""));
        return null;
    }

    /** Provider Accounts retrieve. */
    public SdkWorkResourceResponse providerAccountsRetrieve(String providerAccountId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/iam/provider_accounts/" + serializePathParameter(providerAccountId, new PathParameterSpec("providerAccountId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Provider Accounts update. */
    public SdkWorkResourceResponse providerAccountsUpdate(String providerAccountId, Map<String, Object> body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/iam/provider_accounts/" + serializePathParameter(providerAccountId, new PathParameterSpec("providerAccountId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Provider Accounts credentials list. */
    public SdkWorkListResponse providerAccountsCredentialsList(String providerAccountId, Integer page, Integer pageSize, String cursor, String sort, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/provider_accounts/" + serializePathParameter(providerAccountId, new PathParameterSpec("providerAccountId", "simple", false)) + "/credentials"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Provider Accounts credentials create. */
    public SdkWorkResourceResponse providerAccountsCredentialsCreate(String providerAccountId, Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/provider_accounts/" + serializePathParameter(providerAccountId, new PathParameterSpec("providerAccountId", "simple", false)) + "/credentials"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Provider Accounts set Default. */
    public SdkWorkResourceResponse providerAccountsSetDefault(String providerAccountId, Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/provider_accounts/" + serializePathParameter(providerAccountId, new PathParameterSpec("providerAccountId", "simple", false)) + "/default"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Provider Accounts resolve. */
    public SdkWorkResourceResponse providerAccountsResolve(String vendorCode, String capabilityCode, String environment, String userId, String organizationId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("vendorCode", vendorCode, "form", true, false, null),
            new QueryParameterSpec("capabilityCode", capabilityCode, "form", true, false, null),
            new QueryParameterSpec("environment", environment, "form", true, false, null),
            new QueryParameterSpec("userId", userId, "form", true, false, null),
            new QueryParameterSpec("organizationId", organizationId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/provider_accounts/resolve"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Provider Credentials revoke. */
    public SdkWorkCommandResponse providerCredentialsRevoke(String credentialId, Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/provider_credentials/" + serializePathParameter(credentialId, new PathParameterSpec("credentialId", "simple", false)) + "/revoke"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkCommandResponse>() {});
    }

    /** Role Bindings list. */
    public SdkWorkListResponse roleBindingsList(Integer page, Integer pageSize, String cursor, String sort, String q, String roleId, String principalKind, String principalId, String scopeKind, String scopeId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null),
            new QueryParameterSpec("roleId", roleId, "form", true, false, null),
            new QueryParameterSpec("principalKind", principalKind, "form", true, false, null),
            new QueryParameterSpec("principalId", principalId, "form", true, false, null),
            new QueryParameterSpec("scopeKind", scopeKind, "form", true, false, null),
            new QueryParameterSpec("scopeId", scopeId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/role_bindings"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Role Bindings create. */
    public SdkWorkResourceResponse roleBindingsCreate(Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/role_bindings"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Role Bindings delete. */
    public Void roleBindingsDelete(String roleBindingId) throws Exception {
        client.delete(ApiPaths.backendPath("/iam/role_bindings/" + serializePathParameter(roleBindingId, new PathParameterSpec("roleBindingId", "simple", false)) + ""));
        return null;
    }

    /** Roles list. */
    public SdkWorkListResponse rolesList(Integer page, Integer pageSize, String cursor, String sort, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/roles"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Roles create. */
    public SdkWorkResourceResponse rolesCreate(Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/roles"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Roles delete. */
    public Void rolesDelete(String roleId) throws Exception {
        client.delete(ApiPaths.backendPath("/iam/roles/" + serializePathParameter(roleId, new PathParameterSpec("roleId", "simple", false)) + ""));
        return null;
    }

    /** Roles retrieve. */
    public SdkWorkResourceResponse rolesRetrieve(String roleId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/iam/roles/" + serializePathParameter(roleId, new PathParameterSpec("roleId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Roles update. */
    public SdkWorkResourceResponse rolesUpdate(String roleId, Map<String, Object> body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/iam/roles/" + serializePathParameter(roleId, new PathParameterSpec("roleId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Roles permissions list. */
    public SdkWorkListResponse rolesPermissionsList(String roleId, Integer page, Integer pageSize, String cursor, String sort, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/roles/" + serializePathParameter(roleId, new PathParameterSpec("roleId", "simple", false)) + "/permissions"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Roles permissions create. */
    public SdkWorkResourceResponse rolesPermissionsCreate(String roleId, Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/roles/" + serializePathParameter(roleId, new PathParameterSpec("roleId", "simple", false)) + "/permissions"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Roles permissions delete. */
    public Void rolesPermissionsDelete(String roleId, String permissionId) throws Exception {
        client.delete(ApiPaths.backendPath("/iam/roles/" + serializePathParameter(roleId, new PathParameterSpec("roleId", "simple", false)) + "/permissions/" + serializePathParameter(permissionId, new PathParameterSpec("permissionId", "simple", false)) + ""));
        return null;
    }

    /** Security Events list. */
    public SdkWorkListResponse securityEventsList(Integer page, Integer pageSize, String cursor, String sort, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/security_events"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Security Events retrieve. */
    public SdkWorkResourceResponse securityEventsRetrieve(String securityEventId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/iam/security_events/" + serializePathParameter(securityEventId, new PathParameterSpec("securityEventId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Service Account Credentials revoke. */
    public SdkWorkCommandResponse serviceAccountCredentialsRevoke(String credentialId, ServiceAccountCredentialRevokeCommand body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/service_account_credentials/" + serializePathParameter(credentialId, new PathParameterSpec("credentialId", "simple", false)) + "/revoke"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkCommandResponse>() {});
    }

    /** Service Account Tokens create. */
    public SdkWorkResourceResponse serviceAccountTokensCreate(ServiceAccountTokenExchangeCommand body) throws Exception {
        Object raw = client.request("POST", ApiPaths.backendPath("/iam/service_account_tokens"), body, null, null, "application/json", true, false);
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Service Accounts list. */
    public SdkWorkListResponse serviceAccountsList(Integer page, Integer pageSize, String cursor, String sort, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/service_accounts"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Service Accounts create. */
    public SdkWorkResourceResponse serviceAccountsCreate(Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/service_accounts"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Service Accounts delete. */
    public Void serviceAccountsDelete(String serviceAccountId) throws Exception {
        client.delete(ApiPaths.backendPath("/iam/service_accounts/" + serializePathParameter(serviceAccountId, new PathParameterSpec("serviceAccountId", "simple", false)) + ""));
        return null;
    }

    /** Service Accounts retrieve. */
    public SdkWorkResourceResponse serviceAccountsRetrieve(String serviceAccountId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/iam/service_accounts/" + serializePathParameter(serviceAccountId, new PathParameterSpec("serviceAccountId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Service Accounts update. */
    public SdkWorkResourceResponse serviceAccountsUpdate(String serviceAccountId, Map<String, Object> body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/iam/service_accounts/" + serializePathParameter(serviceAccountId, new PathParameterSpec("serviceAccountId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Service Accounts credentials create. */
    public SdkWorkResourceResponse serviceAccountsCredentialsCreate(String serviceAccountId, ServiceAccountCredentialCreateCommand body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/service_accounts/" + serializePathParameter(serviceAccountId, new PathParameterSpec("serviceAccountId", "simple", false)) + "/credentials"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Tenant Applications create. */
    public SdkWorkResourceResponse tenantApplicationsCreate(AppbaseTenantApplicationProvisionCommand body) throws Exception {
        Object raw = client.request("POST", ApiPaths.backendPath("/iam/tenant_applications"), body, null, null, "application/json", true, false);
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Tenant Applications retrieve. */
    public SdkWorkResourceResponse tenantApplicationsRetrieve(String tenantApplicationId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/iam/tenant_applications/" + serializePathParameter(tenantApplicationId, new PathParameterSpec("tenantApplicationId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Tenant Applications update. */
    public SdkWorkResourceResponse tenantApplicationsUpdate(String tenantApplicationId, AppbaseTenantApplicationUpdateCommand body) throws Exception {
        Object raw = client.request("PATCH", ApiPaths.backendPath("/iam/tenant_applications/" + serializePathParameter(tenantApplicationId, new PathParameterSpec("tenantApplicationId", "simple", false)) + ""), body, null, null, "application/json", true, false);
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Tenant Applications enable. */
    public SdkWorkCommandResponse tenantApplicationsEnable(String tenantApplicationId, AppbaseTenantApplicationEnableCommand body) throws Exception {
        Object raw = client.request("POST", ApiPaths.backendPath("/iam/tenant_applications/" + serializePathParameter(tenantApplicationId, new PathParameterSpec("tenantApplicationId", "simple", false)) + "/enable"), body, null, null, "application/json", true, false);
        return client.convertValue(raw, new TypeReference<SdkWorkCommandResponse>() {});
    }

    /** Tenants list. */
    public SdkWorkListResponse tenantsList(Integer page, Integer pageSize, String cursor, String sort, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/tenants"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Tenants create. */
    public SdkWorkResourceResponse tenantsCreate(Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/tenants"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Tenants delete. */
    public Void tenantsDelete(String tenantId) throws Exception {
        client.delete(ApiPaths.backendPath("/iam/tenants/" + serializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false)) + ""));
        return null;
    }

    /** Tenants retrieve. */
    public SdkWorkResourceResponse tenantsRetrieve(String tenantId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/iam/tenants/" + serializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Tenants update. */
    public SdkWorkResourceResponse tenantsUpdate(String tenantId, Map<String, Object> body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/iam/tenants/" + serializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Tenant Applications list. */
    public SdkWorkListResponse tenantApplicationsList(String tenantId, Integer page, Integer pageSize, String cursor, String sort, String q, String status, String environment, String applicationType) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null),
            new QueryParameterSpec("status", status, "form", true, false, null),
            new QueryParameterSpec("environment", environment, "form", true, false, null),
            new QueryParameterSpec("application_type", applicationType, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/tenants/" + serializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false)) + "/applications"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Tenant Applications management create. */
    public SdkWorkResourceResponse tenantApplicationsManagementCreate(String tenantId, IamTenantApplicationManagementProvisionCommand body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/tenants/" + serializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false)) + "/applications"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Tenant Applications management update. */
    public SdkWorkResourceResponse tenantApplicationsManagementUpdate(String tenantId, String tenantApplicationId, IamTenantApplicationManagementUpdateCommand body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/iam/tenants/" + serializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false)) + "/applications/" + serializePathParameter(tenantApplicationId, new PathParameterSpec("tenantApplicationId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Tenant Applications management disable. */
    public SdkWorkCommandResponse tenantApplicationsManagementDisable(String tenantId, String tenantApplicationId, IamTenantApplicationStatusCommand body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/tenants/" + serializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false)) + "/applications/" + serializePathParameter(tenantApplicationId, new PathParameterSpec("tenantApplicationId", "simple", false)) + "/disable"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkCommandResponse>() {});
    }

    /** Tenant Applications management enable. */
    public SdkWorkCommandResponse tenantApplicationsManagementEnable(String tenantId, String tenantApplicationId, IamTenantApplicationStatusCommand body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/tenants/" + serializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false)) + "/applications/" + serializePathParameter(tenantApplicationId, new PathParameterSpec("tenantApplicationId", "simple", false)) + "/enable"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkCommandResponse>() {});
    }

    /** Tenant Applications summary retrieve. */
    public SdkWorkResourceResponse tenantApplicationsSummaryRetrieve(String tenantId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/iam/tenants/" + serializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false)) + "/applications/summary"));
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Tenants members list. */
    public SdkWorkListResponse tenantsMembersList(String tenantId, Integer page, Integer pageSize, String cursor, String sort, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/tenants/" + serializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false)) + "/members"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Tenants members create. */
    public SdkWorkResourceResponse tenantsMembersCreate(String tenantId, Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/tenants/" + serializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false)) + "/members"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Tenants members delete. */
    public Void tenantsMembersDelete(String tenantId, String userId) throws Exception {
        client.delete(ApiPaths.backendPath("/iam/tenants/" + serializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false)) + "/members/" + serializePathParameter(userId, new PathParameterSpec("userId", "simple", false)) + ""));
        return null;
    }

    /** Tenants members update. */
    public SdkWorkResourceResponse tenantsMembersUpdate(String tenantId, String userId, Map<String, Object> body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/iam/tenants/" + serializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false)) + "/members/" + serializePathParameter(userId, new PathParameterSpec("userId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Users list. */
    public SdkWorkListResponse usersList(Integer page, Integer pageSize, String cursor, String sort, String q, String status) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sort", sort, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null),
            new QueryParameterSpec("status", status, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/iam/users"), query));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** Users create. */
    public SdkWorkResourceResponse usersCreate(Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/users"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Users delete. */
    public Void usersDelete(String userId) throws Exception {
        client.delete(ApiPaths.backendPath("/iam/users/" + serializePathParameter(userId, new PathParameterSpec("userId", "simple", false)) + ""));
        return null;
    }

    /** Users retrieve. */
    public SdkWorkResourceResponse usersRetrieve(String userId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/iam/users/" + serializePathParameter(userId, new PathParameterSpec("userId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Users update. */
    public SdkWorkResourceResponse usersUpdate(String userId, Map<String, Object> body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/iam/users/" + serializePathParameter(userId, new PathParameterSpec("userId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Users ban. */
    public SdkWorkResourceResponse usersBan(String userId, Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/users/" + serializePathParameter(userId, new PathParameterSpec("userId", "simple", false)) + "/ban"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    /** Users unban. */
    public SdkWorkResourceResponse usersUnban(String userId, Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/iam/users/" + serializePathParameter(userId, new PathParameterSpec("userId", "simple", false)) + "/unban"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkResourceResponse>() {});
    }

    private record PathParameterSpec(String name, String style, boolean explode) {}

    private static String serializePathParameter(Object value, PathParameterSpec spec) {
        if (value == null) {
            return "";
        }
        String style = spec.style() == null || spec.style().isBlank() ? "simple" : spec.style();
        if (value instanceof Iterable<?> iterable) {
            return serializePathArray(spec.name(), iterable, style, spec.explode());
        }
        if (value instanceof Map<?, ?> map) {
            return serializePathObject(spec.name(), map, style, spec.explode());
        }
        return pathPrimitivePrefix(spec.name(), style) + pathEncode(String.valueOf(value));
    }

    private static String serializePathArray(String name, Iterable<?> values, String style, boolean explode) {
        List<String> serialized = new java.util.ArrayList<>();
        for (Object item : values) {
            if (item != null) {
                serialized.add(pathEncode(String.valueOf(item)));
            }
        }
        if (serialized.isEmpty()) {
            return pathPrefix(name, style);
        }
        if ("matrix".equals(style)) {
            if (explode) {
                List<String> parts = new java.util.ArrayList<>();
                for (String item : serialized) {
                    parts.add(";" + name + "=" + item);
                }
                return String.join("", parts);
            }
            return ";" + name + "=" + String.join(",", serialized);
        }
        String separator = explode ? "." : ",";
        return pathPrefix(name, style) + String.join(separator, serialized);
    }

    private static String serializePathObject(String name, Map<?, ?> values, String style, boolean explode) {
        List<String> entries = new java.util.ArrayList<>();
        List<String> exploded = new java.util.ArrayList<>();
        values.forEach((key, value) -> {
            if (value == null) {
                return;
            }
            String escapedKey = pathEncode(String.valueOf(key));
            String escapedValue = pathEncode(String.valueOf(value));
            if (explode) {
                if ("matrix".equals(style)) {
                    exploded.add(";" + escapedKey + "=" + escapedValue);
                } else {
                    exploded.add(escapedKey + "=" + escapedValue);
                }
            } else {
                entries.add(escapedKey);
                entries.add(escapedValue);
            }
        });
        if ("matrix".equals(style)) {
            if (explode) {
                return String.join("", exploded);
            }
            return ";" + name + "=" + String.join(",", entries);
        }
        if (explode) {
            String separator = "label".equals(style) ? "." : ",";
            return pathPrefix(name, style) + String.join(separator, exploded);
        }
        return pathPrefix(name, style) + String.join(",", entries);
    }

    private static String pathPrefix(String name, String style) {
        if ("label".equals(style)) {
            return ".";
        }
        if ("matrix".equals(style)) {
            return ";" + name;
        }
        return "";
    }

    private static String pathPrimitivePrefix(String name, String style) {
        if ("matrix".equals(style)) {
            return ";" + name + "=";
        }
        return pathPrefix(name, style);
    }

    private static String pathEncode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20");
    }

    private record QueryParameterSpec(String name, Object value, String style, boolean explode, boolean allowReserved, String contentType) {}

    private static String buildQueryString(List<QueryParameterSpec> parameters) throws Exception {
        List<String> pairs = new java.util.ArrayList<>();
        for (QueryParameterSpec parameter : parameters) {
            appendSerializedParameter(pairs, parameter);
        }
        return String.join("&", pairs);
    }

    private static void appendSerializedParameter(List<String> pairs, QueryParameterSpec parameter) throws Exception {
        if (parameter.value() == null) {
            return;
        }
        if (parameter.contentType() != null && !parameter.contentType().isBlank()) {
            String json = clientObjectMapper().writeValueAsString(parameter.value());
            pairs.add(urlEncode(parameter.name()) + "=" + encodeQueryValue(json, parameter.allowReserved()));
            return;
        }

        String style = parameter.style() == null || parameter.style().isBlank() ? "form" : parameter.style();
        Object value = parameter.value();
        if ("deepObject".equals(style) && value instanceof Map<?, ?> map) {
            appendDeepObjectParameter(pairs, parameter.name(), map, parameter.allowReserved());
        } else if (value instanceof Iterable<?> iterable) {
            appendArrayParameter(pairs, parameter.name(), iterable, style, parameter.explode(), parameter.allowReserved());
        } else if (value instanceof Map<?, ?> map) {
            appendObjectParameter(pairs, parameter.name(), map, style, parameter.explode(), parameter.allowReserved());
        } else {
            pairs.add(urlEncode(parameter.name()) + "=" + encodeQueryValue(String.valueOf(value), parameter.allowReserved()));
        }
    }

    private static void appendArrayParameter(List<String> pairs, String name, Iterable<?> values, String style, boolean explode, boolean allowReserved) {
        List<String> serialized = new java.util.ArrayList<>();
        for (Object item : values) {
            if (item != null) {
                serialized.add(String.valueOf(item));
            }
        }
        if (serialized.isEmpty()) {
            return;
        }
        if ("form".equals(style) && explode) {
            for (String item : serialized) {
                pairs.add(urlEncode(name) + "=" + encodeQueryValue(item, allowReserved));
            }
            return;
        }
        pairs.add(urlEncode(name) + "=" + encodeQueryValue(String.join(",", serialized), allowReserved));
    }

    private static void appendObjectParameter(List<String> pairs, String name, Map<?, ?> values, String style, boolean explode, boolean allowReserved) {
        List<String> serialized = new java.util.ArrayList<>();
        values.forEach((key, value) -> {
            if (value == null) {
                return;
            }
            if ("form".equals(style) && explode) {
                pairs.add(urlEncode(String.valueOf(key)) + "=" + encodeQueryValue(String.valueOf(value), allowReserved));
            } else {
                serialized.add(String.valueOf(key));
                serialized.add(String.valueOf(value));
            }
        });
        if (!serialized.isEmpty()) {
            pairs.add(urlEncode(name) + "=" + encodeQueryValue(String.join(",", serialized), allowReserved));
        }
    }

    private static void appendDeepObjectParameter(List<String> pairs, String name, Map<?, ?> values, boolean allowReserved) {
        values.forEach((key, value) -> {
            if (value != null) {
                pairs.add(urlEncode(name + "[" + key + "]") + "=" + encodeQueryValue(String.valueOf(value), allowReserved));
            }
        });
    }

    private static String encodeQueryValue(String value, boolean allowReserved) {
        String encoded = urlEncode(value);
        if (!allowReserved) {
            return encoded;
        }
        return encoded
            .replace("%3A", ":").replace("%2F", "/").replace("%3F", "?").replace("%23", "#")
            .replace("%5B", "[").replace("%5D", "]").replace("%40", "@").replace("%21", "!")
            .replace("%24", "$").replace("%26", "&").replace("%27", "'").replace("%28", "(")
            .replace("%29", ")").replace("%2A", "*").replace("%2B", "+").replace("%2C", ",")
            .replace("%3B", ";").replace("%3D", "=");
    }

    private static com.fasterxml.jackson.databind.ObjectMapper clientObjectMapper() {
        return new com.fasterxml.jackson.databind.ObjectMapper();
    }


    private static String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
    }
}
