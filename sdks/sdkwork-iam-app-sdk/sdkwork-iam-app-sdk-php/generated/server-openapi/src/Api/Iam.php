<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\AppSdk\Api;

use SDKWork\\Iam\\AppSdk\Models\IamAppAccessTokenCreateCommand;
use SDKWork\\Iam\\AppSdk\Models\IamAppAccessTokenResponse;
use SDKWork\\Iam\\AppSdk\Models\IamOrganizationMemberListResponse;
use SDKWork\\Iam\\AppSdk\Models\IamPersonaCatalogResponse;
use SDKWork\\Iam\\AppSdk\Models\IamUserPersonaResponse;
use SDKWork\\Iam\\AppSdk\Models\IamUserPersonaUpdateCommand;
use SDKWork\\Iam\\AppSdk\Models\SdkWorkListResponse;
use SDKWork\\Iam\\AppSdk\Models\SdkWorkResourceResponse;

final class IamApi extends BaseApi
{
    /** App Access Tokens create. */
    public function appAccessTokensCreate(array|IamAppAccessTokenCreateCommand $body): ?IamAppAccessTokenResponse
    {
        $path = '/app/v3/api/iam/app_access_tokens';
        $payload = $body instanceof IamAppAccessTokenCreateCommand ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? IamAppAccessTokenResponse::fromArray($result) : null;
    }

    /** Department Assignments list. */
    public function departmentAssignmentsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/app/v3/api/iam/department_assignments';
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('cursor', $cursor, 'form', true, false, null),
            new QueryParameterSpec('sort', $sort, 'form', true, false, null),
            new QueryParameterSpec('q', $q, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkListResponse::fromArray($result) : null;
    }

    /** Departments list. */
    public function departmentsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/app/v3/api/iam/departments';
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('cursor', $cursor, 'form', true, false, null),
            new QueryParameterSpec('sort', $sort, 'form', true, false, null),
            new QueryParameterSpec('q', $q, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkListResponse::fromArray($result) : null;
    }

    /** Departments tree retrieve. */
    public function departmentsTreeRetrieve(): ?SdkWorkResourceResponse
    {
        $path = '/app/v3/api/iam/departments/tree';
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Oauth official Account Settings retrieve. */
    public function oauthOfficialAccountSettingsRetrieve(): ?SdkWorkResourceResponse
    {
        $path = '/app/v3/api/iam/oauth/official_account_settings';
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Oauth official Accounts list. */
    public function oauthOfficialAccountsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/app/v3/api/iam/oauth/official_accounts';
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('cursor', $cursor, 'form', true, false, null),
            new QueryParameterSpec('sort', $sort, 'form', true, false, null),
            new QueryParameterSpec('q', $q, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkListResponse::fromArray($result) : null;
    }

    /** Oauth official Accounts create. */
    public function oauthOfficialAccountsCreate(array $body): ?SdkWorkResourceResponse
    {
        $path = '/app/v3/api/iam/oauth/official_accounts';
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Oauth official Accounts delete. */
    public function oauthOfficialAccountsDelete(string $officialAccountId): mixed
    {
        $path = $this->interpolatePath('/app/v3/api/iam/oauth/official_accounts/{officialAccountId}', ['officialAccountId' => $this->serializePathParameter($officialAccountId, new PathParameterSpec('officialAccountId', 'simple', false))]);
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Oauth official Accounts retrieve. */
    public function oauthOfficialAccountsRetrieve(string $officialAccountId): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/app/v3/api/iam/oauth/official_accounts/{officialAccountId}', ['officialAccountId' => $this->serializePathParameter($officialAccountId, new PathParameterSpec('officialAccountId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Oauth official Accounts update. */
    public function oauthOfficialAccountsUpdate(string $officialAccountId, ?array $body = null): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/app/v3/api/iam/oauth/official_accounts/{officialAccountId}', ['officialAccountId' => $this->serializePathParameter($officialAccountId, new PathParameterSpec('officialAccountId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Oauth official Accounts custom Menus publish. */
    public function oauthOfficialAccountsCustomMenusPublish(string $officialAccountId, array $body): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/app/v3/api/iam/oauth/official_accounts/{officialAccountId}/custom_menus/publish', ['officialAccountId' => $this->serializePathParameter($officialAccountId, new PathParameterSpec('officialAccountId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Oauth official Accounts custom Menus rollback. */
    public function oauthOfficialAccountsCustomMenusRollback(string $officialAccountId, array $body): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/app/v3/api/iam/oauth/official_accounts/{officialAccountId}/custom_menus/rollback', ['officialAccountId' => $this->serializePathParameter($officialAccountId, new PathParameterSpec('officialAccountId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Oauth official Accounts custom Menus sync. */
    public function oauthOfficialAccountsCustomMenusSync(string $officialAccountId, array $body): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/app/v3/api/iam/oauth/official_accounts/{officialAccountId}/custom_menus/sync', ['officialAccountId' => $this->serializePathParameter($officialAccountId, new PathParameterSpec('officialAccountId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Organization Memberships list. */
    public function organizationMembershipsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/app/v3/api/iam/organization_memberships';
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('cursor', $cursor, 'form', true, false, null),
            new QueryParameterSpec('sort', $sort, 'form', true, false, null),
            new QueryParameterSpec('q', $q, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkListResponse::fromArray($result) : null;
    }

    /** Organizations list. */
    public function organizationsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/app/v3/api/iam/organizations';
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('cursor', $cursor, 'form', true, false, null),
            new QueryParameterSpec('sort', $sort, 'form', true, false, null),
            new QueryParameterSpec('q', $q, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkListResponse::fromArray($result) : null;
    }

    /** Organizations members list. */
    public function organizationsMembersList(string $organizationId, ?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null, ?string $role = null): ?IamOrganizationMemberListResponse
    {
        $path = $this->interpolatePath('/app/v3/api/iam/organizations/{organizationId}/members', ['organizationId' => $this->serializePathParameter($organizationId, new PathParameterSpec('organizationId', 'simple', false))]);
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('cursor', $cursor, 'form', true, false, null),
            new QueryParameterSpec('sort', $sort, 'form', true, false, null),
            new QueryParameterSpec('q', $q, 'form', true, false, null),
            new QueryParameterSpec('role', $role, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? IamOrganizationMemberListResponse::fromArray($result) : null;
    }

    /** Organizations tree retrieve. */
    public function organizationsTreeRetrieve(): ?SdkWorkResourceResponse
    {
        $path = '/app/v3/api/iam/organizations/tree';
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Persona Catalog retrieve. */
    public function personaCatalogRetrieve(): ?IamPersonaCatalogResponse
    {
        $path = '/app/v3/api/iam/persona_catalog';
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? IamPersonaCatalogResponse::fromArray($result) : null;
    }

    /** Position Assignments list. */
    public function positionAssignmentsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/app/v3/api/iam/position_assignments';
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('cursor', $cursor, 'form', true, false, null),
            new QueryParameterSpec('sort', $sort, 'form', true, false, null),
            new QueryParameterSpec('q', $q, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkListResponse::fromArray($result) : null;
    }

    /** Positions list. */
    public function positionsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/app/v3/api/iam/positions';
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('cursor', $cursor, 'form', true, false, null),
            new QueryParameterSpec('sort', $sort, 'form', true, false, null),
            new QueryParameterSpec('q', $q, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkListResponse::fromArray($result) : null;
    }

    /** Role Bindings list. */
    public function roleBindingsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null, ?string $roleId = null, ?string $principalKind = null, ?string $principalId = null, ?string $scopeKind = null, ?string $scopeId = null): ?SdkWorkListResponse
    {
        $path = '/app/v3/api/iam/role_bindings';
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('cursor', $cursor, 'form', true, false, null),
            new QueryParameterSpec('sort', $sort, 'form', true, false, null),
            new QueryParameterSpec('q', $q, 'form', true, false, null),
            new QueryParameterSpec('role_id', $roleId, 'form', true, false, null),
            new QueryParameterSpec('principal_kind', $principalKind, 'form', true, false, null),
            new QueryParameterSpec('principal_id', $principalId, 'form', true, false, null),
            new QueryParameterSpec('scope_kind', $scopeKind, 'form', true, false, null),
            new QueryParameterSpec('scope_id', $scopeId, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkListResponse::fromArray($result) : null;
    }

    /** Users current retrieve. */
    public function usersCurrentRetrieve(): ?SdkWorkResourceResponse
    {
        $path = '/app/v3/api/iam/users/current';
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Users current update. */
    public function usersCurrentUpdate(?array $body = null): ?SdkWorkResourceResponse
    {
        $path = '/app/v3/api/iam/users/current';
        $payload = $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Users current email Bindings delete. */
    public function usersCurrentEmailBindingsDelete(): mixed
    {
        $path = '/app/v3/api/iam/users/current/email_bindings';
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Users current email Bindings create. */
    public function usersCurrentEmailBindingsCreate(array $body): ?SdkWorkResourceResponse
    {
        $path = '/app/v3/api/iam/users/current/email_bindings';
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Users current password update. */
    public function usersCurrentPasswordUpdate(?array $body = null): ?SdkWorkResourceResponse
    {
        $path = '/app/v3/api/iam/users/current/password';
        $payload = $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Users current persona delete. */
    public function usersCurrentPersonaDelete(): mixed
    {
        $path = '/app/v3/api/iam/users/current/persona';
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Users current persona retrieve. */
    public function usersCurrentPersonaRetrieve(): ?IamUserPersonaResponse
    {
        $path = '/app/v3/api/iam/users/current/persona';
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? IamUserPersonaResponse::fromArray($result) : null;
    }

    /** Users current persona update. */
    public function usersCurrentPersonaUpdate(array|IamUserPersonaUpdateCommand $body): ?IamUserPersonaResponse
    {
        $path = '/app/v3/api/iam/users/current/persona';
        $payload = $body instanceof IamUserPersonaUpdateCommand ? $body->toArray() : $body;
        $result = $this->client->request('PUT', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? IamUserPersonaResponse::fromArray($result) : null;
    }

    /** Users current phone Bindings delete. */
    public function usersCurrentPhoneBindingsDelete(): mixed
    {
        $path = '/app/v3/api/iam/users/current/phone_bindings';
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Users current phone Bindings create. */
    public function usersCurrentPhoneBindingsCreate(array $body): ?SdkWorkResourceResponse
    {
        $path = '/app/v3/api/iam/users/current/phone_bindings';
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

}
