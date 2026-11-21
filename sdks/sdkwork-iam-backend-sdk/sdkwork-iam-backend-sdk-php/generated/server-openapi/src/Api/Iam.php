<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\BackendSdk\Api;

use SDKWork\\Iam\\BackendSdk\Models\AppbaseAccessCredentialCreateCommand;
use SDKWork\\Iam\\BackendSdk\Models\AppbaseInstallationEnableCommand;
use SDKWork\\Iam\\BackendSdk\Models\AppbaseInstallationProvisionCommand;
use SDKWork\\Iam\\BackendSdk\Models\AppbaseInstallationUpdateCommand;
use SDKWork\\Iam\\BackendSdk\Models\IamInstallationCredentialCreateCommand;
use SDKWork\\Iam\\BackendSdk\Models\IamInstallationCredentialListResponse;
use SDKWork\\Iam\\BackendSdk\Models\IamInstallationCredentialResponse;
use SDKWork\\Iam\\BackendSdk\Models\IamInstallationCredentialRotateCommand;
use SDKWork\\Iam\\BackendSdk\Models\IamInstallationEnvironmentListResponse;
use SDKWork\\Iam\\BackendSdk\Models\IamInstallationEnvironmentResponse;
use SDKWork\\Iam\\BackendSdk\Models\IamInstallationEnvironmentUpsertCommand;
use SDKWork\\Iam\\BackendSdk\Models\IamInstallationManagementProvisionCommand;
use SDKWork\\Iam\\BackendSdk\Models\IamInstallationManagementUpdateCommand;
use SDKWork\\Iam\\BackendSdk\Models\IamInstallationStatusCommand;
use SDKWork\\Iam\\BackendSdk\Models\SdkWorkCommandResponse;
use SDKWork\\Iam\\BackendSdk\Models\SdkWorkListResponse;
use SDKWork\\Iam\\BackendSdk\Models\SdkWorkResourceResponse;
use SDKWork\\Iam\\BackendSdk\Models\ServiceAccountCredentialCreateCommand;
use SDKWork\\Iam\\BackendSdk\Models\ServiceAccountCredentialRevokeCommand;
use SDKWork\\Iam\\BackendSdk\Models\ServiceAccountTokenExchangeCommand;

final class IamApi extends BaseApi
{
    /** Access Credentials create. */
    public function accessCredentialsCreate(array|AppbaseAccessCredentialCreateCommand $body): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/access_credentials';
        $payload = $body instanceof AppbaseAccessCredentialCreateCommand ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'skipAuth' => true,
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Account Binding Policy retrieve. */
    public function accountBindingPolicyRetrieve(): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/account_binding_policy';
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Account Binding Policy update. */
    public function accountBindingPolicyUpdate(?array $body = null): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/account_binding_policy';
        $payload = $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Api Keys list. */
    public function apiKeysList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/backend/v3/api/iam/api_keys';
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

    /** Api Keys create. */
    public function apiKeysCreate(array $body): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/api_keys';
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Api Keys revoke. */
    public function apiKeysRevoke(string $apiKeyId, array $body): ?SdkWorkCommandResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/api_keys/{apiKeyId}/revoke', ['apiKeyId' => $this->serializePathParameter($apiKeyId, new PathParameterSpec('apiKeyId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkCommandResponse::fromArray($result) : null;
    }

    /** Api Keys rotate. */
    public function apiKeysRotate(string $apiKeyId, array $body): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/api_keys/{apiKeyId}/rotate', ['apiKeyId' => $this->serializePathParameter($apiKeyId, new PathParameterSpec('apiKeyId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Audit Events list. */
    public function auditEventsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/backend/v3/api/iam/audit_events';
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

    /** Audit Events retrieve. */
    public function auditEventsRetrieve(string $auditEventId): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/audit_events/{auditEventId}', ['auditEventId' => $this->serializePathParameter($auditEventId, new PathParameterSpec('auditEventId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Department Assignments list. */
    public function departmentAssignmentsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/backend/v3/api/iam/department_assignments';
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

    /** Department Assignments create. */
    public function departmentAssignmentsCreate(array $body): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/department_assignments';
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Department Assignments update. */
    public function departmentAssignmentsUpdate(string $assignmentId, ?array $body = null): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/department_assignments/{assignmentId}', ['assignmentId' => $this->serializePathParameter($assignmentId, new PathParameterSpec('assignmentId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Departments list. */
    public function departmentsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/backend/v3/api/iam/departments';
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

    /** Departments create. */
    public function departmentsCreate(array $body): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/departments';
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Departments delete. */
    public function departmentsDelete(string $departmentId): mixed
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/departments/{departmentId}', ['departmentId' => $this->serializePathParameter($departmentId, new PathParameterSpec('departmentId', 'simple', false))]);
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Departments retrieve. */
    public function departmentsRetrieve(string $departmentId): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/departments/{departmentId}', ['departmentId' => $this->serializePathParameter($departmentId, new PathParameterSpec('departmentId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Departments update. */
    public function departmentsUpdate(string $departmentId, ?array $body = null): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/departments/{departmentId}', ['departmentId' => $this->serializePathParameter($departmentId, new PathParameterSpec('departmentId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Departments tree retrieve. */
    public function departmentsTreeRetrieve(): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/departments/tree';
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Groups list. */
    public function groupsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/backend/v3/api/iam/groups';
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

    /** Groups create. */
    public function groupsCreate(array $body): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/groups';
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Groups delete. */
    public function groupsDelete(string $groupId): mixed
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/groups/{groupId}', ['groupId' => $this->serializePathParameter($groupId, new PathParameterSpec('groupId', 'simple', false))]);
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Groups retrieve. */
    public function groupsRetrieve(string $groupId): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/groups/{groupId}', ['groupId' => $this->serializePathParameter($groupId, new PathParameterSpec('groupId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Groups update. */
    public function groupsUpdate(string $groupId, ?array $body = null): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/groups/{groupId}', ['groupId' => $this->serializePathParameter($groupId, new PathParameterSpec('groupId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Groups members list. */
    public function groupsMembersList(string $groupId, ?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/groups/{groupId}/members', ['groupId' => $this->serializePathParameter($groupId, new PathParameterSpec('groupId', 'simple', false))]);
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

    /** Groups members create. */
    public function groupsMembersCreate(string $groupId, array $body): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/groups/{groupId}/members', ['groupId' => $this->serializePathParameter($groupId, new PathParameterSpec('groupId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Groups members delete. */
    public function groupsMembersDelete(string $groupId, string $memberId): mixed
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/groups/{groupId}/members/{memberId}', ['groupId' => $this->serializePathParameter($groupId, new PathParameterSpec('groupId', 'simple', false)), 'memberId' => $this->serializePathParameter($memberId, new PathParameterSpec('memberId', 'simple', false))]);
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Installations create. */
    public function installationsCreate(array|AppbaseInstallationProvisionCommand $body): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/installations';
        $payload = $body instanceof AppbaseInstallationProvisionCommand ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'skipAuth' => true,
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Installations retrieve. */
    public function installationsRetrieve(string $installationId): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/installations/{installationId}', ['installationId' => $this->serializePathParameter($installationId, new PathParameterSpec('installationId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Installations update. */
    public function installationsUpdate(string $installationId, array|AppbaseInstallationUpdateCommand|null $body = null): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/installations/{installationId}', ['installationId' => $this->serializePathParameter($installationId, new PathParameterSpec('installationId', 'simple', false))]);
        $payload = $body instanceof AppbaseInstallationUpdateCommand ? $body->toArray() : $body;
        $result = $this->client->request('PATCH', $path, [
            'skipAuth' => true,
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Installations enable. */
    public function installationsEnable(string $installationId, array|AppbaseInstallationEnableCommand $body): ?SdkWorkCommandResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/installations/{installationId}/enable', ['installationId' => $this->serializePathParameter($installationId, new PathParameterSpec('installationId', 'simple', false))]);
        $payload = $body instanceof AppbaseInstallationEnableCommand ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'skipAuth' => true,
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkCommandResponse::fromArray($result) : null;
    }

    /** Installations management by Deploy Application disable. */
    public function installationsManagementByDeployApplicationDisable(string $deployApplicationId, array $body): ?SdkWorkCommandResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/installations/by_deploy_application/{deployApplicationId}/disable', ['deployApplicationId' => $this->serializePathParameter($deployApplicationId, new PathParameterSpec('deployApplicationId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'skipAuth' => true,
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkCommandResponse::fromArray($result) : null;
    }

    /** Organization Memberships list. */
    public function organizationMembershipsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/backend/v3/api/iam/organization_memberships';
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

    /** Organization Memberships create. */
    public function organizationMembershipsCreate(array $body): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/organization_memberships';
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Organization Memberships update. */
    public function organizationMembershipsUpdate(string $membershipId, ?array $body = null): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/organization_memberships/{membershipId}', ['membershipId' => $this->serializePathParameter($membershipId, new PathParameterSpec('membershipId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Organizations list. */
    public function organizationsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/backend/v3/api/iam/organizations';
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

    /** Organizations create. */
    public function organizationsCreate(array $body): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/organizations';
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Organizations delete. */
    public function organizationsDelete(string $organizationId): mixed
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/organizations/{organizationId}', ['organizationId' => $this->serializePathParameter($organizationId, new PathParameterSpec('organizationId', 'simple', false))]);
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Organizations retrieve. */
    public function organizationsRetrieve(string $organizationId): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/organizations/{organizationId}', ['organizationId' => $this->serializePathParameter($organizationId, new PathParameterSpec('organizationId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Organizations update. */
    public function organizationsUpdate(string $organizationId, ?array $body = null): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/organizations/{organizationId}', ['organizationId' => $this->serializePathParameter($organizationId, new PathParameterSpec('organizationId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Organizations tree retrieve. */
    public function organizationsTreeRetrieve(): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/organizations/tree';
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Permissions list. */
    public function permissionsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/backend/v3/api/iam/permissions';
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

    /** Permissions create. */
    public function permissionsCreate(array $body): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/permissions';
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Permissions delete. */
    public function permissionsDelete(string $permissionId): mixed
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/permissions/{permissionId}', ['permissionId' => $this->serializePathParameter($permissionId, new PathParameterSpec('permissionId', 'simple', false))]);
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Permissions retrieve. */
    public function permissionsRetrieve(string $permissionId): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/permissions/{permissionId}', ['permissionId' => $this->serializePathParameter($permissionId, new PathParameterSpec('permissionId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Permissions update. */
    public function permissionsUpdate(string $permissionId, ?array $body = null): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/permissions/{permissionId}', ['permissionId' => $this->serializePathParameter($permissionId, new PathParameterSpec('permissionId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Policies list. */
    public function policiesList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/backend/v3/api/iam/policies';
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

    /** Policies create. */
    public function policiesCreate(array $body): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/policies';
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Policies delete. */
    public function policiesDelete(string $policyId): mixed
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/policies/{policyId}', ['policyId' => $this->serializePathParameter($policyId, new PathParameterSpec('policyId', 'simple', false))]);
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Policies retrieve. */
    public function policiesRetrieve(string $policyId): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/policies/{policyId}', ['policyId' => $this->serializePathParameter($policyId, new PathParameterSpec('policyId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Policies update. */
    public function policiesUpdate(string $policyId, ?array $body = null): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/policies/{policyId}', ['policyId' => $this->serializePathParameter($policyId, new PathParameterSpec('policyId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Position Assignments list. */
    public function positionAssignmentsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/backend/v3/api/iam/position_assignments';
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

    /** Position Assignments create. */
    public function positionAssignmentsCreate(array $body): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/position_assignments';
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Position Assignments update. */
    public function positionAssignmentsUpdate(string $assignmentId, ?array $body = null): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/position_assignments/{assignmentId}', ['assignmentId' => $this->serializePathParameter($assignmentId, new PathParameterSpec('assignmentId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Positions list. */
    public function positionsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/backend/v3/api/iam/positions';
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

    /** Positions create. */
    public function positionsCreate(array $body): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/positions';
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Positions delete. */
    public function positionsDelete(string $positionId): mixed
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/positions/{positionId}', ['positionId' => $this->serializePathParameter($positionId, new PathParameterSpec('positionId', 'simple', false))]);
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Positions update. */
    public function positionsUpdate(string $positionId, ?array $body = null): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/positions/{positionId}', ['positionId' => $this->serializePathParameter($positionId, new PathParameterSpec('positionId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Provider Accounts list. */
    public function providerAccountsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null, ?string $vendorCode = null, ?string $scopeType = null, ?string $ownerUserId = null, ?string $organizationId = null, ?string $status = null, ?bool $mine = null, ?bool $includePlatform = null): ?SdkWorkListResponse
    {
        $path = '/backend/v3/api/iam/provider_accounts';
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('cursor', $cursor, 'form', true, false, null),
            new QueryParameterSpec('sort', $sort, 'form', true, false, null),
            new QueryParameterSpec('q', $q, 'form', true, false, null),
            new QueryParameterSpec('vendor_code', $vendorCode, 'form', true, false, null),
            new QueryParameterSpec('scope_type', $scopeType, 'form', true, false, null),
            new QueryParameterSpec('owner_user_id', $ownerUserId, 'form', true, false, null),
            new QueryParameterSpec('organization_id', $organizationId, 'form', true, false, null),
            new QueryParameterSpec('status', $status, 'form', true, false, null),
            new QueryParameterSpec('mine', $mine, 'form', true, false, null),
            new QueryParameterSpec('include_platform', $includePlatform, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkListResponse::fromArray($result) : null;
    }

    /** Provider Accounts create. */
    public function providerAccountsCreate(array $body): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/provider_accounts';
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Provider Accounts delete. */
    public function providerAccountsDelete(string $providerAccountId): mixed
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/provider_accounts/{providerAccountId}', ['providerAccountId' => $this->serializePathParameter($providerAccountId, new PathParameterSpec('providerAccountId', 'simple', false))]);
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Provider Accounts retrieve. */
    public function providerAccountsRetrieve(string $providerAccountId): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/provider_accounts/{providerAccountId}', ['providerAccountId' => $this->serializePathParameter($providerAccountId, new PathParameterSpec('providerAccountId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Provider Accounts update. */
    public function providerAccountsUpdate(string $providerAccountId, ?array $body = null): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/provider_accounts/{providerAccountId}', ['providerAccountId' => $this->serializePathParameter($providerAccountId, new PathParameterSpec('providerAccountId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Provider Accounts credentials list. */
    public function providerAccountsCredentialsList(string $providerAccountId, ?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/provider_accounts/{providerAccountId}/credentials', ['providerAccountId' => $this->serializePathParameter($providerAccountId, new PathParameterSpec('providerAccountId', 'simple', false))]);
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

    /** Provider Accounts credentials create. */
    public function providerAccountsCredentialsCreate(string $providerAccountId, array $body): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/provider_accounts/{providerAccountId}/credentials', ['providerAccountId' => $this->serializePathParameter($providerAccountId, new PathParameterSpec('providerAccountId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Provider Accounts credentials reveal retrieve. */
    public function providerAccountsCredentialsRevealRetrieve(string $providerAccountId): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/provider_accounts/{providerAccountId}/credentials/reveal', ['providerAccountId' => $this->serializePathParameter($providerAccountId, new PathParameterSpec('providerAccountId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Provider Accounts default. */
    public function providerAccountsDefault(string $providerAccountId, array $body): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/provider_accounts/{providerAccountId}/default', ['providerAccountId' => $this->serializePathParameter($providerAccountId, new PathParameterSpec('providerAccountId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Provider Accounts resolve retrieve. */
    public function providerAccountsResolveRetrieve(): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/provider_accounts/resolve';
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Provider Credentials revoke. */
    public function providerCredentialsRevoke(string $credentialId, array $body): ?SdkWorkCommandResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/provider_credentials/{credentialId}/revoke', ['credentialId' => $this->serializePathParameter($credentialId, new PathParameterSpec('credentialId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkCommandResponse::fromArray($result) : null;
    }

    /** Role Bindings list. */
    public function roleBindingsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null, ?string $roleId = null, ?string $principalKind = null, ?string $principalId = null, ?string $scopeKind = null, ?string $scopeId = null): ?SdkWorkListResponse
    {
        $path = '/backend/v3/api/iam/role_bindings';
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

    /** Role Bindings create. */
    public function roleBindingsCreate(array $body): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/role_bindings';
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Role Bindings delete. */
    public function roleBindingsDelete(string $roleBindingId): mixed
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/role_bindings/{roleBindingId}', ['roleBindingId' => $this->serializePathParameter($roleBindingId, new PathParameterSpec('roleBindingId', 'simple', false))]);
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Roles list. */
    public function rolesList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/backend/v3/api/iam/roles';
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

    /** Roles create. */
    public function rolesCreate(array $body): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/roles';
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Roles delete. */
    public function rolesDelete(string $roleId): mixed
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/roles/{roleId}', ['roleId' => $this->serializePathParameter($roleId, new PathParameterSpec('roleId', 'simple', false))]);
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Roles retrieve. */
    public function rolesRetrieve(string $roleId): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/roles/{roleId}', ['roleId' => $this->serializePathParameter($roleId, new PathParameterSpec('roleId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Roles update. */
    public function rolesUpdate(string $roleId, ?array $body = null): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/roles/{roleId}', ['roleId' => $this->serializePathParameter($roleId, new PathParameterSpec('roleId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Roles permissions list. */
    public function rolesPermissionsList(string $roleId, ?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/roles/{roleId}/permissions', ['roleId' => $this->serializePathParameter($roleId, new PathParameterSpec('roleId', 'simple', false))]);
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

    /** Roles permissions create. */
    public function rolesPermissionsCreate(string $roleId, array $body): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/roles/{roleId}/permissions', ['roleId' => $this->serializePathParameter($roleId, new PathParameterSpec('roleId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Roles permissions delete. */
    public function rolesPermissionsDelete(string $roleId, string $permissionId): mixed
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/roles/{roleId}/permissions/{permissionId}', ['roleId' => $this->serializePathParameter($roleId, new PathParameterSpec('roleId', 'simple', false)), 'permissionId' => $this->serializePathParameter($permissionId, new PathParameterSpec('permissionId', 'simple', false))]);
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Security Events list. */
    public function securityEventsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/backend/v3/api/iam/security_events';
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

    /** Security Events retrieve. */
    public function securityEventsRetrieve(string $securityEventId): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/security_events/{securityEventId}', ['securityEventId' => $this->serializePathParameter($securityEventId, new PathParameterSpec('securityEventId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Service Account Credentials revoke. */
    public function serviceAccountCredentialsRevoke(string $credentialId, array|ServiceAccountCredentialRevokeCommand $body): ?SdkWorkCommandResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/service_account_credentials/{credentialId}/revoke', ['credentialId' => $this->serializePathParameter($credentialId, new PathParameterSpec('credentialId', 'simple', false))]);
        $payload = $body instanceof ServiceAccountCredentialRevokeCommand ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkCommandResponse::fromArray($result) : null;
    }

    /** Service Account Tokens create. */
    public function serviceAccountTokensCreate(array|ServiceAccountTokenExchangeCommand $body): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/service_account_tokens';
        $payload = $body instanceof ServiceAccountTokenExchangeCommand ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'skipAuth' => true,
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Service Accounts list. */
    public function serviceAccountsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/backend/v3/api/iam/service_accounts';
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

    /** Service Accounts create. */
    public function serviceAccountsCreate(array $body): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/service_accounts';
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Service Accounts delete. */
    public function serviceAccountsDelete(string $serviceAccountId): mixed
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/service_accounts/{serviceAccountId}', ['serviceAccountId' => $this->serializePathParameter($serviceAccountId, new PathParameterSpec('serviceAccountId', 'simple', false))]);
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Service Accounts retrieve. */
    public function serviceAccountsRetrieve(string $serviceAccountId): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/service_accounts/{serviceAccountId}', ['serviceAccountId' => $this->serializePathParameter($serviceAccountId, new PathParameterSpec('serviceAccountId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Service Accounts update. */
    public function serviceAccountsUpdate(string $serviceAccountId, ?array $body = null): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/service_accounts/{serviceAccountId}', ['serviceAccountId' => $this->serializePathParameter($serviceAccountId, new PathParameterSpec('serviceAccountId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Service Accounts credentials create. */
    public function serviceAccountsCredentialsCreate(string $serviceAccountId, array|ServiceAccountCredentialCreateCommand $body): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/service_accounts/{serviceAccountId}/credentials', ['serviceAccountId' => $this->serializePathParameter($serviceAccountId, new PathParameterSpec('serviceAccountId', 'simple', false))]);
        $payload = $body instanceof ServiceAccountCredentialCreateCommand ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Tenants list. */
    public function tenantsList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = '/backend/v3/api/iam/tenants';
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

    /** Tenants create. */
    public function tenantsCreate(array $body): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/tenants';
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Tenants delete. */
    public function tenantsDelete(string $tenantId): mixed
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false))]);
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Tenants retrieve. */
    public function tenantsRetrieve(string $tenantId): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Tenants update. */
    public function tenantsUpdate(string $tenantId, ?array $body = null): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Installations list. */
    public function installationsList(string $tenantId, ?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null, ?string $status = null, ?string $environment = null, ?string $applicationType = null): ?SdkWorkListResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}/installations', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false))]);
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('cursor', $cursor, 'form', true, false, null),
            new QueryParameterSpec('sort', $sort, 'form', true, false, null),
            new QueryParameterSpec('q', $q, 'form', true, false, null),
            new QueryParameterSpec('status', $status, 'form', true, false, null),
            new QueryParameterSpec('environment', $environment, 'form', true, false, null),
            new QueryParameterSpec('application_type', $applicationType, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkListResponse::fromArray($result) : null;
    }

    /** Installations management create. */
    public function installationsManagementCreate(string $tenantId, array|IamInstallationManagementProvisionCommand $body): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}/installations', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false))]);
        $payload = $body instanceof IamInstallationManagementProvisionCommand ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Installations management update. */
    public function installationsManagementUpdate(string $tenantId, string $installationId, array|IamInstallationManagementUpdateCommand|null $body = null): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false)), 'installationId' => $this->serializePathParameter($installationId, new PathParameterSpec('installationId', 'simple', false))]);
        $payload = $body instanceof IamInstallationManagementUpdateCommand ? $body->toArray() : $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Installations credentials list. */
    public function installationsCredentialsList(string $tenantId, string $installationId, ?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?IamInstallationCredentialListResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/credentials', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false)), 'installationId' => $this->serializePathParameter($installationId, new PathParameterSpec('installationId', 'simple', false))]);
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('cursor', $cursor, 'form', true, false, null),
            new QueryParameterSpec('sort', $sort, 'form', true, false, null),
            new QueryParameterSpec('q', $q, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? IamInstallationCredentialListResponse::fromArray($result) : null;
    }

    /** Installations credentials create. */
    public function installationsCredentialsCreate(string $tenantId, string $installationId, array|IamInstallationCredentialCreateCommand $body): ?IamInstallationCredentialResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/credentials', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false)), 'installationId' => $this->serializePathParameter($installationId, new PathParameterSpec('installationId', 'simple', false))]);
        $payload = $body instanceof IamInstallationCredentialCreateCommand ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? IamInstallationCredentialResponse::fromArray($result) : null;
    }

    /** Installations credentials revoke. */
    public function installationsCredentialsRevoke(string $tenantId, string $installationId, string $credentialId, array $body): ?SdkWorkCommandResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/credentials/{credentialId}/revoke', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false)), 'installationId' => $this->serializePathParameter($installationId, new PathParameterSpec('installationId', 'simple', false)), 'credentialId' => $this->serializePathParameter($credentialId, new PathParameterSpec('credentialId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkCommandResponse::fromArray($result) : null;
    }

    /** Installations credentials rotate. */
    public function installationsCredentialsRotate(string $tenantId, string $installationId, string $credentialId, array|IamInstallationCredentialRotateCommand $body): ?IamInstallationCredentialResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/credentials/{credentialId}/rotate', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false)), 'installationId' => $this->serializePathParameter($installationId, new PathParameterSpec('installationId', 'simple', false)), 'credentialId' => $this->serializePathParameter($credentialId, new PathParameterSpec('credentialId', 'simple', false))]);
        $payload = $body instanceof IamInstallationCredentialRotateCommand ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? IamInstallationCredentialResponse::fromArray($result) : null;
    }

    /** Installations management disable. */
    public function installationsManagementDisable(string $tenantId, string $installationId, array|IamInstallationStatusCommand $body): ?SdkWorkCommandResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/disable', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false)), 'installationId' => $this->serializePathParameter($installationId, new PathParameterSpec('installationId', 'simple', false))]);
        $payload = $body instanceof IamInstallationStatusCommand ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkCommandResponse::fromArray($result) : null;
    }

    /** Installations management enable. */
    public function installationsManagementEnable(string $tenantId, string $installationId, array|IamInstallationStatusCommand $body): ?SdkWorkCommandResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/enable', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false)), 'installationId' => $this->serializePathParameter($installationId, new PathParameterSpec('installationId', 'simple', false))]);
        $payload = $body instanceof IamInstallationStatusCommand ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkCommandResponse::fromArray($result) : null;
    }

    /** Installations environments list. */
    public function installationsEnvironmentsList(string $tenantId, string $installationId, ?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?IamInstallationEnvironmentListResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/environments', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false)), 'installationId' => $this->serializePathParameter($installationId, new PathParameterSpec('installationId', 'simple', false))]);
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('cursor', $cursor, 'form', true, false, null),
            new QueryParameterSpec('sort', $sort, 'form', true, false, null),
            new QueryParameterSpec('q', $q, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? IamInstallationEnvironmentListResponse::fromArray($result) : null;
    }

    /** Installations environments delete. */
    public function installationsEnvironmentsDelete(string $tenantId, string $installationId, string $environmentKey): mixed
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/environments/{environmentKey}', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false)), 'installationId' => $this->serializePathParameter($installationId, new PathParameterSpec('installationId', 'simple', false)), 'environmentKey' => $this->serializePathParameter($environmentKey, new PathParameterSpec('environmentKey', 'simple', false))]);
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Installations environments update. */
    public function installationsEnvironmentsUpdate(string $tenantId, string $installationId, string $environmentKey, array|IamInstallationEnvironmentUpsertCommand $body): ?IamInstallationEnvironmentResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/environments/{environmentKey}', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false)), 'installationId' => $this->serializePathParameter($installationId, new PathParameterSpec('installationId', 'simple', false)), 'environmentKey' => $this->serializePathParameter($environmentKey, new PathParameterSpec('environmentKey', 'simple', false))]);
        $payload = $body instanceof IamInstallationEnvironmentUpsertCommand ? $body->toArray() : $body;
        $result = $this->client->request('PUT', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? IamInstallationEnvironmentResponse::fromArray($result) : null;
    }

    /** Installations summary retrieve. */
    public function installationsSummaryRetrieve(string $tenantId): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}/installations/summary', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Tenants members list. */
    public function tenantsMembersList(string $tenantId, ?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null): ?SdkWorkListResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}/members', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false))]);
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

    /** Tenants members create. */
    public function tenantsMembersCreate(string $tenantId, array $body): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}/members', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Tenants members delete. */
    public function tenantsMembersDelete(string $tenantId, string $userId): mixed
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}/members/{userId}', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false)), 'userId' => $this->serializePathParameter($userId, new PathParameterSpec('userId', 'simple', false))]);
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Tenants members update. */
    public function tenantsMembersUpdate(string $tenantId, string $userId, ?array $body = null): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/tenants/{tenantId}/members/{userId}', ['tenantId' => $this->serializePathParameter($tenantId, new PathParameterSpec('tenantId', 'simple', false)), 'userId' => $this->serializePathParameter($userId, new PathParameterSpec('userId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Users list. */
    public function usersList(?int $page = null, ?int $pageSize = null, ?string $cursor = null, ?string $sort = null, ?string $q = null, ?string $status = null): ?SdkWorkListResponse
    {
        $path = '/backend/v3/api/iam/users';
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('cursor', $cursor, 'form', true, false, null),
            new QueryParameterSpec('sort', $sort, 'form', true, false, null),
            new QueryParameterSpec('q', $q, 'form', true, false, null),
            new QueryParameterSpec('status', $status, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkListResponse::fromArray($result) : null;
    }

    /** Users create. */
    public function usersCreate(array $body): ?SdkWorkResourceResponse
    {
        $path = '/backend/v3/api/iam/users';
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Users delete. */
    public function usersDelete(string $userId): mixed
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/users/{userId}', ['userId' => $this->serializePathParameter($userId, new PathParameterSpec('userId', 'simple', false))]);
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** Users retrieve. */
    public function usersRetrieve(string $userId): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/users/{userId}', ['userId' => $this->serializePathParameter($userId, new PathParameterSpec('userId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Users update. */
    public function usersUpdate(string $userId, ?array $body = null): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/users/{userId}', ['userId' => $this->serializePathParameter($userId, new PathParameterSpec('userId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('PATCH', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Users ban. */
    public function usersBan(string $userId, array $body): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/users/{userId}/ban', ['userId' => $this->serializePathParameter($userId, new PathParameterSpec('userId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

    /** Users unban. */
    public function usersUnban(string $userId, array $body): ?SdkWorkResourceResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/iam/users/{userId}/unban', ['userId' => $this->serializePathParameter($userId, new PathParameterSpec('userId', 'simple', false))]);
        $payload = $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SdkWorkResourceResponse::fromArray($result) : null;
    }

}
