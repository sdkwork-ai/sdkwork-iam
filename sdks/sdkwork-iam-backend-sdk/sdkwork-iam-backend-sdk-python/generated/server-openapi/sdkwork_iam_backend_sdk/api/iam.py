from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import AppbaseAccessCredentialCreateCommand, AppbaseApplicationRegisterCommand, AppbaseTenantApplicationEnableCommand, AppbaseTenantApplicationProvisionCommand, AppbaseTenantApplicationUpdateCommand, IamTenantApplicationManagementProvisionCommand, IamTenantApplicationManagementUpdateCommand, IamTenantApplicationStatusCommand, SdkWorkCommandResponse, SdkWorkListResponse, SdkWorkResourceResponse, ServiceAccountCredentialCreateCommand, ServiceAccountCredentialRevokeCommand, ServiceAccountTokenExchangeCommand

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"

def serialize_path_parameter(value: Any, spec: Dict[str, Any]) -> str:
    if value is None:
        return ''

    style = str(spec.get('style') or 'simple')
    name = str(spec.get('name') or '')
    explode = bool(spec.get('explode'))
    if isinstance(value, (list, tuple)):
        return serialize_path_array(name, value, style, explode)
    if isinstance(value, dict):
        return serialize_path_object(name, value, style, explode)
    return path_prefix(name, style) + encode_path_value(serialize_path_primitive(value))


def serialize_path_array(name: str, values: Any, style: str, explode: bool) -> str:
    serialized = [encode_path_value(serialize_path_primitive(item)) for item in values if item is not None]
    if not serialized:
        return path_prefix(name, style)
    if style == 'matrix':
        return ''.join(f";{name}={item}" for item in serialized) if explode else f";{name}={','.join(serialized)}"
    return path_prefix(name, style) + ('.' if explode else ',').join(serialized)


def serialize_path_object(name: str, value: Dict[str, Any], style: str, explode: bool) -> str:
    entries = [(key, entry_value) for key, entry_value in value.items() if entry_value is not None]
    if not entries:
        return path_prefix(name, style)
    if style == 'matrix':
        if explode:
            return ''.join(f";{encode_path_value(str(key))}={encode_path_value(serialize_path_primitive(entry_value))}" for key, entry_value in entries)
        serialized = ','.join(item for key, entry_value in entries for item in (encode_path_value(str(key)), encode_path_value(serialize_path_primitive(entry_value))))
        return f";{name}={serialized}"
    if explode:
        separator = '.' if style == 'label' else ','
        serialized = separator.join(f"{encode_path_value(str(key))}={encode_path_value(serialize_path_primitive(entry_value))}" for key, entry_value in entries)
    else:
        serialized = ','.join(item for key, entry_value in entries for item in (encode_path_value(str(key)), encode_path_value(serialize_path_primitive(entry_value))))
    return path_prefix(name, style) + serialized


def path_prefix(name: str, style: str) -> str:
    if style == 'label':
        return '.'
    if style == 'matrix':
        return f";{name}"
    return ''


def encode_path_value(value: str) -> str:
    from urllib.parse import quote

    return quote(value, safe='')


def serialize_path_primitive(value: Any) -> str:
    if isinstance(value, dict):
        import json

        return json.dumps(value, separators=(',', ':'))
    return str(value)


def build_query_string(parameters: List[Dict[str, Any]]) -> str:
    pairs: List[str] = []
    for parameter in parameters:
        append_serialized_parameter(pairs, parameter)
    return '&'.join(pairs)


def append_serialized_parameter(pairs: List[str], parameter: Dict[str, Any]) -> None:
    value = parameter.get('value')
    if value is None:
        return

    name = str(parameter.get('name') or '')
    allow_reserved = bool(parameter.get('allow_reserved'))
    content_type = parameter.get('content_type')
    if content_type:
        import json

        pairs.append(f"{encode_query_component(name)}={encode_query_value(json.dumps(value, separators=(',', ':')), allow_reserved)}")
        return

    style = str(parameter.get('style') or 'form')
    explode = bool(parameter.get('explode'))
    if style == 'deepObject':
        append_deep_object_parameter(pairs, name, value, allow_reserved)
        return
    if isinstance(value, (list, tuple)):
        append_array_parameter(pairs, name, value, style, explode, allow_reserved)
        return
    if isinstance(value, dict):
        append_object_parameter(pairs, name, value, style, explode, allow_reserved)
        return

    pairs.append(f"{encode_query_component(name)}={encode_query_value(serialize_primitive(value), allow_reserved)}")


def append_array_parameter(
    pairs: List[str],
    name: str,
    value: Any,
    style: str,
    explode: bool,
    allow_reserved: bool,
) -> None:
    values = [serialize_primitive(item) for item in value if item is not None]
    if not values:
        return

    if style == 'form' and explode:
        for item in values:
            pairs.append(f"{encode_query_component(name)}={encode_query_value(item, allow_reserved)}")
        return

    pairs.append(f"{encode_query_component(name)}={encode_query_value(','.join(values), allow_reserved)}")


def append_object_parameter(
    pairs: List[str],
    name: str,
    value: Dict[str, Any],
    style: str,
    explode: bool,
    allow_reserved: bool,
) -> None:
    entries = [(key, entry_value) for key, entry_value in value.items() if entry_value is not None]
    if not entries:
        return

    if style == 'form' and explode:
        for key, entry_value in entries:
            pairs.append(f"{encode_query_component(str(key))}={encode_query_value(serialize_primitive(entry_value), allow_reserved)}")
        return

    serialized = ','.join(
        item
        for key, entry_value in entries
        for item in (str(key), serialize_primitive(entry_value))
    )
    pairs.append(f"{encode_query_component(name)}={encode_query_value(serialized, allow_reserved)}")


def append_deep_object_parameter(pairs: List[str], name: str, value: Any, allow_reserved: bool) -> None:
    if not isinstance(value, dict):
        pairs.append(f"{encode_query_component(name)}={encode_query_value(serialize_primitive(value), allow_reserved)}")
        return

    for key, entry_value in value.items():
        if entry_value is None:
            continue
        pairs.append(f"{encode_query_component(f'{name}[{key}]')}={encode_query_value(serialize_primitive(entry_value), allow_reserved)}")


def serialize_primitive(value: Any) -> str:
    if isinstance(value, dict):
        import json

        return json.dumps(value, separators=(',', ':'))
    return str(value)


def encode_query_component(value: str) -> str:
    from urllib.parse import quote

    return quote(value, safe='')


def encode_query_value(value: str, allow_reserved: bool) -> str:
    from urllib.parse import quote

    return quote(value, safe=':/?#[]@!$&\'()*+,;=' if allow_reserved else '')



class IamApi:
    """iam iam API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.access_credentials = IamAccessCredentialsApi(client)
        self.account_binding_policy = IamAccountBindingPolicyApi(client)
        self.api_keys = IamApiKeysApi(client)
        self.applications = IamApplicationsApi(client)
        self.audit_events = IamAuditEventsApi(client)
        self.department_assignments = IamDepartmentAssignmentsApi(client)
        self.departments = IamDepartmentsApi(client)
        self.groups = IamGroupsApi(client)
        self.organization_memberships = IamOrganizationMembershipsApi(client)
        self.organizations = IamOrganizationsApi(client)
        self.permissions = IamPermissionsApi(client)
        self.policies = IamPoliciesApi(client)
        self.position_assignments = IamPositionAssignmentsApi(client)
        self.positions = IamPositionsApi(client)
        self.provider_accounts = IamProviderAccountsApi(client)
        self.provider_credentials = IamProviderCredentialsApi(client)
        self.role_bindings = IamRoleBindingsApi(client)
        self.roles = IamRolesApi(client)
        self.security_events = IamSecurityEventsApi(client)
        self.service_account_credentials = IamServiceAccountCredentialsApi(client)
        self.service_account_tokens = IamServiceAccountTokensApi(client)
        self.service_accounts = IamServiceAccountsApi(client)
        self.tenant_applications = IamTenantApplicationsApi(client)
        self.tenants = IamTenantsApi(client)
        self.users = IamUsersApi(client)


class IamAccessCredentialsApi:
    """iam iam.access_credentials API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, body: AppbaseAccessCredentialCreateCommand) -> SdkWorkResourceResponse:
        """Access Credentials create."""
        return self._client.post(f"/backend/v3/api/iam/access_credentials", json=body, skip_auth=True)

class IamAccountBindingPolicyApi:
    """iam iam.account_binding_policy API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> SdkWorkResourceResponse:
        """Account Binding Policy retrieve."""
        return self._client.get(f"/backend/v3/api/iam/account_binding_policy")

    def update(self, body: Optional[Dict[str, Any]] = None) -> SdkWorkResourceResponse:
        """Account Binding Policy update."""
        return self._client.patch(f"/backend/v3/api/iam/account_binding_policy", json=body)

class IamApiKeysApi:
    """iam iam.api_keys API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Api Keys list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/api_keys", query))

    def revoke(self, api_key_id: str, body: Dict[str, Any]) -> SdkWorkCommandResponse:
        """Api Keys revoke."""
        return self._client.post(f"/backend/v3/api/iam/api_keys/{serialize_path_parameter(api_key_id, {'name': 'apiKeyId', 'style': 'simple', 'explode': False})}/revoke", json=body)

class IamApplicationsApi:
    """iam iam.applications API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def register(self, body: AppbaseApplicationRegisterCommand) -> SdkWorkCommandResponse:
        """Applications register."""
        return self._client.post(f"/backend/v3/api/iam/applications/register", json=body, skip_auth=True)

class IamAuditEventsApi:
    """iam iam.audit_events API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Audit Events list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/audit_events", query))

    def retrieve(self, audit_event_id: str) -> SdkWorkResourceResponse:
        """Audit Events retrieve."""
        return self._client.get(f"/backend/v3/api/iam/audit_events/{serialize_path_parameter(audit_event_id, {'name': 'auditEventId', 'style': 'simple', 'explode': False})}")

class IamDepartmentAssignmentsApi:
    """iam iam.department_assignments API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Department Assignments list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/department_assignments", query))

    def create(self, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Department Assignments create."""
        return self._client.post(f"/backend/v3/api/iam/department_assignments", json=body)

    def update(self, assignment_id: str, body: Optional[Dict[str, Any]] = None) -> SdkWorkResourceResponse:
        """Department Assignments update."""
        return self._client.patch(f"/backend/v3/api/iam/department_assignments/{serialize_path_parameter(assignment_id, {'name': 'assignmentId', 'style': 'simple', 'explode': False})}", json=body)

class IamDepartmentsApi:
    """iam iam.departments API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.tree = IamDepartmentsTreeApi(client)


    def list(self, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Departments list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/departments", query))

    def create(self, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Departments create."""
        return self._client.post(f"/backend/v3/api/iam/departments", json=body)

    def delete(self, department_id: str) -> None:
        """Departments delete."""
        return self._client.delete(f"/backend/v3/api/iam/departments/{serialize_path_parameter(department_id, {'name': 'departmentId', 'style': 'simple', 'explode': False})}")

    def retrieve(self, department_id: str) -> SdkWorkResourceResponse:
        """Departments retrieve."""
        return self._client.get(f"/backend/v3/api/iam/departments/{serialize_path_parameter(department_id, {'name': 'departmentId', 'style': 'simple', 'explode': False})}")

    def update(self, department_id: str, body: Optional[Dict[str, Any]] = None) -> SdkWorkResourceResponse:
        """Departments update."""
        return self._client.patch(f"/backend/v3/api/iam/departments/{serialize_path_parameter(department_id, {'name': 'departmentId', 'style': 'simple', 'explode': False})}", json=body)

class IamDepartmentsTreeApi:
    """iam iam.departments.tree API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> SdkWorkResourceResponse:
        """Departments tree retrieve."""
        return self._client.get(f"/backend/v3/api/iam/departments/tree")

class IamGroupsApi:
    """iam iam.groups API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.members = IamGroupsMembersApi(client)


    def list(self, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Groups list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/groups", query))

    def create(self, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Groups create."""
        return self._client.post(f"/backend/v3/api/iam/groups", json=body)

    def delete(self, group_id: str) -> None:
        """Groups delete."""
        return self._client.delete(f"/backend/v3/api/iam/groups/{serialize_path_parameter(group_id, {'name': 'groupId', 'style': 'simple', 'explode': False})}")

    def retrieve(self, group_id: str) -> SdkWorkResourceResponse:
        """Groups retrieve."""
        return self._client.get(f"/backend/v3/api/iam/groups/{serialize_path_parameter(group_id, {'name': 'groupId', 'style': 'simple', 'explode': False})}")

    def update(self, group_id: str, body: Optional[Dict[str, Any]] = None) -> SdkWorkResourceResponse:
        """Groups update."""
        return self._client.patch(f"/backend/v3/api/iam/groups/{serialize_path_parameter(group_id, {'name': 'groupId', 'style': 'simple', 'explode': False})}", json=body)

class IamGroupsMembersApi:
    """iam iam.groups.members API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, group_id: str, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Groups members list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/groups/{serialize_path_parameter(group_id, {'name': 'groupId', 'style': 'simple', 'explode': False})}/members", query))

    def create(self, group_id: str, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Groups members create."""
        return self._client.post(f"/backend/v3/api/iam/groups/{serialize_path_parameter(group_id, {'name': 'groupId', 'style': 'simple', 'explode': False})}/members", json=body)

    def delete(self, group_id: str, member_id: str) -> None:
        """Groups members delete."""
        return self._client.delete(f"/backend/v3/api/iam/groups/{serialize_path_parameter(group_id, {'name': 'groupId', 'style': 'simple', 'explode': False})}/members/{serialize_path_parameter(member_id, {'name': 'memberId', 'style': 'simple', 'explode': False})}")

class IamOrganizationMembershipsApi:
    """iam iam.organization_memberships API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Organization Memberships list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/organization_memberships", query))

    def create(self, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Organization Memberships create."""
        return self._client.post(f"/backend/v3/api/iam/organization_memberships", json=body)

    def update(self, membership_id: str, body: Optional[Dict[str, Any]] = None) -> SdkWorkResourceResponse:
        """Organization Memberships update."""
        return self._client.patch(f"/backend/v3/api/iam/organization_memberships/{serialize_path_parameter(membership_id, {'name': 'membershipId', 'style': 'simple', 'explode': False})}", json=body)

class IamOrganizationsApi:
    """iam iam.organizations API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.tree = IamOrganizationsTreeApi(client)


    def list(self, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Organizations list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/organizations", query))

    def create(self, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Organizations create."""
        return self._client.post(f"/backend/v3/api/iam/organizations", json=body)

    def delete(self, organization_id: str) -> None:
        """Organizations delete."""
        return self._client.delete(f"/backend/v3/api/iam/organizations/{serialize_path_parameter(organization_id, {'name': 'organizationId', 'style': 'simple', 'explode': False})}")

    def retrieve(self, organization_id: str) -> SdkWorkResourceResponse:
        """Organizations retrieve."""
        return self._client.get(f"/backend/v3/api/iam/organizations/{serialize_path_parameter(organization_id, {'name': 'organizationId', 'style': 'simple', 'explode': False})}")

    def update(self, organization_id: str, body: Optional[Dict[str, Any]] = None) -> SdkWorkResourceResponse:
        """Organizations update."""
        return self._client.patch(f"/backend/v3/api/iam/organizations/{serialize_path_parameter(organization_id, {'name': 'organizationId', 'style': 'simple', 'explode': False})}", json=body)

class IamOrganizationsTreeApi:
    """iam iam.organizations.tree API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> SdkWorkResourceResponse:
        """Organizations tree retrieve."""
        return self._client.get(f"/backend/v3/api/iam/organizations/tree")

class IamPermissionsApi:
    """iam iam.permissions API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Permissions list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/permissions", query))

    def create(self, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Permissions create."""
        return self._client.post(f"/backend/v3/api/iam/permissions", json=body)

    def delete(self, permission_id: str) -> None:
        """Permissions delete."""
        return self._client.delete(f"/backend/v3/api/iam/permissions/{serialize_path_parameter(permission_id, {'name': 'permissionId', 'style': 'simple', 'explode': False})}")

    def retrieve(self, permission_id: str) -> SdkWorkResourceResponse:
        """Permissions retrieve."""
        return self._client.get(f"/backend/v3/api/iam/permissions/{serialize_path_parameter(permission_id, {'name': 'permissionId', 'style': 'simple', 'explode': False})}")

    def update(self, permission_id: str, body: Optional[Dict[str, Any]] = None) -> SdkWorkResourceResponse:
        """Permissions update."""
        return self._client.patch(f"/backend/v3/api/iam/permissions/{serialize_path_parameter(permission_id, {'name': 'permissionId', 'style': 'simple', 'explode': False})}", json=body)

class IamPoliciesApi:
    """iam iam.policies API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Policies list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/policies", query))

    def create(self, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Policies create."""
        return self._client.post(f"/backend/v3/api/iam/policies", json=body)

    def delete(self, policy_id: str) -> None:
        """Policies delete."""
        return self._client.delete(f"/backend/v3/api/iam/policies/{serialize_path_parameter(policy_id, {'name': 'policyId', 'style': 'simple', 'explode': False})}")

    def retrieve(self, policy_id: str) -> SdkWorkResourceResponse:
        """Policies retrieve."""
        return self._client.get(f"/backend/v3/api/iam/policies/{serialize_path_parameter(policy_id, {'name': 'policyId', 'style': 'simple', 'explode': False})}")

    def update(self, policy_id: str, body: Optional[Dict[str, Any]] = None) -> SdkWorkResourceResponse:
        """Policies update."""
        return self._client.patch(f"/backend/v3/api/iam/policies/{serialize_path_parameter(policy_id, {'name': 'policyId', 'style': 'simple', 'explode': False})}", json=body)

class IamPositionAssignmentsApi:
    """iam iam.position_assignments API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Position Assignments list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/position_assignments", query))

    def create(self, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Position Assignments create."""
        return self._client.post(f"/backend/v3/api/iam/position_assignments", json=body)

    def update(self, assignment_id: str, body: Optional[Dict[str, Any]] = None) -> SdkWorkResourceResponse:
        """Position Assignments update."""
        return self._client.patch(f"/backend/v3/api/iam/position_assignments/{serialize_path_parameter(assignment_id, {'name': 'assignmentId', 'style': 'simple', 'explode': False})}", json=body)

class IamPositionsApi:
    """iam iam.positions API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Positions list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/positions", query))

    def create(self, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Positions create."""
        return self._client.post(f"/backend/v3/api/iam/positions", json=body)

    def delete(self, position_id: str) -> None:
        """Positions delete."""
        return self._client.delete(f"/backend/v3/api/iam/positions/{serialize_path_parameter(position_id, {'name': 'positionId', 'style': 'simple', 'explode': False})}")

    def update(self, position_id: str, body: Optional[Dict[str, Any]] = None) -> SdkWorkResourceResponse:
        """Positions update."""
        return self._client.patch(f"/backend/v3/api/iam/positions/{serialize_path_parameter(position_id, {'name': 'positionId', 'style': 'simple', 'explode': False})}", json=body)

class IamProviderAccountsApi:
    """iam iam.provider_accounts API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.credentials = IamProviderAccountsCredentialsApi(client)


    def list(self, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None, vendor_code: Optional[str] = None, scope_type: Optional[str] = None, owner_user_id: Optional[str] = None, organization_id: Optional[str] = None, status: Optional[str] = None, mine: Optional[bool] = None, include_platform: Optional[bool] = None) -> SdkWorkListResponse:
        """Provider Accounts list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'vendorCode', 'value': vendor_code, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'scopeType', 'value': scope_type, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'ownerUserId', 'value': owner_user_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'organizationId', 'value': organization_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'mine', 'value': mine, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'includePlatform', 'value': include_platform, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/provider_accounts", query))

    def create(self, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Provider Accounts create."""
        return self._client.post(f"/backend/v3/api/iam/provider_accounts", json=body)

    def delete(self, provider_account_id: str) -> None:
        """Provider Accounts delete."""
        return self._client.delete(f"/backend/v3/api/iam/provider_accounts/{serialize_path_parameter(provider_account_id, {'name': 'providerAccountId', 'style': 'simple', 'explode': False})}")

    def retrieve(self, provider_account_id: str) -> SdkWorkResourceResponse:
        """Provider Accounts retrieve."""
        return self._client.get(f"/backend/v3/api/iam/provider_accounts/{serialize_path_parameter(provider_account_id, {'name': 'providerAccountId', 'style': 'simple', 'explode': False})}")

    def update(self, provider_account_id: str, body: Optional[Dict[str, Any]] = None) -> SdkWorkResourceResponse:
        """Provider Accounts update."""
        return self._client.patch(f"/backend/v3/api/iam/provider_accounts/{serialize_path_parameter(provider_account_id, {'name': 'providerAccountId', 'style': 'simple', 'explode': False})}", json=body)

    def set_default(self, provider_account_id: str, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Provider Accounts set Default."""
        return self._client.post(f"/backend/v3/api/iam/provider_accounts/{serialize_path_parameter(provider_account_id, {'name': 'providerAccountId', 'style': 'simple', 'explode': False})}/default", json=body)

    def resolve(self, vendor_code: str, capability_code: Optional[str] = None, environment: Optional[str] = None, user_id: Optional[str] = None, organization_id: Optional[str] = None) -> SdkWorkResourceResponse:
        """Provider Accounts resolve."""
        query = build_query_string([
            {'name': 'vendorCode', 'value': vendor_code, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'capabilityCode', 'value': capability_code, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'environment', 'value': environment, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'userId', 'value': user_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'organizationId', 'value': organization_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/provider_accounts/resolve", query))

class IamProviderAccountsCredentialsApi:
    """iam iam.provider_accounts.credentials API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, provider_account_id: str, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Provider Accounts credentials list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/provider_accounts/{serialize_path_parameter(provider_account_id, {'name': 'providerAccountId', 'style': 'simple', 'explode': False})}/credentials", query))

    def create(self, provider_account_id: str, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Provider Accounts credentials create."""
        return self._client.post(f"/backend/v3/api/iam/provider_accounts/{serialize_path_parameter(provider_account_id, {'name': 'providerAccountId', 'style': 'simple', 'explode': False})}/credentials", json=body)

class IamProviderCredentialsApi:
    """iam iam.provider_credentials API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def revoke(self, credential_id: str, body: Dict[str, Any]) -> SdkWorkCommandResponse:
        """Provider Credentials revoke."""
        return self._client.post(f"/backend/v3/api/iam/provider_credentials/{serialize_path_parameter(credential_id, {'name': 'credentialId', 'style': 'simple', 'explode': False})}/revoke", json=body)

class IamRoleBindingsApi:
    """iam iam.role_bindings API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None, role_id: Optional[str] = None, principal_kind: Optional[str] = None, principal_id: Optional[str] = None, scope_kind: Optional[str] = None, scope_id: Optional[str] = None) -> SdkWorkListResponse:
        """Role Bindings list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'roleId', 'value': role_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'principalKind', 'value': principal_kind, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'principalId', 'value': principal_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'scopeKind', 'value': scope_kind, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'scopeId', 'value': scope_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/role_bindings", query))

    def create(self, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Role Bindings create."""
        return self._client.post(f"/backend/v3/api/iam/role_bindings", json=body)

    def delete(self, role_binding_id: str) -> None:
        """Role Bindings delete."""
        return self._client.delete(f"/backend/v3/api/iam/role_bindings/{serialize_path_parameter(role_binding_id, {'name': 'roleBindingId', 'style': 'simple', 'explode': False})}")

class IamRolesApi:
    """iam iam.roles API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.permissions = IamRolesPermissionsApi(client)


    def list(self, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Roles list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/roles", query))

    def create(self, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Roles create."""
        return self._client.post(f"/backend/v3/api/iam/roles", json=body)

    def delete(self, role_id: str) -> None:
        """Roles delete."""
        return self._client.delete(f"/backend/v3/api/iam/roles/{serialize_path_parameter(role_id, {'name': 'roleId', 'style': 'simple', 'explode': False})}")

    def retrieve(self, role_id: str) -> SdkWorkResourceResponse:
        """Roles retrieve."""
        return self._client.get(f"/backend/v3/api/iam/roles/{serialize_path_parameter(role_id, {'name': 'roleId', 'style': 'simple', 'explode': False})}")

    def update(self, role_id: str, body: Optional[Dict[str, Any]] = None) -> SdkWorkResourceResponse:
        """Roles update."""
        return self._client.patch(f"/backend/v3/api/iam/roles/{serialize_path_parameter(role_id, {'name': 'roleId', 'style': 'simple', 'explode': False})}", json=body)

class IamRolesPermissionsApi:
    """iam iam.roles.permissions API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, role_id: str, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Roles permissions list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/roles/{serialize_path_parameter(role_id, {'name': 'roleId', 'style': 'simple', 'explode': False})}/permissions", query))

    def create(self, role_id: str, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Roles permissions create."""
        return self._client.post(f"/backend/v3/api/iam/roles/{serialize_path_parameter(role_id, {'name': 'roleId', 'style': 'simple', 'explode': False})}/permissions", json=body)

    def delete(self, role_id: str, permission_id: str) -> None:
        """Roles permissions delete."""
        return self._client.delete(f"/backend/v3/api/iam/roles/{serialize_path_parameter(role_id, {'name': 'roleId', 'style': 'simple', 'explode': False})}/permissions/{serialize_path_parameter(permission_id, {'name': 'permissionId', 'style': 'simple', 'explode': False})}")

class IamSecurityEventsApi:
    """iam iam.security_events API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Security Events list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/security_events", query))

    def retrieve(self, security_event_id: str) -> SdkWorkResourceResponse:
        """Security Events retrieve."""
        return self._client.get(f"/backend/v3/api/iam/security_events/{serialize_path_parameter(security_event_id, {'name': 'securityEventId', 'style': 'simple', 'explode': False})}")

class IamServiceAccountCredentialsApi:
    """iam iam.service_account_credentials API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def revoke(self, credential_id: str, body: ServiceAccountCredentialRevokeCommand) -> SdkWorkCommandResponse:
        """Service Account Credentials revoke."""
        return self._client.post(f"/backend/v3/api/iam/service_account_credentials/{serialize_path_parameter(credential_id, {'name': 'credentialId', 'style': 'simple', 'explode': False})}/revoke", json=body)

class IamServiceAccountTokensApi:
    """iam iam.service_account_tokens API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, body: ServiceAccountTokenExchangeCommand) -> SdkWorkResourceResponse:
        """Service Account Tokens create."""
        return self._client.post(f"/backend/v3/api/iam/service_account_tokens", json=body, skip_auth=True)

class IamServiceAccountsApi:
    """iam iam.service_accounts API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.credentials = IamServiceAccountsCredentialsApi(client)


    def list(self, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Service Accounts list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/service_accounts", query))

    def create(self, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Service Accounts create."""
        return self._client.post(f"/backend/v3/api/iam/service_accounts", json=body)

    def delete(self, service_account_id: str) -> None:
        """Service Accounts delete."""
        return self._client.delete(f"/backend/v3/api/iam/service_accounts/{serialize_path_parameter(service_account_id, {'name': 'serviceAccountId', 'style': 'simple', 'explode': False})}")

    def retrieve(self, service_account_id: str) -> SdkWorkResourceResponse:
        """Service Accounts retrieve."""
        return self._client.get(f"/backend/v3/api/iam/service_accounts/{serialize_path_parameter(service_account_id, {'name': 'serviceAccountId', 'style': 'simple', 'explode': False})}")

    def update(self, service_account_id: str, body: Optional[Dict[str, Any]] = None) -> SdkWorkResourceResponse:
        """Service Accounts update."""
        return self._client.patch(f"/backend/v3/api/iam/service_accounts/{serialize_path_parameter(service_account_id, {'name': 'serviceAccountId', 'style': 'simple', 'explode': False})}", json=body)

class IamServiceAccountsCredentialsApi:
    """iam iam.service_accounts.credentials API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, service_account_id: str, body: ServiceAccountCredentialCreateCommand) -> SdkWorkResourceResponse:
        """Service Accounts credentials create."""
        return self._client.post(f"/backend/v3/api/iam/service_accounts/{serialize_path_parameter(service_account_id, {'name': 'serviceAccountId', 'style': 'simple', 'explode': False})}/credentials", json=body)

class IamTenantApplicationsApi:
    """iam iam.tenant_applications API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.management = IamTenantApplicationsManagementApi(client)
        self.summary = IamTenantApplicationsSummaryApi(client)


    def create(self, body: AppbaseTenantApplicationProvisionCommand) -> SdkWorkResourceResponse:
        """Tenant Applications create."""
        return self._client.post(f"/backend/v3/api/iam/tenant_applications", json=body, skip_auth=True)

    def retrieve(self, tenant_application_id: str) -> SdkWorkResourceResponse:
        """Tenant Applications retrieve."""
        return self._client.get(f"/backend/v3/api/iam/tenant_applications/{serialize_path_parameter(tenant_application_id, {'name': 'tenantApplicationId', 'style': 'simple', 'explode': False})}")

    def update(self, tenant_application_id: str, body: Optional[AppbaseTenantApplicationUpdateCommand] = None) -> SdkWorkResourceResponse:
        """Tenant Applications update."""
        return self._client.patch(f"/backend/v3/api/iam/tenant_applications/{serialize_path_parameter(tenant_application_id, {'name': 'tenantApplicationId', 'style': 'simple', 'explode': False})}", json=body, skip_auth=True)

    def enable(self, tenant_application_id: str, body: AppbaseTenantApplicationEnableCommand) -> SdkWorkCommandResponse:
        """Tenant Applications enable."""
        return self._client.post(f"/backend/v3/api/iam/tenant_applications/{serialize_path_parameter(tenant_application_id, {'name': 'tenantApplicationId', 'style': 'simple', 'explode': False})}/enable", json=body, skip_auth=True)

    def list(self, tenant_id: str, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None, status: Optional[str] = None, environment: Optional[str] = None, application_type: Optional[str] = None) -> SdkWorkListResponse:
        """Tenant Applications list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'environment', 'value': environment, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'application_type', 'value': application_type, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/tenants/{serialize_path_parameter(tenant_id, {'name': 'tenantId', 'style': 'simple', 'explode': False})}/applications", query))

class IamTenantApplicationsManagementApi:
    """iam iam.tenant_applications.management API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, tenant_id: str, body: IamTenantApplicationManagementProvisionCommand) -> SdkWorkResourceResponse:
        """Tenant Applications management create."""
        return self._client.post(f"/backend/v3/api/iam/tenants/{serialize_path_parameter(tenant_id, {'name': 'tenantId', 'style': 'simple', 'explode': False})}/applications", json=body)

    def update(self, tenant_id: str, tenant_application_id: str, body: Optional[IamTenantApplicationManagementUpdateCommand] = None) -> SdkWorkResourceResponse:
        """Tenant Applications management update."""
        return self._client.patch(f"/backend/v3/api/iam/tenants/{serialize_path_parameter(tenant_id, {'name': 'tenantId', 'style': 'simple', 'explode': False})}/applications/{serialize_path_parameter(tenant_application_id, {'name': 'tenantApplicationId', 'style': 'simple', 'explode': False})}", json=body)

    def disable(self, tenant_id: str, tenant_application_id: str, body: IamTenantApplicationStatusCommand) -> SdkWorkCommandResponse:
        """Tenant Applications management disable."""
        return self._client.post(f"/backend/v3/api/iam/tenants/{serialize_path_parameter(tenant_id, {'name': 'tenantId', 'style': 'simple', 'explode': False})}/applications/{serialize_path_parameter(tenant_application_id, {'name': 'tenantApplicationId', 'style': 'simple', 'explode': False})}/disable", json=body)

    def enable(self, tenant_id: str, tenant_application_id: str, body: IamTenantApplicationStatusCommand) -> SdkWorkCommandResponse:
        """Tenant Applications management enable."""
        return self._client.post(f"/backend/v3/api/iam/tenants/{serialize_path_parameter(tenant_id, {'name': 'tenantId', 'style': 'simple', 'explode': False})}/applications/{serialize_path_parameter(tenant_application_id, {'name': 'tenantApplicationId', 'style': 'simple', 'explode': False})}/enable", json=body)

class IamTenantApplicationsSummaryApi:
    """iam iam.tenant_applications.summary API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self, tenant_id: str) -> SdkWorkResourceResponse:
        """Tenant Applications summary retrieve."""
        return self._client.get(f"/backend/v3/api/iam/tenants/{serialize_path_parameter(tenant_id, {'name': 'tenantId', 'style': 'simple', 'explode': False})}/applications/summary")

class IamTenantsApi:
    """iam iam.tenants API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.members = IamTenantsMembersApi(client)


    def list(self, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Tenants list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/tenants", query))

    def create(self, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Tenants create."""
        return self._client.post(f"/backend/v3/api/iam/tenants", json=body)

    def delete(self, tenant_id: str) -> None:
        """Tenants delete."""
        return self._client.delete(f"/backend/v3/api/iam/tenants/{serialize_path_parameter(tenant_id, {'name': 'tenantId', 'style': 'simple', 'explode': False})}")

    def retrieve(self, tenant_id: str) -> SdkWorkResourceResponse:
        """Tenants retrieve."""
        return self._client.get(f"/backend/v3/api/iam/tenants/{serialize_path_parameter(tenant_id, {'name': 'tenantId', 'style': 'simple', 'explode': False})}")

    def update(self, tenant_id: str, body: Optional[Dict[str, Any]] = None) -> SdkWorkResourceResponse:
        """Tenants update."""
        return self._client.patch(f"/backend/v3/api/iam/tenants/{serialize_path_parameter(tenant_id, {'name': 'tenantId', 'style': 'simple', 'explode': False})}", json=body)

class IamTenantsMembersApi:
    """iam iam.tenants.members API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, tenant_id: str, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Tenants members list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/tenants/{serialize_path_parameter(tenant_id, {'name': 'tenantId', 'style': 'simple', 'explode': False})}/members", query))

    def create(self, tenant_id: str, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Tenants members create."""
        return self._client.post(f"/backend/v3/api/iam/tenants/{serialize_path_parameter(tenant_id, {'name': 'tenantId', 'style': 'simple', 'explode': False})}/members", json=body)

    def delete(self, tenant_id: str, user_id: str) -> None:
        """Tenants members delete."""
        return self._client.delete(f"/backend/v3/api/iam/tenants/{serialize_path_parameter(tenant_id, {'name': 'tenantId', 'style': 'simple', 'explode': False})}/members/{serialize_path_parameter(user_id, {'name': 'userId', 'style': 'simple', 'explode': False})}")

    def update(self, tenant_id: str, user_id: str, body: Optional[Dict[str, Any]] = None) -> SdkWorkResourceResponse:
        """Tenants members update."""
        return self._client.patch(f"/backend/v3/api/iam/tenants/{serialize_path_parameter(tenant_id, {'name': 'tenantId', 'style': 'simple', 'explode': False})}/members/{serialize_path_parameter(user_id, {'name': 'userId', 'style': 'simple', 'explode': False})}", json=body)

class IamUsersApi:
    """iam iam.users API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None, status: Optional[str] = None) -> SdkWorkListResponse:
        """Users list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/iam/users", query))

    def create(self, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Users create."""
        return self._client.post(f"/backend/v3/api/iam/users", json=body)

    def delete(self, user_id: str) -> None:
        """Users delete."""
        return self._client.delete(f"/backend/v3/api/iam/users/{serialize_path_parameter(user_id, {'name': 'userId', 'style': 'simple', 'explode': False})}")

    def retrieve(self, user_id: str) -> SdkWorkResourceResponse:
        """Users retrieve."""
        return self._client.get(f"/backend/v3/api/iam/users/{serialize_path_parameter(user_id, {'name': 'userId', 'style': 'simple', 'explode': False})}")

    def update(self, user_id: str, body: Optional[Dict[str, Any]] = None) -> SdkWorkResourceResponse:
        """Users update."""
        return self._client.patch(f"/backend/v3/api/iam/users/{serialize_path_parameter(user_id, {'name': 'userId', 'style': 'simple', 'explode': False})}", json=body)

    def ban(self, user_id: str, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Users ban."""
        return self._client.post(f"/backend/v3/api/iam/users/{serialize_path_parameter(user_id, {'name': 'userId', 'style': 'simple', 'explode': False})}/ban", json=body)

    def unban(self, user_id: str, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Users unban."""
        return self._client.post(f"/backend/v3/api/iam/users/{serialize_path_parameter(user_id, {'name': 'userId', 'style': 'simple', 'explode': False})}/unban", json=body)
