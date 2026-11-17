package api

import (
    "encoding/json"
    "fmt"
    "net/url"
    "strings"
    sdktypes "github.com/sdkwork/sdkwork-iam-app-sdk/types"
    sdkhttp "github.com/sdkwork/sdkwork-iam-app-sdk/http"
)

type IamApi struct {
    client *sdkhttp.Client
}

func NewIamApi(client *sdkhttp.Client) *IamApi {
    return &IamApi{client: client}
}

// Department Assignments list.
func (a *IamApi) DepartmentAssignmentsList(page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/iam/department_assignments"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Departments list.
func (a *IamApi) DepartmentsList(page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/iam/departments"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Departments tree retrieve.
func (a *IamApi) DepartmentsTreeRetrieve() (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(AppApiPath("/iam/departments/tree"), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Iam oauth official Account Settings retrieve.
func (a *IamApi) OauthOfficialAccountSettingsRetrieve() (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(AppApiPath("/iam/oauth/official_account_settings"), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Iam oauth official Accounts list.
func (a *IamApi) OauthOfficialAccountsList(page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/iam/oauth/official_accounts"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Iam oauth official Accounts create.
func (a *IamApi) OauthOfficialAccountsCreate(body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(AppApiPath("/iam/oauth/official_accounts"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Iam oauth official Accounts delete.
func (a *IamApi) OauthOfficialAccountsDelete(officialAccountId string) (struct{}, error) {
    raw, err := a.client.Delete(AppApiPath(fmt.Sprintf("/iam/oauth/official_accounts/%s", SerializePathParameter(officialAccountId, PathParameterSpec{Name: "officialAccountId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

// Iam oauth official Accounts retrieve.
func (a *IamApi) OauthOfficialAccountsRetrieve(officialAccountId string) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/iam/oauth/official_accounts/%s", SerializePathParameter(officialAccountId, PathParameterSpec{Name: "officialAccountId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Iam oauth official Accounts update.
func (a *IamApi) OauthOfficialAccountsUpdate(officialAccountId string, body *sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(AppApiPath(fmt.Sprintf("/iam/oauth/official_accounts/%s", SerializePathParameter(officialAccountId, PathParameterSpec{Name: "officialAccountId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Iam oauth official Accounts custom Menus publish.
func (a *IamApi) OauthOfficialAccountsCustomMenusPublish(officialAccountId string, body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/iam/oauth/official_accounts/%s/custom_menus/publish", SerializePathParameter(officialAccountId, PathParameterSpec{Name: "officialAccountId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Iam oauth official Accounts custom Menus rollback.
func (a *IamApi) OauthOfficialAccountsCustomMenusRollback(officialAccountId string, body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/iam/oauth/official_accounts/%s/custom_menus/rollback", SerializePathParameter(officialAccountId, PathParameterSpec{Name: "officialAccountId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Iam oauth official Accounts custom Menus sync.
func (a *IamApi) OauthOfficialAccountsCustomMenusSync(officialAccountId string, body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/iam/oauth/official_accounts/%s/custom_menus/sync", SerializePathParameter(officialAccountId, PathParameterSpec{Name: "officialAccountId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Organization Memberships list.
func (a *IamApi) OrganizationMembershipsList(page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/iam/organization_memberships"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Organizations list.
func (a *IamApi) OrganizationsList(page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/iam/organizations"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Organizations members list.
func (a *IamApi) OrganizationsMembersList(organizationId string, page *int, pageSize *int, cursor *string, sort *string, q *string, role *string) (sdktypes.IamOrganizationMemberListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "role", Value: func() interface{} { if role == nil { return nil }; return *role }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath(fmt.Sprintf("/iam/organizations/%s/members", SerializePathParameter(organizationId, PathParameterSpec{Name: "organizationId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.IamOrganizationMemberListResponse
        return zero, err
    }
    return decodeResult[sdktypes.IamOrganizationMemberListResponse](raw)
}

// Organizations tree retrieve.
func (a *IamApi) OrganizationsTreeRetrieve() (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(AppApiPath("/iam/organizations/tree"), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Persona Catalog retrieve.
func (a *IamApi) PersonaCatalogRetrieve() (sdktypes.IamPersonaCatalogResponse, error) {
    raw, err := a.client.Get(AppApiPath("/iam/persona_catalog"), nil, nil)
    if err != nil {
        var zero sdktypes.IamPersonaCatalogResponse
        return zero, err
    }
    return decodeResult[sdktypes.IamPersonaCatalogResponse](raw)
}

// Position Assignments list.
func (a *IamApi) PositionAssignmentsList(page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/iam/position_assignments"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Positions list.
func (a *IamApi) PositionsList(page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/iam/positions"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Role Bindings list.
func (a *IamApi) RoleBindingsList(page *int, pageSize *int, cursor *string, sort *string, q *string, roleId *string, principalKind *string, principalId *string, scopeKind *string, scopeId *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "roleId", Value: func() interface{} { if roleId == nil { return nil }; return *roleId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "principalKind", Value: func() interface{} { if principalKind == nil { return nil }; return *principalKind }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "principalId", Value: func() interface{} { if principalId == nil { return nil }; return *principalId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "scopeKind", Value: func() interface{} { if scopeKind == nil { return nil }; return *scopeKind }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "scopeId", Value: func() interface{} { if scopeId == nil { return nil }; return *scopeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/iam/role_bindings"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Users current retrieve.
func (a *IamApi) UsersCurrentRetrieve() (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(AppApiPath("/iam/users/current"), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Users current update.
func (a *IamApi) UsersCurrentUpdate(body *sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(AppApiPath("/iam/users/current"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Users current email Bindings delete.
func (a *IamApi) UsersCurrentEmailBindingsDelete() (struct{}, error) {
    raw, err := a.client.Delete(AppApiPath("/iam/users/current/email_bindings"), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

// Users current email Bindings create.
func (a *IamApi) UsersCurrentEmailBindingsCreate(body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(AppApiPath("/iam/users/current/email_bindings"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Users current password update.
func (a *IamApi) UsersCurrentPasswordUpdate(body *sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(AppApiPath("/iam/users/current/password"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Users current persona delete.
func (a *IamApi) UsersCurrentPersonaDelete() (struct{}, error) {
    raw, err := a.client.Delete(AppApiPath("/iam/users/current/persona"), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

// Users current persona retrieve.
func (a *IamApi) UsersCurrentPersonaRetrieve() (sdktypes.IamUserPersonaResponse, error) {
    raw, err := a.client.Get(AppApiPath("/iam/users/current/persona"), nil, nil)
    if err != nil {
        var zero sdktypes.IamUserPersonaResponse
        return zero, err
    }
    return decodeResult[sdktypes.IamUserPersonaResponse](raw)
}

// Users current persona update.
func (a *IamApi) UsersCurrentPersonaUpdate(body sdktypes.IamUserPersonaUpdateCommand) (sdktypes.IamUserPersonaResponse, error) {
    raw, err := a.client.Put(AppApiPath("/iam/users/current/persona"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.IamUserPersonaResponse
        return zero, err
    }
    return decodeResult[sdktypes.IamUserPersonaResponse](raw)
}

// Users current phone Bindings delete.
func (a *IamApi) UsersCurrentPhoneBindingsDelete() (struct{}, error) {
    raw, err := a.client.Delete(AppApiPath("/iam/users/current/phone_bindings"), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

// Users current phone Bindings create.
func (a *IamApi) UsersCurrentPhoneBindingsCreate(body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(AppApiPath("/iam/users/current/phone_bindings"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

type PathParameterSpec struct {
    Name    string
    Style   string
    Explode bool
}

func SerializePathParameter(value interface{}, spec PathParameterSpec) string {
    if value == nil {
        return ""
    }
    style := spec.Style
    if style == "" {
        style = "simple"
    }

    switch typed := value.(type) {
    case []string:
        return SerializePathArray(spec.Name, stringSliceToInterface(typed), style, spec.Explode)
    case []int:
        return SerializePathArray(spec.Name, intSliceToInterface(typed), style, spec.Explode)
    case []interface{}:
        return SerializePathArray(spec.Name, typed, style, spec.Explode)
    case map[string]string:
        return SerializePathObject(spec.Name, stringMapToInterface(typed), style, spec.Explode)
    case map[string]int:
        return SerializePathObject(spec.Name, intMapToInterface(typed), style, spec.Explode)
    case map[string]interface{}:
        return SerializePathObject(spec.Name, typed, style, spec.Explode)
    default:
        return PathPrefix(spec.Name, style) + url.PathEscape(fmt.Sprint(value))
    }
}

func SerializePathArray(name string, values []interface{}, style string, explode bool) string {
    serialized := make([]string, 0, len(values))
    for _, item := range values {
        if item != nil {
            serialized = append(serialized, url.PathEscape(fmt.Sprint(item)))
        }
    }
    if len(serialized) == 0 {
        return PathPrefix(name, style)
    }
    if style == "matrix" {
        if explode {
            parts := make([]string, 0, len(serialized))
            for _, item := range serialized {
                parts = append(parts, ";"+name+"="+item)
            }
            return strings.Join(parts, "")
        }
        return ";" + name + "=" + strings.Join(serialized, ",")
    }
    separator := ","
    if explode {
        separator = "."
    }
    return PathPrefix(name, style) + strings.Join(serialized, separator)
}

func SerializePathObject(name string, values map[string]interface{}, style string, explode bool) string {
    entries := make([]string, 0, len(values)*2)
    exploded := make([]string, 0, len(values))
    for key, value := range values {
        if value == nil {
            continue
        }
        escapedKey := url.PathEscape(key)
        escapedValue := url.PathEscape(fmt.Sprint(value))
        if explode {
            if style == "matrix" {
                exploded = append(exploded, ";"+escapedKey+"="+escapedValue)
            } else {
                exploded = append(exploded, escapedKey+"="+escapedValue)
            }
        } else {
            entries = append(entries, escapedKey, escapedValue)
        }
    }
    if style == "matrix" {
        if explode {
            return strings.Join(exploded, "")
        }
        return ";" + name + "=" + strings.Join(entries, ",")
    }
    if explode {
        separator := ","
        if style == "label" {
            separator = "."
        }
        return PathPrefix(name, style) + strings.Join(exploded, separator)
    }
    return PathPrefix(name, style) + strings.Join(entries, ",")
}

func PathPrefix(name string, style string) string {
    if style == "label" {
        return "."
    }
    if style == "matrix" {
        return ";" + name
    }
    return ""
}
type QueryParameterSpec struct {
    Name          string
    Value         interface{}
    Style         string
    Explode       bool
    AllowReserved bool
    ContentType   string
}

func BuildQueryString(parameters []QueryParameterSpec) string {
    pairs := make([]string, 0)
    for _, parameter := range parameters {
        AppendSerializedParameter(&pairs, parameter)
    }
    return strings.Join(pairs, "&")
}

func AppendSerializedParameter(pairs *[]string, parameter QueryParameterSpec) {
    if parameter.Value == nil {
        return
    }

    if parameter.ContentType != "" {
        encoded, _ := json.Marshal(parameter.Value)
        *pairs = append(*pairs, url.QueryEscape(parameter.Name)+"="+EncodeQueryValue(string(encoded), parameter.AllowReserved))
        return
    }

    style := parameter.Style
    if style == "" {
        style = "form"
    }

    switch value := parameter.Value.(type) {
    case []string:
        AppendArrayParameter(pairs, parameter.Name, stringSliceToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case []int:
        AppendArrayParameter(pairs, parameter.Name, intSliceToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case []interface{}:
        AppendArrayParameter(pairs, parameter.Name, value, style, parameter.Explode, parameter.AllowReserved)
    case map[string]int:
        AppendObjectParameter(pairs, parameter.Name, intMapToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case map[string]string:
        AppendObjectParameter(pairs, parameter.Name, stringMapToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case map[string]interface{}:
        if style == "deepObject" {
            AppendDeepObjectParameter(pairs, parameter.Name, value, parameter.AllowReserved)
        } else {
            AppendObjectParameter(pairs, parameter.Name, value, style, parameter.Explode, parameter.AllowReserved)
        }
    default:
        *pairs = append(*pairs, url.QueryEscape(parameter.Name)+"="+EncodeQueryValue(fmt.Sprint(value), parameter.AllowReserved))
    }
}

func AppendArrayParameter(pairs *[]string, name string, value []interface{}, style string, explode bool, allowReserved bool) {
    values := make([]string, 0, len(value))
    for _, item := range value {
        if item != nil {
            values = append(values, fmt.Sprint(item))
        }
    }
    if len(values) == 0 {
        return
    }
    if style == "form" && explode {
        for _, item := range values {
            *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(item, allowReserved))
        }
        return
    }
    *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(strings.Join(values, ","), allowReserved))
}

func AppendObjectParameter(pairs *[]string, name string, value map[string]interface{}, style string, explode bool, allowReserved bool) {
    entries := make([]string, 0, len(value)*2)
    for key, item := range value {
        if item == nil {
            continue
        }
        if style == "form" && explode {
            *pairs = append(*pairs, url.QueryEscape(key)+"="+EncodeQueryValue(fmt.Sprint(item), allowReserved))
            continue
        }
        entries = append(entries, key, fmt.Sprint(item))
    }
    if len(entries) == 0 {
        return
    }
    if !(style == "form" && explode) {
        *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(strings.Join(entries, ","), allowReserved))
    }
}

func AppendDeepObjectParameter(pairs *[]string, name string, value map[string]interface{}, allowReserved bool) {
    for key, item := range value {
        if item == nil {
            continue
        }
        *pairs = append(*pairs, url.QueryEscape(fmt.Sprintf("%s[%s]", name, key))+"="+EncodeQueryValue(fmt.Sprint(item), allowReserved))
    }
}

func EncodeQueryValue(value string, allowReserved bool) string {
    encoded := url.QueryEscape(value)
    if !allowReserved {
        return encoded
    }
    replacements := map[string]string{
        "%3A": ":", "%2F": "/", "%3F": "?", "%23": "#",
        "%5B": "[", "%5D": "]", "%40": "@", "%21": "!",
        "%24": "$", "%26": "&", "%27": "'", "%28": "(",
        "%29": ")", "%2A": "*", "%2B": "+", "%2C": ",",
        "%3B": ";", "%3D": "=",
    }
    for escaped, reserved := range replacements {
        encoded = strings.ReplaceAll(encoded, escaped, reserved)
    }
    return encoded
}



func stringSliceToInterface(values []string) []interface{} {
    result := make([]interface{}, 0, len(values))
    for _, value := range values {
        result = append(result, value)
    }
    return result
}

func intSliceToInterface(values []int) []interface{} {
    result := make([]interface{}, 0, len(values))
    for _, value := range values {
        result = append(result, value)
    }
    return result
}

func stringMapToInterface(values map[string]string) map[string]interface{} {
    result := make(map[string]interface{}, len(values))
    for key, value := range values {
        result[key] = value
    }
    return result
}

func intMapToInterface(values map[string]int) map[string]interface{} {
    result := make(map[string]interface{}, len(values))
    for key, value := range values {
        result[key] = value
    }
    return result
}
