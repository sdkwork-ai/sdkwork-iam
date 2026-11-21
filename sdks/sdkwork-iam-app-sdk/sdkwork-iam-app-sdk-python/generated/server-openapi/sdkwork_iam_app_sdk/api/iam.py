from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import IamAppAccessTokenCreateCommand, IamAppAccessTokenResponse, IamOrganizationMemberListResponse, IamPersonaCatalogResponse, IamUserPersonaResponse, IamUserPersonaUpdateCommand, SdkWorkListResponse, SdkWorkResourceResponse

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
        self.app_access_tokens = IamAppAccessTokensApi(client)
        self.department_assignments = IamDepartmentAssignmentsApi(client)
        self.departments = IamDepartmentsApi(client)
        self.oauth = IamOauthApi(client)
        self.organization_memberships = IamOrganizationMembershipsApi(client)
        self.organizations = IamOrganizationsApi(client)
        self.persona_catalog = IamPersonaCatalogApi(client)
        self.position_assignments = IamPositionAssignmentsApi(client)
        self.positions = IamPositionsApi(client)
        self.role_bindings = IamRoleBindingsApi(client)
        self.users = IamUsersApi(client)


class IamAppAccessTokensApi:
    """iam iam.app_access_tokens API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, body: IamAppAccessTokenCreateCommand) -> IamAppAccessTokenResponse:
        """App Access Tokens create."""
        return self._client.post(f"/app/v3/api/iam/app_access_tokens", json=body)

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
        return self._client.get(_append_query_string(f"/app/v3/api/iam/department_assignments", query))

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
        return self._client.get(_append_query_string(f"/app/v3/api/iam/departments", query))

class IamDepartmentsTreeApi:
    """iam iam.departments.tree API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> SdkWorkResourceResponse:
        """Departments tree retrieve."""
        return self._client.get(f"/app/v3/api/iam/departments/tree")

class IamOauthApi:
    """iam iam.oauth API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.official_account_settings = IamOauthOfficialAccountSettingsApi(client)
        self.official_accounts = IamOauthOfficialAccountsApi(client)


class IamOauthOfficialAccountSettingsApi:
    """iam iam.oauth.official_account_settings API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> SdkWorkResourceResponse:
        """Oauth official Account Settings retrieve."""
        return self._client.get(f"/app/v3/api/iam/oauth/official_account_settings")

class IamOauthOfficialAccountsApi:
    """iam iam.oauth.official_accounts API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.custom_menus = IamOauthOfficialAccountsCustomMenusApi(client)


    def list(self, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None) -> SdkWorkListResponse:
        """Oauth official Accounts list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/iam/oauth/official_accounts", query))

    def create(self, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Oauth official Accounts create."""
        return self._client.post(f"/app/v3/api/iam/oauth/official_accounts", json=body)

    def delete(self, official_account_id: str) -> None:
        """Oauth official Accounts delete."""
        return self._client.delete(f"/app/v3/api/iam/oauth/official_accounts/{serialize_path_parameter(official_account_id, {'name': 'officialAccountId', 'style': 'simple', 'explode': False})}")

    def retrieve(self, official_account_id: str) -> SdkWorkResourceResponse:
        """Oauth official Accounts retrieve."""
        return self._client.get(f"/app/v3/api/iam/oauth/official_accounts/{serialize_path_parameter(official_account_id, {'name': 'officialAccountId', 'style': 'simple', 'explode': False})}")

    def update(self, official_account_id: str, body: Optional[Dict[str, Any]] = None) -> SdkWorkResourceResponse:
        """Oauth official Accounts update."""
        return self._client.patch(f"/app/v3/api/iam/oauth/official_accounts/{serialize_path_parameter(official_account_id, {'name': 'officialAccountId', 'style': 'simple', 'explode': False})}", json=body)

class IamOauthOfficialAccountsCustomMenusApi:
    """iam iam.oauth.official_accounts.custom_menus API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def publish(self, official_account_id: str, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Oauth official Accounts custom Menus publish."""
        return self._client.post(f"/app/v3/api/iam/oauth/official_accounts/{serialize_path_parameter(official_account_id, {'name': 'officialAccountId', 'style': 'simple', 'explode': False})}/custom_menus/publish", json=body)

    def rollback(self, official_account_id: str, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Oauth official Accounts custom Menus rollback."""
        return self._client.post(f"/app/v3/api/iam/oauth/official_accounts/{serialize_path_parameter(official_account_id, {'name': 'officialAccountId', 'style': 'simple', 'explode': False})}/custom_menus/rollback", json=body)

    def sync(self, official_account_id: str, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Oauth official Accounts custom Menus sync."""
        return self._client.post(f"/app/v3/api/iam/oauth/official_accounts/{serialize_path_parameter(official_account_id, {'name': 'officialAccountId', 'style': 'simple', 'explode': False})}/custom_menus/sync", json=body)

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
        return self._client.get(_append_query_string(f"/app/v3/api/iam/organization_memberships", query))

class IamOrganizationsApi:
    """iam iam.organizations API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.members = IamOrganizationsMembersApi(client)
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
        return self._client.get(_append_query_string(f"/app/v3/api/iam/organizations", query))

class IamOrganizationsMembersApi:
    """iam iam.organizations.members API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, organization_id: str, page: Optional[int] = None, page_size: Optional[int] = None, cursor: Optional[str] = None, sort: Optional[str] = None, q: Optional[str] = None, role: Optional[str] = None) -> IamOrganizationMemberListResponse:
        """Organizations members list."""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'sort', 'value': sort, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'role', 'value': role, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/iam/organizations/{serialize_path_parameter(organization_id, {'name': 'organizationId', 'style': 'simple', 'explode': False})}/members", query))

class IamOrganizationsTreeApi:
    """iam iam.organizations.tree API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> SdkWorkResourceResponse:
        """Organizations tree retrieve."""
        return self._client.get(f"/app/v3/api/iam/organizations/tree")

class IamPersonaCatalogApi:
    """iam iam.persona_catalog API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> IamPersonaCatalogResponse:
        """Persona Catalog retrieve."""
        return self._client.get(f"/app/v3/api/iam/persona_catalog")

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
        return self._client.get(_append_query_string(f"/app/v3/api/iam/position_assignments", query))

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
        return self._client.get(_append_query_string(f"/app/v3/api/iam/positions", query))

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
            {'name': 'role_id', 'value': role_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'principal_kind', 'value': principal_kind, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'principal_id', 'value': principal_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'scope_kind', 'value': scope_kind, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'scope_id', 'value': scope_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/iam/role_bindings", query))

class IamUsersApi:
    """iam iam.users API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.current = IamUsersCurrentApi(client)


class IamUsersCurrentApi:
    """iam iam.users.current API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.email_bindings = IamUsersCurrentEmailBindingsApi(client)
        self.password = IamUsersCurrentPasswordApi(client)
        self.persona = IamUsersCurrentPersonaApi(client)
        self.phone_bindings = IamUsersCurrentPhoneBindingsApi(client)


    def retrieve(self) -> SdkWorkResourceResponse:
        """Users current retrieve."""
        return self._client.get(f"/app/v3/api/iam/users/current")

    def update(self, body: Optional[Dict[str, Any]] = None) -> SdkWorkResourceResponse:
        """Users current update."""
        return self._client.patch(f"/app/v3/api/iam/users/current", json=body)

class IamUsersCurrentEmailBindingsApi:
    """iam iam.users.current.email_bindings API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def delete(self) -> None:
        """Users current email Bindings delete."""
        return self._client.delete(f"/app/v3/api/iam/users/current/email_bindings")

    def create(self, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Users current email Bindings create."""
        return self._client.post(f"/app/v3/api/iam/users/current/email_bindings", json=body)

class IamUsersCurrentPasswordApi:
    """iam iam.users.current.password API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def update(self, body: Optional[Dict[str, Any]] = None) -> SdkWorkResourceResponse:
        """Users current password update."""
        return self._client.patch(f"/app/v3/api/iam/users/current/password", json=body)

class IamUsersCurrentPersonaApi:
    """iam iam.users.current.persona API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def delete(self) -> None:
        """Users current persona delete."""
        return self._client.delete(f"/app/v3/api/iam/users/current/persona")

    def retrieve(self) -> IamUserPersonaResponse:
        """Users current persona retrieve."""
        return self._client.get(f"/app/v3/api/iam/users/current/persona")

    def update(self, body: IamUserPersonaUpdateCommand) -> IamUserPersonaResponse:
        """Users current persona update."""
        return self._client.put(f"/app/v3/api/iam/users/current/persona", json=body)

class IamUsersCurrentPhoneBindingsApi:
    """iam iam.users.current.phone_bindings API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def delete(self) -> None:
        """Users current phone Bindings delete."""
        return self._client.delete(f"/app/v3/api/iam/users/current/phone_bindings")

    def create(self, body: Dict[str, Any]) -> SdkWorkResourceResponse:
        """Users current phone Bindings create."""
        return self._client.post(f"/app/v3/api/iam/users/current/phone_bindings", json=body)
