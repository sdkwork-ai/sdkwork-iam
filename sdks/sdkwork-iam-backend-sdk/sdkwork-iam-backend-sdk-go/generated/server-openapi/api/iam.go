package api

import (
    "encoding/json"
    "fmt"
    "net/url"
    "strings"
    sdktypes "github.com/sdkwork/sdkwork-iam-backend-sdk/types"
    sdkhttp "github.com/sdkwork/sdkwork-iam-backend-sdk/http"
)

type IamApi struct {
    client *sdkhttp.Client
}

func NewIamApi(client *sdkhttp.Client) *IamApi {
    return &IamApi{client: client}
}

// Access Credentials create.
func (a *IamApi) AccessCredentialsCreate(body sdktypes.AppbaseAccessCredentialCreateCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Request("POST", BackendApiPath("/iam/access_credentials"), body, nil, nil, "application/json", true, false)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Account Binding Policy retrieve.
func (a *IamApi) AccountBindingPolicyRetrieve() (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(BackendApiPath("/iam/account_binding_policy"), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Account Binding Policy update.
func (a *IamApi) AccountBindingPolicyUpdate(body *sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(BackendApiPath("/iam/account_binding_policy"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Api Keys list.
func (a *IamApi) ApiKeysList(page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/iam/api_keys"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Api Keys revoke.
func (a *IamApi) ApiKeysRevoke(apiKeyId string, body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkCommandResponse, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/iam/api_keys/%s/revoke", SerializePathParameter(apiKeyId, PathParameterSpec{Name: "apiKeyId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkCommandResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkCommandResponse](raw)
}

// Applications register.
func (a *IamApi) ApplicationsRegister(body sdktypes.AppbaseApplicationRegisterCommand) (sdktypes.SdkWorkCommandResponse, error) {
    raw, err := a.client.Request("POST", BackendApiPath("/iam/applications/register"), body, nil, nil, "application/json", true, false)
    if err != nil {
        var zero sdktypes.SdkWorkCommandResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkCommandResponse](raw)
}

// Audit Events list.
func (a *IamApi) AuditEventsList(page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/iam/audit_events"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Audit Events retrieve.
func (a *IamApi) AuditEventsRetrieve(auditEventId string) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/iam/audit_events/%s", SerializePathParameter(auditEventId, PathParameterSpec{Name: "auditEventId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
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
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/iam/department_assignments"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Department Assignments create.
func (a *IamApi) DepartmentAssignmentsCreate(body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath("/iam/department_assignments"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Department Assignments update.
func (a *IamApi) DepartmentAssignmentsUpdate(assignmentId string, body *sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/iam/department_assignments/%s", SerializePathParameter(assignmentId, PathParameterSpec{Name: "assignmentId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
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
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/iam/departments"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Departments create.
func (a *IamApi) DepartmentsCreate(body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath("/iam/departments"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Departments delete.
func (a *IamApi) DepartmentsDelete(departmentId string) (struct{}, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/iam/departments/%s", SerializePathParameter(departmentId, PathParameterSpec{Name: "departmentId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

// Departments retrieve.
func (a *IamApi) DepartmentsRetrieve(departmentId string) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/iam/departments/%s", SerializePathParameter(departmentId, PathParameterSpec{Name: "departmentId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Departments update.
func (a *IamApi) DepartmentsUpdate(departmentId string, body *sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/iam/departments/%s", SerializePathParameter(departmentId, PathParameterSpec{Name: "departmentId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Departments tree retrieve.
func (a *IamApi) DepartmentsTreeRetrieve() (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(BackendApiPath("/iam/departments/tree"), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Groups list.
func (a *IamApi) GroupsList(page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/iam/groups"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Groups create.
func (a *IamApi) GroupsCreate(body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath("/iam/groups"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Groups delete.
func (a *IamApi) GroupsDelete(groupId string) (struct{}, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/iam/groups/%s", SerializePathParameter(groupId, PathParameterSpec{Name: "groupId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

// Groups retrieve.
func (a *IamApi) GroupsRetrieve(groupId string) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/iam/groups/%s", SerializePathParameter(groupId, PathParameterSpec{Name: "groupId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Groups update.
func (a *IamApi) GroupsUpdate(groupId string, body *sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/iam/groups/%s", SerializePathParameter(groupId, PathParameterSpec{Name: "groupId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Groups members list.
func (a *IamApi) GroupsMembersList(groupId string, page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath(fmt.Sprintf("/iam/groups/%s/members", SerializePathParameter(groupId, PathParameterSpec{Name: "groupId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Groups members create.
func (a *IamApi) GroupsMembersCreate(groupId string, body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/iam/groups/%s/members", SerializePathParameter(groupId, PathParameterSpec{Name: "groupId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Groups members delete.
func (a *IamApi) GroupsMembersDelete(groupId string, memberId string) (struct{}, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/iam/groups/%s/members/%s", SerializePathParameter(groupId, PathParameterSpec{Name: "groupId", Style: "simple", Explode: false}), SerializePathParameter(memberId, PathParameterSpec{Name: "memberId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
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
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/iam/organization_memberships"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Organization Memberships create.
func (a *IamApi) OrganizationMembershipsCreate(body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath("/iam/organization_memberships"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Organization Memberships update.
func (a *IamApi) OrganizationMembershipsUpdate(membershipId string, body *sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/iam/organization_memberships/%s", SerializePathParameter(membershipId, PathParameterSpec{Name: "membershipId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
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
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/iam/organizations"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Organizations create.
func (a *IamApi) OrganizationsCreate(body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath("/iam/organizations"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Organizations delete.
func (a *IamApi) OrganizationsDelete(organizationId string) (struct{}, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/iam/organizations/%s", SerializePathParameter(organizationId, PathParameterSpec{Name: "organizationId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

// Organizations retrieve.
func (a *IamApi) OrganizationsRetrieve(organizationId string) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/iam/organizations/%s", SerializePathParameter(organizationId, PathParameterSpec{Name: "organizationId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Organizations update.
func (a *IamApi) OrganizationsUpdate(organizationId string, body *sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/iam/organizations/%s", SerializePathParameter(organizationId, PathParameterSpec{Name: "organizationId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Organizations tree retrieve.
func (a *IamApi) OrganizationsTreeRetrieve() (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(BackendApiPath("/iam/organizations/tree"), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Permissions list.
func (a *IamApi) PermissionsList(page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/iam/permissions"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Permissions create.
func (a *IamApi) PermissionsCreate(body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath("/iam/permissions"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Permissions delete.
func (a *IamApi) PermissionsDelete(permissionId string) (struct{}, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/iam/permissions/%s", SerializePathParameter(permissionId, PathParameterSpec{Name: "permissionId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

// Permissions retrieve.
func (a *IamApi) PermissionsRetrieve(permissionId string) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/iam/permissions/%s", SerializePathParameter(permissionId, PathParameterSpec{Name: "permissionId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Permissions update.
func (a *IamApi) PermissionsUpdate(permissionId string, body *sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/iam/permissions/%s", SerializePathParameter(permissionId, PathParameterSpec{Name: "permissionId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Policies list.
func (a *IamApi) PoliciesList(page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/iam/policies"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Policies create.
func (a *IamApi) PoliciesCreate(body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath("/iam/policies"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Policies delete.
func (a *IamApi) PoliciesDelete(policyId string) (struct{}, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/iam/policies/%s", SerializePathParameter(policyId, PathParameterSpec{Name: "policyId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

// Policies retrieve.
func (a *IamApi) PoliciesRetrieve(policyId string) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/iam/policies/%s", SerializePathParameter(policyId, PathParameterSpec{Name: "policyId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Policies update.
func (a *IamApi) PoliciesUpdate(policyId string, body *sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/iam/policies/%s", SerializePathParameter(policyId, PathParameterSpec{Name: "policyId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
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
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/iam/position_assignments"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Position Assignments create.
func (a *IamApi) PositionAssignmentsCreate(body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath("/iam/position_assignments"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Position Assignments update.
func (a *IamApi) PositionAssignmentsUpdate(assignmentId string, body *sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/iam/position_assignments/%s", SerializePathParameter(assignmentId, PathParameterSpec{Name: "assignmentId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
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
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/iam/positions"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Positions create.
func (a *IamApi) PositionsCreate(body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath("/iam/positions"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Positions delete.
func (a *IamApi) PositionsDelete(positionId string) (struct{}, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/iam/positions/%s", SerializePathParameter(positionId, PathParameterSpec{Name: "positionId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

// Positions update.
func (a *IamApi) PositionsUpdate(positionId string, body *sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/iam/positions/%s", SerializePathParameter(positionId, PathParameterSpec{Name: "positionId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Provider Accounts list.
func (a *IamApi) ProviderAccountsList(page *int, pageSize *int, cursor *string, sort *string, q *string, vendorCode *string, scopeType *string, ownerUserId *string, organizationId *string, status *string, mine *bool, includePlatform *bool) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "vendorCode", Value: func() interface{} { if vendorCode == nil { return nil }; return *vendorCode }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "scopeType", Value: func() interface{} { if scopeType == nil { return nil }; return *scopeType }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "ownerUserId", Value: func() interface{} { if ownerUserId == nil { return nil }; return *ownerUserId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "organizationId", Value: func() interface{} { if organizationId == nil { return nil }; return *organizationId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "mine", Value: func() interface{} { if mine == nil { return nil }; return *mine }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "includePlatform", Value: func() interface{} { if includePlatform == nil { return nil }; return *includePlatform }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/iam/provider_accounts"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Provider Accounts create.
func (a *IamApi) ProviderAccountsCreate(body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath("/iam/provider_accounts"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Provider Accounts delete.
func (a *IamApi) ProviderAccountsDelete(providerAccountId string) (struct{}, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/iam/provider_accounts/%s", SerializePathParameter(providerAccountId, PathParameterSpec{Name: "providerAccountId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

// Provider Accounts retrieve.
func (a *IamApi) ProviderAccountsRetrieve(providerAccountId string) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/iam/provider_accounts/%s", SerializePathParameter(providerAccountId, PathParameterSpec{Name: "providerAccountId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Provider Accounts update.
func (a *IamApi) ProviderAccountsUpdate(providerAccountId string, body *sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/iam/provider_accounts/%s", SerializePathParameter(providerAccountId, PathParameterSpec{Name: "providerAccountId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Provider Accounts credentials list.
func (a *IamApi) ProviderAccountsCredentialsList(providerAccountId string, page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath(fmt.Sprintf("/iam/provider_accounts/%s/credentials", SerializePathParameter(providerAccountId, PathParameterSpec{Name: "providerAccountId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Provider Accounts credentials create.
func (a *IamApi) ProviderAccountsCredentialsCreate(providerAccountId string, body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/iam/provider_accounts/%s/credentials", SerializePathParameter(providerAccountId, PathParameterSpec{Name: "providerAccountId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Provider Accounts set Default.
func (a *IamApi) ProviderAccountsSetDefault(providerAccountId string, body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/iam/provider_accounts/%s/default", SerializePathParameter(providerAccountId, PathParameterSpec{Name: "providerAccountId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Provider Accounts resolve.
func (a *IamApi) ProviderAccountsResolve(vendorCode string, capabilityCode *string, environment *string, userId *string, organizationId *string) (sdktypes.SdkWorkResourceResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "vendorCode", Value: vendorCode, Style: "form", Explode: true, AllowReserved: false},
        {Name: "capabilityCode", Value: func() interface{} { if capabilityCode == nil { return nil }; return *capabilityCode }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "environment", Value: func() interface{} { if environment == nil { return nil }; return *environment }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "userId", Value: func() interface{} { if userId == nil { return nil }; return *userId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "organizationId", Value: func() interface{} { if organizationId == nil { return nil }; return *organizationId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/iam/provider_accounts/resolve"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Provider Credentials revoke.
func (a *IamApi) ProviderCredentialsRevoke(credentialId string, body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkCommandResponse, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/iam/provider_credentials/%s/revoke", SerializePathParameter(credentialId, PathParameterSpec{Name: "credentialId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkCommandResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkCommandResponse](raw)
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
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/iam/role_bindings"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Role Bindings create.
func (a *IamApi) RoleBindingsCreate(body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath("/iam/role_bindings"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Role Bindings delete.
func (a *IamApi) RoleBindingsDelete(roleBindingId string) (struct{}, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/iam/role_bindings/%s", SerializePathParameter(roleBindingId, PathParameterSpec{Name: "roleBindingId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

// Roles list.
func (a *IamApi) RolesList(page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/iam/roles"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Roles create.
func (a *IamApi) RolesCreate(body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath("/iam/roles"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Roles delete.
func (a *IamApi) RolesDelete(roleId string) (struct{}, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/iam/roles/%s", SerializePathParameter(roleId, PathParameterSpec{Name: "roleId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

// Roles retrieve.
func (a *IamApi) RolesRetrieve(roleId string) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/iam/roles/%s", SerializePathParameter(roleId, PathParameterSpec{Name: "roleId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Roles update.
func (a *IamApi) RolesUpdate(roleId string, body *sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/iam/roles/%s", SerializePathParameter(roleId, PathParameterSpec{Name: "roleId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Roles permissions list.
func (a *IamApi) RolesPermissionsList(roleId string, page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath(fmt.Sprintf("/iam/roles/%s/permissions", SerializePathParameter(roleId, PathParameterSpec{Name: "roleId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Roles permissions create.
func (a *IamApi) RolesPermissionsCreate(roleId string, body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/iam/roles/%s/permissions", SerializePathParameter(roleId, PathParameterSpec{Name: "roleId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Roles permissions delete.
func (a *IamApi) RolesPermissionsDelete(roleId string, permissionId string) (struct{}, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/iam/roles/%s/permissions/%s", SerializePathParameter(roleId, PathParameterSpec{Name: "roleId", Style: "simple", Explode: false}), SerializePathParameter(permissionId, PathParameterSpec{Name: "permissionId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

// Security Events list.
func (a *IamApi) SecurityEventsList(page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/iam/security_events"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Security Events retrieve.
func (a *IamApi) SecurityEventsRetrieve(securityEventId string) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/iam/security_events/%s", SerializePathParameter(securityEventId, PathParameterSpec{Name: "securityEventId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Service Account Credentials revoke.
func (a *IamApi) ServiceAccountCredentialsRevoke(credentialId string, body sdktypes.ServiceAccountCredentialRevokeCommand) (sdktypes.SdkWorkCommandResponse, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/iam/service_account_credentials/%s/revoke", SerializePathParameter(credentialId, PathParameterSpec{Name: "credentialId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkCommandResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkCommandResponse](raw)
}

// Service Account Tokens create.
func (a *IamApi) ServiceAccountTokensCreate(body sdktypes.ServiceAccountTokenExchangeCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Request("POST", BackendApiPath("/iam/service_account_tokens"), body, nil, nil, "application/json", true, false)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Service Accounts list.
func (a *IamApi) ServiceAccountsList(page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/iam/service_accounts"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Service Accounts create.
func (a *IamApi) ServiceAccountsCreate(body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath("/iam/service_accounts"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Service Accounts delete.
func (a *IamApi) ServiceAccountsDelete(serviceAccountId string) (struct{}, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/iam/service_accounts/%s", SerializePathParameter(serviceAccountId, PathParameterSpec{Name: "serviceAccountId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

// Service Accounts retrieve.
func (a *IamApi) ServiceAccountsRetrieve(serviceAccountId string) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/iam/service_accounts/%s", SerializePathParameter(serviceAccountId, PathParameterSpec{Name: "serviceAccountId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Service Accounts update.
func (a *IamApi) ServiceAccountsUpdate(serviceAccountId string, body *sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/iam/service_accounts/%s", SerializePathParameter(serviceAccountId, PathParameterSpec{Name: "serviceAccountId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Service Accounts credentials create.
func (a *IamApi) ServiceAccountsCredentialsCreate(serviceAccountId string, body sdktypes.ServiceAccountCredentialCreateCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/iam/service_accounts/%s/credentials", SerializePathParameter(serviceAccountId, PathParameterSpec{Name: "serviceAccountId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Tenant Applications create.
func (a *IamApi) TenantApplicationsCreate(body sdktypes.AppbaseTenantApplicationProvisionCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Request("POST", BackendApiPath("/iam/tenant_applications"), body, nil, nil, "application/json", true, false)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Tenant Applications retrieve.
func (a *IamApi) TenantApplicationsRetrieve(tenantApplicationId string) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/iam/tenant_applications/%s", SerializePathParameter(tenantApplicationId, PathParameterSpec{Name: "tenantApplicationId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Tenant Applications update.
func (a *IamApi) TenantApplicationsUpdate(tenantApplicationId string, body *sdktypes.AppbaseTenantApplicationUpdateCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Request("PATCH", BackendApiPath(fmt.Sprintf("/iam/tenant_applications/%s", SerializePathParameter(tenantApplicationId, PathParameterSpec{Name: "tenantApplicationId", Style: "simple", Explode: false}))), body, nil, nil, "application/json", true, false)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Tenant Applications enable.
func (a *IamApi) TenantApplicationsEnable(tenantApplicationId string, body sdktypes.AppbaseTenantApplicationEnableCommand) (sdktypes.SdkWorkCommandResponse, error) {
    raw, err := a.client.Request("POST", BackendApiPath(fmt.Sprintf("/iam/tenant_applications/%s/enable", SerializePathParameter(tenantApplicationId, PathParameterSpec{Name: "tenantApplicationId", Style: "simple", Explode: false}))), body, nil, nil, "application/json", true, false)
    if err != nil {
        var zero sdktypes.SdkWorkCommandResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkCommandResponse](raw)
}

// Tenants list.
func (a *IamApi) TenantsList(page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/iam/tenants"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Tenants create.
func (a *IamApi) TenantsCreate(body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath("/iam/tenants"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Tenants delete.
func (a *IamApi) TenantsDelete(tenantId string) (struct{}, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/iam/tenants/%s", SerializePathParameter(tenantId, PathParameterSpec{Name: "tenantId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

// Tenants retrieve.
func (a *IamApi) TenantsRetrieve(tenantId string) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/iam/tenants/%s", SerializePathParameter(tenantId, PathParameterSpec{Name: "tenantId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Tenants update.
func (a *IamApi) TenantsUpdate(tenantId string, body *sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/iam/tenants/%s", SerializePathParameter(tenantId, PathParameterSpec{Name: "tenantId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Tenant Applications list.
func (a *IamApi) TenantApplicationsList(tenantId string, page *int, pageSize *int, cursor *string, sort *string, q *string, status *string, environment *string, applicationType *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "environment", Value: func() interface{} { if environment == nil { return nil }; return *environment }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "application_type", Value: func() interface{} { if applicationType == nil { return nil }; return *applicationType }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath(fmt.Sprintf("/iam/tenants/%s/applications", SerializePathParameter(tenantId, PathParameterSpec{Name: "tenantId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Tenant Applications management create.
func (a *IamApi) TenantApplicationsManagementCreate(tenantId string, body sdktypes.IamTenantApplicationManagementProvisionCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/iam/tenants/%s/applications", SerializePathParameter(tenantId, PathParameterSpec{Name: "tenantId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Tenant Applications management update.
func (a *IamApi) TenantApplicationsManagementUpdate(tenantId string, tenantApplicationId string, body *sdktypes.IamTenantApplicationManagementUpdateCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/iam/tenants/%s/applications/%s", SerializePathParameter(tenantId, PathParameterSpec{Name: "tenantId", Style: "simple", Explode: false}), SerializePathParameter(tenantApplicationId, PathParameterSpec{Name: "tenantApplicationId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Tenant Applications management disable.
func (a *IamApi) TenantApplicationsManagementDisable(tenantId string, tenantApplicationId string, body sdktypes.IamTenantApplicationStatusCommand) (sdktypes.SdkWorkCommandResponse, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/iam/tenants/%s/applications/%s/disable", SerializePathParameter(tenantId, PathParameterSpec{Name: "tenantId", Style: "simple", Explode: false}), SerializePathParameter(tenantApplicationId, PathParameterSpec{Name: "tenantApplicationId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkCommandResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkCommandResponse](raw)
}

// Tenant Applications management enable.
func (a *IamApi) TenantApplicationsManagementEnable(tenantId string, tenantApplicationId string, body sdktypes.IamTenantApplicationStatusCommand) (sdktypes.SdkWorkCommandResponse, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/iam/tenants/%s/applications/%s/enable", SerializePathParameter(tenantId, PathParameterSpec{Name: "tenantId", Style: "simple", Explode: false}), SerializePathParameter(tenantApplicationId, PathParameterSpec{Name: "tenantApplicationId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkCommandResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkCommandResponse](raw)
}

// Tenant Applications summary retrieve.
func (a *IamApi) TenantApplicationsSummaryRetrieve(tenantId string) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/iam/tenants/%s/applications/summary", SerializePathParameter(tenantId, PathParameterSpec{Name: "tenantId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Tenants members list.
func (a *IamApi) TenantsMembersList(tenantId string, page *int, pageSize *int, cursor *string, sort *string, q *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath(fmt.Sprintf("/iam/tenants/%s/members", SerializePathParameter(tenantId, PathParameterSpec{Name: "tenantId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Tenants members create.
func (a *IamApi) TenantsMembersCreate(tenantId string, body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/iam/tenants/%s/members", SerializePathParameter(tenantId, PathParameterSpec{Name: "tenantId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Tenants members delete.
func (a *IamApi) TenantsMembersDelete(tenantId string, userId string) (struct{}, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/iam/tenants/%s/members/%s", SerializePathParameter(tenantId, PathParameterSpec{Name: "tenantId", Style: "simple", Explode: false}), SerializePathParameter(userId, PathParameterSpec{Name: "userId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

// Tenants members update.
func (a *IamApi) TenantsMembersUpdate(tenantId string, userId string, body *sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/iam/tenants/%s/members/%s", SerializePathParameter(tenantId, PathParameterSpec{Name: "tenantId", Style: "simple", Explode: false}), SerializePathParameter(userId, PathParameterSpec{Name: "userId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Users list.
func (a *IamApi) UsersList(page *int, pageSize *int, cursor *string, sort *string, q *string, status *string) (sdktypes.SdkWorkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sort", Value: func() interface{} { if sort == nil { return nil }; return *sort }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/iam/users"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkListResponse](raw)
}

// Users create.
func (a *IamApi) UsersCreate(body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath("/iam/users"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Users delete.
func (a *IamApi) UsersDelete(userId string) (struct{}, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/iam/users/%s", SerializePathParameter(userId, PathParameterSpec{Name: "userId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

// Users retrieve.
func (a *IamApi) UsersRetrieve(userId string) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/iam/users/%s", SerializePathParameter(userId, PathParameterSpec{Name: "userId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Users update.
func (a *IamApi) UsersUpdate(userId string, body *sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/iam/users/%s", SerializePathParameter(userId, PathParameterSpec{Name: "userId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Users ban.
func (a *IamApi) UsersBan(userId string, body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/iam/users/%s/ban", SerializePathParameter(userId, PathParameterSpec{Name: "userId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkResourceResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkResourceResponse](raw)
}

// Users unban.
func (a *IamApi) UsersUnban(userId string, body sdktypes.AppbaseOperationCommand) (sdktypes.SdkWorkResourceResponse, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/iam/users/%s/unban", SerializePathParameter(userId, PathParameterSpec{Name: "userId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
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
