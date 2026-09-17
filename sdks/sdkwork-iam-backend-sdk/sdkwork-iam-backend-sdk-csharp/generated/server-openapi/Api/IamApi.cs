using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SDKWork.Iam.BackendSdk.Models;
using SdkHttpClient = SDKWork.Iam.BackendSdk.Http.HttpClient;

namespace SDKWork.Iam.BackendSdk.Api
{
    public class IamApi
    {
        private readonly SdkHttpClient _client;

        public IamApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Access Credentials create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> AccessCredentialsCreateAsync(SDKWork.Iam.BackendSdk.Models.AppbaseAccessCredentialCreateCommand body)
        {
            return await _client.RequestAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>("POST", ApiPaths.BackendPath("/iam/access_credentials"), body, null, null, "application/json", true, false);
        }

        /// <summary>
        /// Account Binding Policy retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> AccountBindingPolicyRetrieveAsync()
        {
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath("/iam/account_binding_policy"));
        }

        /// <summary>
        /// Account Binding Policy update.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> AccountBindingPolicyUpdateAsync(Dictionary<string, object>? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath("/iam/account_binding_policy"), body, null, null, "application/json");
        }

        /// <summary>
        /// Api Keys list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> ApiKeysListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/iam/api_keys"), queryString));
        }

        /// <summary>
        /// Api Keys revoke.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkCommandResponse?> ApiKeysRevokeAsync(string apiKeyId, Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkCommandResponse>(ApiPaths.BackendPath($"/iam/api_keys/{SerializePathParameter(apiKeyId, new PathParameterSpec("apiKeyId", "simple", false))}/revoke"), body, null, null, "application/json");
        }

        /// <summary>
        /// Applications register.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkCommandResponse?> ApplicationsRegisterAsync(SDKWork.Iam.BackendSdk.Models.AppbaseApplicationRegisterCommand body)
        {
            return await _client.RequestAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkCommandResponse>("POST", ApiPaths.BackendPath("/iam/applications/register"), body, null, null, "application/json", true, false);
        }

        /// <summary>
        /// Audit Events list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> AuditEventsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/iam/audit_events"), queryString));
        }

        /// <summary>
        /// Audit Events retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> AuditEventsRetrieveAsync(string auditEventId)
        {
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/audit_events/{SerializePathParameter(auditEventId, new PathParameterSpec("auditEventId", "simple", false))}"));
        }

        /// <summary>
        /// Department Assignments list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> DepartmentAssignmentsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/iam/department_assignments"), queryString));
        }

        /// <summary>
        /// Department Assignments create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> DepartmentAssignmentsCreateAsync(Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath("/iam/department_assignments"), body, null, null, "application/json");
        }

        /// <summary>
        /// Department Assignments update.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> DepartmentAssignmentsUpdateAsync(string assignmentId, Dictionary<string, object>? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/department_assignments/{SerializePathParameter(assignmentId, new PathParameterSpec("assignmentId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Departments list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> DepartmentsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/iam/departments"), queryString));
        }

        /// <summary>
        /// Departments create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> DepartmentsCreateAsync(Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath("/iam/departments"), body, null, null, "application/json");
        }

        /// <summary>
        /// Departments delete.
        /// </summary>
        public async Task DepartmentsDeleteAsync(string departmentId)
        {
            await _client.DeleteAsync<object>(ApiPaths.BackendPath($"/iam/departments/{SerializePathParameter(departmentId, new PathParameterSpec("departmentId", "simple", false))}"));
        }

        /// <summary>
        /// Departments retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> DepartmentsRetrieveAsync(string departmentId)
        {
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/departments/{SerializePathParameter(departmentId, new PathParameterSpec("departmentId", "simple", false))}"));
        }

        /// <summary>
        /// Departments update.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> DepartmentsUpdateAsync(string departmentId, Dictionary<string, object>? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/departments/{SerializePathParameter(departmentId, new PathParameterSpec("departmentId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Departments tree retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> DepartmentsTreeRetrieveAsync()
        {
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath("/iam/departments/tree"));
        }

        /// <summary>
        /// Groups list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> GroupsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/iam/groups"), queryString));
        }

        /// <summary>
        /// Groups create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> GroupsCreateAsync(Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath("/iam/groups"), body, null, null, "application/json");
        }

        /// <summary>
        /// Groups delete.
        /// </summary>
        public async Task GroupsDeleteAsync(string groupId)
        {
            await _client.DeleteAsync<object>(ApiPaths.BackendPath($"/iam/groups/{SerializePathParameter(groupId, new PathParameterSpec("groupId", "simple", false))}"));
        }

        /// <summary>
        /// Groups retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> GroupsRetrieveAsync(string groupId)
        {
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/groups/{SerializePathParameter(groupId, new PathParameterSpec("groupId", "simple", false))}"));
        }

        /// <summary>
        /// Groups update.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> GroupsUpdateAsync(string groupId, Dictionary<string, object>? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/groups/{SerializePathParameter(groupId, new PathParameterSpec("groupId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Groups members list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> GroupsMembersListAsync(string groupId, int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath($"/iam/groups/{SerializePathParameter(groupId, new PathParameterSpec("groupId", "simple", false))}/members"), queryString));
        }

        /// <summary>
        /// Groups members create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> GroupsMembersCreateAsync(string groupId, Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/groups/{SerializePathParameter(groupId, new PathParameterSpec("groupId", "simple", false))}/members"), body, null, null, "application/json");
        }

        /// <summary>
        /// Groups members delete.
        /// </summary>
        public async Task GroupsMembersDeleteAsync(string groupId, string memberId)
        {
            await _client.DeleteAsync<object>(ApiPaths.BackendPath($"/iam/groups/{SerializePathParameter(groupId, new PathParameterSpec("groupId", "simple", false))}/members/{SerializePathParameter(memberId, new PathParameterSpec("memberId", "simple", false))}"));
        }

        /// <summary>
        /// Organization Memberships list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> OrganizationMembershipsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/iam/organization_memberships"), queryString));
        }

        /// <summary>
        /// Organization Memberships create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> OrganizationMembershipsCreateAsync(Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath("/iam/organization_memberships"), body, null, null, "application/json");
        }

        /// <summary>
        /// Organization Memberships update.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> OrganizationMembershipsUpdateAsync(string membershipId, Dictionary<string, object>? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/organization_memberships/{SerializePathParameter(membershipId, new PathParameterSpec("membershipId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Organizations list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> OrganizationsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/iam/organizations"), queryString));
        }

        /// <summary>
        /// Organizations create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> OrganizationsCreateAsync(Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath("/iam/organizations"), body, null, null, "application/json");
        }

        /// <summary>
        /// Organizations delete.
        /// </summary>
        public async Task OrganizationsDeleteAsync(string organizationId)
        {
            await _client.DeleteAsync<object>(ApiPaths.BackendPath($"/iam/organizations/{SerializePathParameter(organizationId, new PathParameterSpec("organizationId", "simple", false))}"));
        }

        /// <summary>
        /// Organizations retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> OrganizationsRetrieveAsync(string organizationId)
        {
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/organizations/{SerializePathParameter(organizationId, new PathParameterSpec("organizationId", "simple", false))}"));
        }

        /// <summary>
        /// Organizations update.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> OrganizationsUpdateAsync(string organizationId, Dictionary<string, object>? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/organizations/{SerializePathParameter(organizationId, new PathParameterSpec("organizationId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Organizations tree retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> OrganizationsTreeRetrieveAsync()
        {
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath("/iam/organizations/tree"));
        }

        /// <summary>
        /// Permissions list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> PermissionsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/iam/permissions"), queryString));
        }

        /// <summary>
        /// Permissions create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> PermissionsCreateAsync(Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath("/iam/permissions"), body, null, null, "application/json");
        }

        /// <summary>
        /// Permissions delete.
        /// </summary>
        public async Task PermissionsDeleteAsync(string permissionId)
        {
            await _client.DeleteAsync<object>(ApiPaths.BackendPath($"/iam/permissions/{SerializePathParameter(permissionId, new PathParameterSpec("permissionId", "simple", false))}"));
        }

        /// <summary>
        /// Permissions retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> PermissionsRetrieveAsync(string permissionId)
        {
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/permissions/{SerializePathParameter(permissionId, new PathParameterSpec("permissionId", "simple", false))}"));
        }

        /// <summary>
        /// Permissions update.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> PermissionsUpdateAsync(string permissionId, Dictionary<string, object>? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/permissions/{SerializePathParameter(permissionId, new PathParameterSpec("permissionId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Policies list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> PoliciesListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/iam/policies"), queryString));
        }

        /// <summary>
        /// Policies create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> PoliciesCreateAsync(Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath("/iam/policies"), body, null, null, "application/json");
        }

        /// <summary>
        /// Policies delete.
        /// </summary>
        public async Task PoliciesDeleteAsync(string policyId)
        {
            await _client.DeleteAsync<object>(ApiPaths.BackendPath($"/iam/policies/{SerializePathParameter(policyId, new PathParameterSpec("policyId", "simple", false))}"));
        }

        /// <summary>
        /// Policies retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> PoliciesRetrieveAsync(string policyId)
        {
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/policies/{SerializePathParameter(policyId, new PathParameterSpec("policyId", "simple", false))}"));
        }

        /// <summary>
        /// Policies update.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> PoliciesUpdateAsync(string policyId, Dictionary<string, object>? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/policies/{SerializePathParameter(policyId, new PathParameterSpec("policyId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Position Assignments list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> PositionAssignmentsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/iam/position_assignments"), queryString));
        }

        /// <summary>
        /// Position Assignments create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> PositionAssignmentsCreateAsync(Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath("/iam/position_assignments"), body, null, null, "application/json");
        }

        /// <summary>
        /// Position Assignments update.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> PositionAssignmentsUpdateAsync(string assignmentId, Dictionary<string, object>? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/position_assignments/{SerializePathParameter(assignmentId, new PathParameterSpec("assignmentId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Positions list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> PositionsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/iam/positions"), queryString));
        }

        /// <summary>
        /// Positions create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> PositionsCreateAsync(Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath("/iam/positions"), body, null, null, "application/json");
        }

        /// <summary>
        /// Positions delete.
        /// </summary>
        public async Task PositionsDeleteAsync(string positionId)
        {
            await _client.DeleteAsync<object>(ApiPaths.BackendPath($"/iam/positions/{SerializePathParameter(positionId, new PathParameterSpec("positionId", "simple", false))}"));
        }

        /// <summary>
        /// Positions update.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> PositionsUpdateAsync(string positionId, Dictionary<string, object>? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/positions/{SerializePathParameter(positionId, new PathParameterSpec("positionId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Provider Accounts list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> ProviderAccountsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null, string? vendorCode = null, string? scopeType = null, string? ownerUserId = null, string? organizationId = null, string? status = null, bool? mine = null, bool? includePlatform = null)
        {
            var queryString = BuildQueryString(new[]
            {
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
                new QueryParameterSpec("includePlatform", includePlatform, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/iam/provider_accounts"), queryString));
        }

        /// <summary>
        /// Provider Accounts create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> ProviderAccountsCreateAsync(Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath("/iam/provider_accounts"), body, null, null, "application/json");
        }

        /// <summary>
        /// Provider Accounts delete.
        /// </summary>
        public async Task ProviderAccountsDeleteAsync(string providerAccountId)
        {
            await _client.DeleteAsync<object>(ApiPaths.BackendPath($"/iam/provider_accounts/{SerializePathParameter(providerAccountId, new PathParameterSpec("providerAccountId", "simple", false))}"));
        }

        /// <summary>
        /// Provider Accounts retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> ProviderAccountsRetrieveAsync(string providerAccountId)
        {
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/provider_accounts/{SerializePathParameter(providerAccountId, new PathParameterSpec("providerAccountId", "simple", false))}"));
        }

        /// <summary>
        /// Provider Accounts update.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> ProviderAccountsUpdateAsync(string providerAccountId, Dictionary<string, object>? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/provider_accounts/{SerializePathParameter(providerAccountId, new PathParameterSpec("providerAccountId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Provider Accounts credentials list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> ProviderAccountsCredentialsListAsync(string providerAccountId, int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath($"/iam/provider_accounts/{SerializePathParameter(providerAccountId, new PathParameterSpec("providerAccountId", "simple", false))}/credentials"), queryString));
        }

        /// <summary>
        /// Provider Accounts credentials create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> ProviderAccountsCredentialsCreateAsync(string providerAccountId, Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/provider_accounts/{SerializePathParameter(providerAccountId, new PathParameterSpec("providerAccountId", "simple", false))}/credentials"), body, null, null, "application/json");
        }

        /// <summary>
        /// Provider Accounts set Default.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> ProviderAccountsSetDefaultAsync(string providerAccountId, Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/provider_accounts/{SerializePathParameter(providerAccountId, new PathParameterSpec("providerAccountId", "simple", false))}/default"), body, null, null, "application/json");
        }

        /// <summary>
        /// Provider Accounts resolve.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> ProviderAccountsResolveAsync(string vendorCode, string? capabilityCode = null, string? environment = null, string? userId = null, string? organizationId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("vendorCode", vendorCode, "form", true, false, null),
                new QueryParameterSpec("capabilityCode", capabilityCode, "form", true, false, null),
                new QueryParameterSpec("environment", environment, "form", true, false, null),
                new QueryParameterSpec("userId", userId, "form", true, false, null),
                new QueryParameterSpec("organizationId", organizationId, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/iam/provider_accounts/resolve"), queryString));
        }

        /// <summary>
        /// Provider Credentials revoke.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkCommandResponse?> ProviderCredentialsRevokeAsync(string credentialId, Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkCommandResponse>(ApiPaths.BackendPath($"/iam/provider_credentials/{SerializePathParameter(credentialId, new PathParameterSpec("credentialId", "simple", false))}/revoke"), body, null, null, "application/json");
        }

        /// <summary>
        /// Role Bindings list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> RoleBindingsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null, string? roleId = null, string? principalKind = null, string? principalId = null, string? scopeKind = null, string? scopeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
                new QueryParameterSpec("roleId", roleId, "form", true, false, null),
                new QueryParameterSpec("principalKind", principalKind, "form", true, false, null),
                new QueryParameterSpec("principalId", principalId, "form", true, false, null),
                new QueryParameterSpec("scopeKind", scopeKind, "form", true, false, null),
                new QueryParameterSpec("scopeId", scopeId, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/iam/role_bindings"), queryString));
        }

        /// <summary>
        /// Role Bindings create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> RoleBindingsCreateAsync(Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath("/iam/role_bindings"), body, null, null, "application/json");
        }

        /// <summary>
        /// Role Bindings delete.
        /// </summary>
        public async Task RoleBindingsDeleteAsync(string roleBindingId)
        {
            await _client.DeleteAsync<object>(ApiPaths.BackendPath($"/iam/role_bindings/{SerializePathParameter(roleBindingId, new PathParameterSpec("roleBindingId", "simple", false))}"));
        }

        /// <summary>
        /// Roles list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> RolesListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/iam/roles"), queryString));
        }

        /// <summary>
        /// Roles create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> RolesCreateAsync(Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath("/iam/roles"), body, null, null, "application/json");
        }

        /// <summary>
        /// Roles delete.
        /// </summary>
        public async Task RolesDeleteAsync(string roleId)
        {
            await _client.DeleteAsync<object>(ApiPaths.BackendPath($"/iam/roles/{SerializePathParameter(roleId, new PathParameterSpec("roleId", "simple", false))}"));
        }

        /// <summary>
        /// Roles retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> RolesRetrieveAsync(string roleId)
        {
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/roles/{SerializePathParameter(roleId, new PathParameterSpec("roleId", "simple", false))}"));
        }

        /// <summary>
        /// Roles update.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> RolesUpdateAsync(string roleId, Dictionary<string, object>? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/roles/{SerializePathParameter(roleId, new PathParameterSpec("roleId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Roles permissions list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> RolesPermissionsListAsync(string roleId, int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath($"/iam/roles/{SerializePathParameter(roleId, new PathParameterSpec("roleId", "simple", false))}/permissions"), queryString));
        }

        /// <summary>
        /// Roles permissions create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> RolesPermissionsCreateAsync(string roleId, Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/roles/{SerializePathParameter(roleId, new PathParameterSpec("roleId", "simple", false))}/permissions"), body, null, null, "application/json");
        }

        /// <summary>
        /// Roles permissions delete.
        /// </summary>
        public async Task RolesPermissionsDeleteAsync(string roleId, string permissionId)
        {
            await _client.DeleteAsync<object>(ApiPaths.BackendPath($"/iam/roles/{SerializePathParameter(roleId, new PathParameterSpec("roleId", "simple", false))}/permissions/{SerializePathParameter(permissionId, new PathParameterSpec("permissionId", "simple", false))}"));
        }

        /// <summary>
        /// Security Events list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> SecurityEventsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/iam/security_events"), queryString));
        }

        /// <summary>
        /// Security Events retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> SecurityEventsRetrieveAsync(string securityEventId)
        {
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/security_events/{SerializePathParameter(securityEventId, new PathParameterSpec("securityEventId", "simple", false))}"));
        }

        /// <summary>
        /// Service Account Credentials revoke.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkCommandResponse?> ServiceAccountCredentialsRevokeAsync(string credentialId, SDKWork.Iam.BackendSdk.Models.ServiceAccountCredentialRevokeCommand body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkCommandResponse>(ApiPaths.BackendPath($"/iam/service_account_credentials/{SerializePathParameter(credentialId, new PathParameterSpec("credentialId", "simple", false))}/revoke"), body, null, null, "application/json");
        }

        /// <summary>
        /// Service Account Tokens create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> ServiceAccountTokensCreateAsync(SDKWork.Iam.BackendSdk.Models.ServiceAccountTokenExchangeCommand body)
        {
            return await _client.RequestAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>("POST", ApiPaths.BackendPath("/iam/service_account_tokens"), body, null, null, "application/json", true, false);
        }

        /// <summary>
        /// Service Accounts list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> ServiceAccountsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/iam/service_accounts"), queryString));
        }

        /// <summary>
        /// Service Accounts create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> ServiceAccountsCreateAsync(Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath("/iam/service_accounts"), body, null, null, "application/json");
        }

        /// <summary>
        /// Service Accounts delete.
        /// </summary>
        public async Task ServiceAccountsDeleteAsync(string serviceAccountId)
        {
            await _client.DeleteAsync<object>(ApiPaths.BackendPath($"/iam/service_accounts/{SerializePathParameter(serviceAccountId, new PathParameterSpec("serviceAccountId", "simple", false))}"));
        }

        /// <summary>
        /// Service Accounts retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> ServiceAccountsRetrieveAsync(string serviceAccountId)
        {
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/service_accounts/{SerializePathParameter(serviceAccountId, new PathParameterSpec("serviceAccountId", "simple", false))}"));
        }

        /// <summary>
        /// Service Accounts update.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> ServiceAccountsUpdateAsync(string serviceAccountId, Dictionary<string, object>? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/service_accounts/{SerializePathParameter(serviceAccountId, new PathParameterSpec("serviceAccountId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Service Accounts credentials create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> ServiceAccountsCredentialsCreateAsync(string serviceAccountId, SDKWork.Iam.BackendSdk.Models.ServiceAccountCredentialCreateCommand body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/service_accounts/{SerializePathParameter(serviceAccountId, new PathParameterSpec("serviceAccountId", "simple", false))}/credentials"), body, null, null, "application/json");
        }

        /// <summary>
        /// Tenant Applications create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> TenantApplicationsCreateAsync(SDKWork.Iam.BackendSdk.Models.AppbaseTenantApplicationProvisionCommand body)
        {
            return await _client.RequestAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>("POST", ApiPaths.BackendPath("/iam/tenant_applications"), body, null, null, "application/json", true, false);
        }

        /// <summary>
        /// Tenant Applications retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> TenantApplicationsRetrieveAsync(string tenantApplicationId)
        {
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/tenant_applications/{SerializePathParameter(tenantApplicationId, new PathParameterSpec("tenantApplicationId", "simple", false))}"));
        }

        /// <summary>
        /// Tenant Applications update.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> TenantApplicationsUpdateAsync(string tenantApplicationId, SDKWork.Iam.BackendSdk.Models.AppbaseTenantApplicationUpdateCommand? body = null)
        {
            return await _client.RequestAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>("PATCH", ApiPaths.BackendPath($"/iam/tenant_applications/{SerializePathParameter(tenantApplicationId, new PathParameterSpec("tenantApplicationId", "simple", false))}"), body, null, null, "application/json", true, false);
        }

        /// <summary>
        /// Tenant Applications enable.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkCommandResponse?> TenantApplicationsEnableAsync(string tenantApplicationId, SDKWork.Iam.BackendSdk.Models.AppbaseTenantApplicationEnableCommand body)
        {
            return await _client.RequestAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkCommandResponse>("POST", ApiPaths.BackendPath($"/iam/tenant_applications/{SerializePathParameter(tenantApplicationId, new PathParameterSpec("tenantApplicationId", "simple", false))}/enable"), body, null, null, "application/json", true, false);
        }

        /// <summary>
        /// Tenants list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> TenantsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/iam/tenants"), queryString));
        }

        /// <summary>
        /// Tenants create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> TenantsCreateAsync(Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath("/iam/tenants"), body, null, null, "application/json");
        }

        /// <summary>
        /// Tenants delete.
        /// </summary>
        public async Task TenantsDeleteAsync(string tenantId)
        {
            await _client.DeleteAsync<object>(ApiPaths.BackendPath($"/iam/tenants/{SerializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false))}"));
        }

        /// <summary>
        /// Tenants retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> TenantsRetrieveAsync(string tenantId)
        {
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/tenants/{SerializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false))}"));
        }

        /// <summary>
        /// Tenants update.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> TenantsUpdateAsync(string tenantId, Dictionary<string, object>? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/tenants/{SerializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Tenant Applications list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> TenantApplicationsListAsync(string tenantId, int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null, string? status = null, string? environment = null, string? applicationType = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
                new QueryParameterSpec("environment", environment, "form", true, false, null),
                new QueryParameterSpec("application_type", applicationType, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath($"/iam/tenants/{SerializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false))}/applications"), queryString));
        }

        /// <summary>
        /// Tenant Applications management create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> TenantApplicationsManagementCreateAsync(string tenantId, SDKWork.Iam.BackendSdk.Models.IamTenantApplicationManagementProvisionCommand body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/tenants/{SerializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false))}/applications"), body, null, null, "application/json");
        }

        /// <summary>
        /// Tenant Applications management update.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> TenantApplicationsManagementUpdateAsync(string tenantId, string tenantApplicationId, SDKWork.Iam.BackendSdk.Models.IamTenantApplicationManagementUpdateCommand? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/tenants/{SerializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false))}/applications/{SerializePathParameter(tenantApplicationId, new PathParameterSpec("tenantApplicationId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Tenant Applications management disable.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkCommandResponse?> TenantApplicationsManagementDisableAsync(string tenantId, string tenantApplicationId, SDKWork.Iam.BackendSdk.Models.IamTenantApplicationStatusCommand body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkCommandResponse>(ApiPaths.BackendPath($"/iam/tenants/{SerializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false))}/applications/{SerializePathParameter(tenantApplicationId, new PathParameterSpec("tenantApplicationId", "simple", false))}/disable"), body, null, null, "application/json");
        }

        /// <summary>
        /// Tenant Applications management enable.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkCommandResponse?> TenantApplicationsManagementEnableAsync(string tenantId, string tenantApplicationId, SDKWork.Iam.BackendSdk.Models.IamTenantApplicationStatusCommand body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkCommandResponse>(ApiPaths.BackendPath($"/iam/tenants/{SerializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false))}/applications/{SerializePathParameter(tenantApplicationId, new PathParameterSpec("tenantApplicationId", "simple", false))}/enable"), body, null, null, "application/json");
        }

        /// <summary>
        /// Tenant Applications summary retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> TenantApplicationsSummaryRetrieveAsync(string tenantId)
        {
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/tenants/{SerializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false))}/applications/summary"));
        }

        /// <summary>
        /// Tenants members list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> TenantsMembersListAsync(string tenantId, int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath($"/iam/tenants/{SerializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false))}/members"), queryString));
        }

        /// <summary>
        /// Tenants members create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> TenantsMembersCreateAsync(string tenantId, Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/tenants/{SerializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false))}/members"), body, null, null, "application/json");
        }

        /// <summary>
        /// Tenants members delete.
        /// </summary>
        public async Task TenantsMembersDeleteAsync(string tenantId, string userId)
        {
            await _client.DeleteAsync<object>(ApiPaths.BackendPath($"/iam/tenants/{SerializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false))}/members/{SerializePathParameter(userId, new PathParameterSpec("userId", "simple", false))}"));
        }

        /// <summary>
        /// Tenants members update.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> TenantsMembersUpdateAsync(string tenantId, string userId, Dictionary<string, object>? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/tenants/{SerializePathParameter(tenantId, new PathParameterSpec("tenantId", "simple", false))}/members/{SerializePathParameter(userId, new PathParameterSpec("userId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Users list.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse?> UsersListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null, string? status = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/iam/users"), queryString));
        }

        /// <summary>
        /// Users create.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> UsersCreateAsync(Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath("/iam/users"), body, null, null, "application/json");
        }

        /// <summary>
        /// Users delete.
        /// </summary>
        public async Task UsersDeleteAsync(string userId)
        {
            await _client.DeleteAsync<object>(ApiPaths.BackendPath($"/iam/users/{SerializePathParameter(userId, new PathParameterSpec("userId", "simple", false))}"));
        }

        /// <summary>
        /// Users retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> UsersRetrieveAsync(string userId)
        {
            return await _client.GetAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/users/{SerializePathParameter(userId, new PathParameterSpec("userId", "simple", false))}"));
        }

        /// <summary>
        /// Users update.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> UsersUpdateAsync(string userId, Dictionary<string, object>? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/users/{SerializePathParameter(userId, new PathParameterSpec("userId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Users ban.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> UsersBanAsync(string userId, Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/users/{SerializePathParameter(userId, new PathParameterSpec("userId", "simple", false))}/ban"), body, null, null, "application/json");
        }

        /// <summary>
        /// Users unban.
        /// </summary>
        public async Task<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse?> UsersUnbanAsync(string userId, Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.BackendSdk.Models.SdkWorkResourceResponse>(ApiPaths.BackendPath($"/iam/users/{SerializePathParameter(userId, new PathParameterSpec("userId", "simple", false))}/unban"), body, null, null, "application/json");
        }

        private sealed record PathParameterSpec(string Name, string Style, bool Explode);

        private static string SerializePathParameter(object? value, PathParameterSpec spec)
        {
            if (value is null)
            {
                return string.Empty;
            }
            var style = string.IsNullOrWhiteSpace(spec.Style) ? "simple" : spec.Style;
            if (value is System.Collections.IDictionary dictionary)
            {
                return SerializePathObject(spec.Name, dictionary, style, spec.Explode);
            }
            if (value is System.Collections.IEnumerable enumerable && value is not string)
            {
                return SerializePathArray(spec.Name, enumerable, style, spec.Explode);
            }
            return PathPrimitivePrefix(spec.Name, style) + Uri.EscapeDataString(value.ToString() ?? string.Empty);
        }

        private static string SerializePathArray(string name, System.Collections.IEnumerable values, string style, bool explode)
        {
            var serialized = new List<string>();
            foreach (var item in values)
            {
                if (item is not null)
                {
                    serialized.Add(Uri.EscapeDataString(item.ToString() ?? string.Empty));
                }
            }
            if (serialized.Count == 0)
            {
                return PathPrefix(name, style);
            }
            if (style == "matrix")
            {
                if (explode)
                {
                    var parts = new List<string>();
                    foreach (var item in serialized)
                    {
                        parts.Add(";" + name + "=" + item);
                    }
                    return string.Join(string.Empty, parts);
                }
                return ";" + name + "=" + string.Join(",", serialized);
            }
            var separator = explode ? "." : ",";
            return PathPrefix(name, style) + string.Join(separator, serialized);
        }

        private static string SerializePathObject(string name, System.Collections.IDictionary values, string style, bool explode)
        {
            var entries = new List<string>();
            var exploded = new List<string>();
            foreach (System.Collections.DictionaryEntry item in values)
            {
                if (item.Value is null)
                {
                    continue;
                }
                var escapedKey = Uri.EscapeDataString(item.Key.ToString() ?? string.Empty);
                var escapedValue = Uri.EscapeDataString(item.Value.ToString() ?? string.Empty);
                if (explode)
                {
                    exploded.Add(style == "matrix" ? ";" + escapedKey + "=" + escapedValue : escapedKey + "=" + escapedValue);
                }
                else
                {
                    entries.Add(escapedKey);
                    entries.Add(escapedValue);
                }
            }
            if (style == "matrix")
            {
                return explode ? string.Join(string.Empty, exploded) : ";" + name + "=" + string.Join(",", entries);
            }
            if (explode)
            {
                var separator = style == "label" ? "." : ",";
                return PathPrefix(name, style) + string.Join(separator, exploded);
            }
            return PathPrefix(name, style) + string.Join(",", entries);
        }

        private static string PathPrefix(string name, string style)
        {
            return style switch
            {
                "label" => ".",
                "matrix" => ";" + name,
                _ => string.Empty,
            };
        }

        private static string PathPrimitivePrefix(string name, string style)
        {
            return style == "matrix" ? ";" + name + "=" : PathPrefix(name, style);
        }

        private sealed record QueryParameterSpec(
            string Name,
            object? Value,
            string Style,
            bool Explode,
            bool AllowReserved,
            string? ContentType);

        private static string BuildQueryString(IEnumerable<QueryParameterSpec> parameters)
        {
            var pairs = new List<string>();
            foreach (var parameter in parameters)
            {
                AppendSerializedParameter(pairs, parameter);
            }
            return string.Join("&", pairs);
        }

        private static void AppendSerializedParameter(List<string> pairs, QueryParameterSpec parameter)
        {
            if (parameter.Value is null)
            {
                return;
            }

            if (!string.IsNullOrWhiteSpace(parameter.ContentType))
            {
                var json = System.Text.Json.JsonSerializer.Serialize(parameter.Value);
                pairs.Add(Uri.EscapeDataString(parameter.Name) + "=" + EncodeQueryValue(json, parameter.AllowReserved));
                return;
            }

            var style = string.IsNullOrWhiteSpace(parameter.Style) ? "form" : parameter.Style;
            if (style == "deepObject" && parameter.Value is System.Collections.IDictionary deepObject)
            {
                AppendDeepObjectParameter(pairs, parameter.Name, deepObject, parameter.AllowReserved);
            }
            else if (parameter.Value is System.Collections.IEnumerable enumerable && parameter.Value is not string && parameter.Value is not System.Collections.IDictionary)
            {
                AppendArrayParameter(pairs, parameter.Name, enumerable, style, parameter.Explode, parameter.AllowReserved);
            }
            else if (parameter.Value is System.Collections.IDictionary dictionary)
            {
                AppendObjectParameter(pairs, parameter.Name, dictionary, style, parameter.Explode, parameter.AllowReserved);
            }
            else
            {
                pairs.Add(Uri.EscapeDataString(parameter.Name) + "=" + EncodeQueryValue(parameter.Value.ToString() ?? string.Empty, parameter.AllowReserved));
            }
        }

        private static void AppendArrayParameter(List<string> pairs, string name, System.Collections.IEnumerable values, string style, bool explode, bool allowReserved)
        {
            var serialized = new List<string>();
            foreach (var item in values)
            {
                if (item is not null)
                {
                    serialized.Add(item.ToString() ?? string.Empty);
                }
            }
            if (serialized.Count == 0)
            {
                return;
            }
            if (style == "form" && explode)
            {
                foreach (var item in serialized)
                {
                    pairs.Add(Uri.EscapeDataString(name) + "=" + EncodeQueryValue(item, allowReserved));
                }
                return;
            }
            pairs.Add(Uri.EscapeDataString(name) + "=" + EncodeQueryValue(string.Join(",", serialized), allowReserved));
        }

        private static void AppendObjectParameter(List<string> pairs, string name, System.Collections.IDictionary values, string style, bool explode, bool allowReserved)
        {
            var serialized = new List<string>();
            foreach (System.Collections.DictionaryEntry item in values)
            {
                if (item.Value is null)
                {
                    continue;
                }
                if (style == "form" && explode)
                {
                    pairs.Add(Uri.EscapeDataString(item.Key.ToString() ?? string.Empty) + "=" + EncodeQueryValue(item.Value.ToString() ?? string.Empty, allowReserved));
                }
                else
                {
                    serialized.Add(item.Key.ToString() ?? string.Empty);
                    serialized.Add(item.Value.ToString() ?? string.Empty);
                }
            }
            if (serialized.Count > 0)
            {
                pairs.Add(Uri.EscapeDataString(name) + "=" + EncodeQueryValue(string.Join(",", serialized), allowReserved));
            }
        }

        private static void AppendDeepObjectParameter(List<string> pairs, string name, System.Collections.IDictionary values, bool allowReserved)
        {
            foreach (System.Collections.DictionaryEntry item in values)
            {
                if (item.Value is not null)
                {
                    pairs.Add(Uri.EscapeDataString(name + "[" + item.Key + "]") + "=" + EncodeQueryValue(item.Value.ToString() ?? string.Empty, allowReserved));
                }
            }
        }

        private static string EncodeQueryValue(string value, bool allowReserved)
        {
            var encoded = Uri.EscapeDataString(value);
            if (!allowReserved)
            {
                return encoded;
            }
            return encoded
                .Replace("%3A", ":").Replace("%2F", "/").Replace("%3F", "?").Replace("%23", "#")
                .Replace("%5B", "[").Replace("%5D", "]").Replace("%40", "@").Replace("%21", "!")
                .Replace("%24", "$").Replace("%26", "&").Replace("%27", "'").Replace("%28", "(")
                .Replace("%29", ")").Replace("%2A", "*").Replace("%2B", "+").Replace("%2C", ",")
                .Replace("%3B", ";").Replace("%3D", "=");
        }

    }
}
