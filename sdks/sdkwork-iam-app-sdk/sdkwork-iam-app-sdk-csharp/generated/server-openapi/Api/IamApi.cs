using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SDKWork.Iam.AppSdk.Models;
using SdkHttpClient = SDKWork.Iam.AppSdk.Http.HttpClient;

namespace SDKWork.Iam.AppSdk.Api
{
    public class IamApi
    {
        private readonly SdkHttpClient _client;

        public IamApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// App Access Tokens create.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.IamAppAccessTokenResponse?> AppAccessTokensCreateAsync(SDKWork.Iam.AppSdk.Models.IamAppAccessTokenCreateCommand body)
        {
            return await _client.PostAsync<SDKWork.Iam.AppSdk.Models.IamAppAccessTokenResponse>(ApiPaths.AppPath("/iam/app_access_tokens"), body, null, null, "application/json");
        }

        /// <summary>
        /// Department Assignments list.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkListResponse?> DepartmentAssignmentsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.AppSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.AppPath("/iam/department_assignments"), queryString));
        }

        /// <summary>
        /// Departments list.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkListResponse?> DepartmentsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.AppSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.AppPath("/iam/departments"), queryString));
        }

        /// <summary>
        /// Departments tree retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse?> DepartmentsTreeRetrieveAsync()
        {
            return await _client.GetAsync<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse>(ApiPaths.AppPath("/iam/departments/tree"));
        }

        /// <summary>
        /// Oauth official Account Settings retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse?> OauthOfficialAccountSettingsRetrieveAsync()
        {
            return await _client.GetAsync<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse>(ApiPaths.AppPath("/iam/oauth/official_account_settings"));
        }

        /// <summary>
        /// Oauth official Accounts list.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkListResponse?> OauthOfficialAccountsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.AppSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.AppPath("/iam/oauth/official_accounts"), queryString));
        }

        /// <summary>
        /// Oauth official Accounts create.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse?> OauthOfficialAccountsCreateAsync(Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse>(ApiPaths.AppPath("/iam/oauth/official_accounts"), body, null, null, "application/json");
        }

        /// <summary>
        /// Oauth official Accounts delete.
        /// </summary>
        public async Task OauthOfficialAccountsDeleteAsync(string officialAccountId)
        {
            await _client.DeleteAsync<object>(ApiPaths.AppPath($"/iam/oauth/official_accounts/{SerializePathParameter(officialAccountId, new PathParameterSpec("officialAccountId", "simple", false))}"));
        }

        /// <summary>
        /// Oauth official Accounts retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse?> OauthOfficialAccountsRetrieveAsync(string officialAccountId)
        {
            return await _client.GetAsync<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse>(ApiPaths.AppPath($"/iam/oauth/official_accounts/{SerializePathParameter(officialAccountId, new PathParameterSpec("officialAccountId", "simple", false))}"));
        }

        /// <summary>
        /// Oauth official Accounts update.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse?> OauthOfficialAccountsUpdateAsync(string officialAccountId, Dictionary<string, object>? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse>(ApiPaths.AppPath($"/iam/oauth/official_accounts/{SerializePathParameter(officialAccountId, new PathParameterSpec("officialAccountId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Oauth official Accounts custom Menus publish.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse?> OauthOfficialAccountsCustomMenusPublishAsync(string officialAccountId, Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse>(ApiPaths.AppPath($"/iam/oauth/official_accounts/{SerializePathParameter(officialAccountId, new PathParameterSpec("officialAccountId", "simple", false))}/custom_menus/publish"), body, null, null, "application/json");
        }

        /// <summary>
        /// Oauth official Accounts custom Menus rollback.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse?> OauthOfficialAccountsCustomMenusRollbackAsync(string officialAccountId, Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse>(ApiPaths.AppPath($"/iam/oauth/official_accounts/{SerializePathParameter(officialAccountId, new PathParameterSpec("officialAccountId", "simple", false))}/custom_menus/rollback"), body, null, null, "application/json");
        }

        /// <summary>
        /// Oauth official Accounts custom Menus sync.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse?> OauthOfficialAccountsCustomMenusSyncAsync(string officialAccountId, Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse>(ApiPaths.AppPath($"/iam/oauth/official_accounts/{SerializePathParameter(officialAccountId, new PathParameterSpec("officialAccountId", "simple", false))}/custom_menus/sync"), body, null, null, "application/json");
        }

        /// <summary>
        /// Organization Memberships list.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkListResponse?> OrganizationMembershipsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.AppSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.AppPath("/iam/organization_memberships"), queryString));
        }

        /// <summary>
        /// Organizations list.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkListResponse?> OrganizationsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.AppSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.AppPath("/iam/organizations"), queryString));
        }

        /// <summary>
        /// Organizations members list.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.IamOrganizationMemberListResponse?> OrganizationsMembersListAsync(string organizationId, int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null, string? role = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
                new QueryParameterSpec("role", role, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.AppSdk.Models.IamOrganizationMemberListResponse>(ApiPaths.AppendQueryString(ApiPaths.AppPath($"/iam/organizations/{SerializePathParameter(organizationId, new PathParameterSpec("organizationId", "simple", false))}/members"), queryString));
        }

        /// <summary>
        /// Organizations tree retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse?> OrganizationsTreeRetrieveAsync()
        {
            return await _client.GetAsync<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse>(ApiPaths.AppPath("/iam/organizations/tree"));
        }

        /// <summary>
        /// Persona Catalog retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.IamPersonaCatalogResponse?> PersonaCatalogRetrieveAsync()
        {
            return await _client.GetAsync<SDKWork.Iam.AppSdk.Models.IamPersonaCatalogResponse>(ApiPaths.AppPath("/iam/persona_catalog"));
        }

        /// <summary>
        /// Position Assignments list.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkListResponse?> PositionAssignmentsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.AppSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.AppPath("/iam/position_assignments"), queryString));
        }

        /// <summary>
        /// Positions list.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkListResponse?> PositionsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.AppSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.AppPath("/iam/positions"), queryString));
        }

        /// <summary>
        /// Role Bindings list.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkListResponse?> RoleBindingsListAsync(int? page = null, int? pageSize = null, string? cursor = null, string? sort = null, string? q = null, string? roleId = null, string? principalKind = null, string? principalId = null, string? scopeKind = null, string? scopeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("sort", sort, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
                new QueryParameterSpec("role_id", roleId, "form", true, false, null),
                new QueryParameterSpec("principal_kind", principalKind, "form", true, false, null),
                new QueryParameterSpec("principal_id", principalId, "form", true, false, null),
                new QueryParameterSpec("scope_kind", scopeKind, "form", true, false, null),
                new QueryParameterSpec("scope_id", scopeId, "form", true, false, null),
            });
            return await _client.GetAsync<SDKWork.Iam.AppSdk.Models.SdkWorkListResponse>(ApiPaths.AppendQueryString(ApiPaths.AppPath("/iam/role_bindings"), queryString));
        }

        /// <summary>
        /// Users current retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse?> UsersCurrentRetrieveAsync()
        {
            return await _client.GetAsync<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse>(ApiPaths.AppPath("/iam/users/current"));
        }

        /// <summary>
        /// Users current update.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse?> UsersCurrentUpdateAsync(Dictionary<string, object>? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse>(ApiPaths.AppPath("/iam/users/current"), body, null, null, "application/json");
        }

        /// <summary>
        /// Users current email Bindings delete.
        /// </summary>
        public async Task UsersCurrentEmailBindingsDeleteAsync()
        {
            await _client.DeleteAsync<object>(ApiPaths.AppPath("/iam/users/current/email_bindings"));
        }

        /// <summary>
        /// Users current email Bindings create.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse?> UsersCurrentEmailBindingsCreateAsync(Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse>(ApiPaths.AppPath("/iam/users/current/email_bindings"), body, null, null, "application/json");
        }

        /// <summary>
        /// Users current password update.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse?> UsersCurrentPasswordUpdateAsync(Dictionary<string, object>? body = null)
        {
            return await _client.PatchAsync<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse>(ApiPaths.AppPath("/iam/users/current/password"), body, null, null, "application/json");
        }

        /// <summary>
        /// Users current persona delete.
        /// </summary>
        public async Task UsersCurrentPersonaDeleteAsync()
        {
            await _client.DeleteAsync<object>(ApiPaths.AppPath("/iam/users/current/persona"));
        }

        /// <summary>
        /// Users current persona retrieve.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.IamUserPersonaResponse?> UsersCurrentPersonaRetrieveAsync()
        {
            return await _client.GetAsync<SDKWork.Iam.AppSdk.Models.IamUserPersonaResponse>(ApiPaths.AppPath("/iam/users/current/persona"));
        }

        /// <summary>
        /// Users current persona update.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.IamUserPersonaResponse?> UsersCurrentPersonaUpdateAsync(SDKWork.Iam.AppSdk.Models.IamUserPersonaUpdateCommand body)
        {
            return await _client.PutAsync<SDKWork.Iam.AppSdk.Models.IamUserPersonaResponse>(ApiPaths.AppPath("/iam/users/current/persona"), body, null, null, "application/json");
        }

        /// <summary>
        /// Users current phone Bindings delete.
        /// </summary>
        public async Task UsersCurrentPhoneBindingsDeleteAsync()
        {
            await _client.DeleteAsync<object>(ApiPaths.AppPath("/iam/users/current/phone_bindings"));
        }

        /// <summary>
        /// Users current phone Bindings create.
        /// </summary>
        public async Task<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse?> UsersCurrentPhoneBindingsCreateAsync(Dictionary<string, object> body)
        {
            return await _client.PostAsync<SDKWork.Iam.AppSdk.Models.SdkWorkResourceResponse>(ApiPaths.AppPath("/iam/users/current/phone_bindings"), body, null, null, "application/json");
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
