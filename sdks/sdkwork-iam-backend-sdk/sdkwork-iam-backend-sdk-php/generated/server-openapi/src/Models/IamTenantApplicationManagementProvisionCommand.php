<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\BackendSdk\Models;

/**
 * Provision a tenant installation from the deploy application it serves plus explicit attributes, through an authenticated operator workflow. Application templates are retired, so no template reference is accepted.
 */
final class IamTenantApplicationManagementProvisionCommand
{
    public ?string $organizationId = null;

    public ?string $instanceKey = null;

    public ?string $displayName = null;

    public ?string $environment = null;

    /** Product-semantic application type (api | h5 | pc | flutter | other). Required: application templates are retired, so nothing else can supply it. */
    public ?string $applicationType = null;

    public ?string $primaryDomain = null;

    /** Access permissions granted to the installation. An empty array or null is a valid explicit choice: the installation grants no API scope. */
    public array $accessPermissions = [];

    /** Explicit runtime config, including `oauth.relyingParty`; absent registers no OAuth relying party. */
    public array $runtimeConfig = [];

    /** Deploy application this installation serves. It is the identity every access token carries, and the one-to-one relation is enforced by the database. */
    public ?string $deployApplicationId = null;

    /** Release scope of the installation (`APPLICATION_IDENTITY_SPEC.md` section 4.1). TENANT is the default: the application serves the whole tenant and its isolation key is (tenantId, appId). ORGANIZATION serves one organization and requires a non-zero organizationId. USER serves one person and requires ownerUserId. The scope is immutable once provisioned; publishing at another level needs a new installation. */
    public ?string $ownershipScope = null;

    /** Owner of a USER-scoped installation. Required for ownershipScope USER and rejected for the other two levels. */
    public ?string $ownerUserId = null;

    /** Replay-safe key for the cross-module provisioning call. */
    public ?string $provisioningIdempotencyKey = null;

    public function __construct(array $data = [])
    {
        $this->organizationId = array_key_exists('organizationId', $data)
            ? $data['organizationId']
            : null;
        $this->instanceKey = array_key_exists('instanceKey', $data)
            ? $data['instanceKey']
            : null;
        $this->displayName = array_key_exists('displayName', $data)
            ? $data['displayName']
            : null;
        $this->environment = array_key_exists('environment', $data)
            ? $data['environment']
            : null;
        $this->applicationType = array_key_exists('applicationType', $data)
            ? $data['applicationType']
            : null;
        $this->primaryDomain = array_key_exists('primaryDomain', $data)
            ? $data['primaryDomain']
            : null;
        $this->accessPermissions = array_key_exists('accessPermissions', $data)
            ? is_array($data['accessPermissions'])
                ? array_values(array_map(static fn($item) => $item, $data['accessPermissions']))
                : []
            : [];
        $this->runtimeConfig = array_key_exists('runtimeConfig', $data)
            ? is_array($data['runtimeConfig']) ? $data['runtimeConfig'] : []
            : [];
        $this->deployApplicationId = array_key_exists('deployApplicationId', $data)
            ? $data['deployApplicationId']
            : null;
        $this->ownershipScope = array_key_exists('ownershipScope', $data)
            ? $data['ownershipScope']
            : null;
        $this->ownerUserId = array_key_exists('ownerUserId', $data)
            ? $data['ownerUserId']
            : null;
        $this->provisioningIdempotencyKey = array_key_exists('provisioningIdempotencyKey', $data)
            ? $data['provisioningIdempotencyKey']
            : null;
    }

    public static function fromArray(?array $data): ?self
    {
        return $data === null ? null : new self($data);
    }

    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'instanceKey' => $this->instanceKey,
            'displayName' => $this->displayName,
            'environment' => $this->environment,
            'applicationType' => $this->applicationType,
            'primaryDomain' => $this->primaryDomain,
            'accessPermissions' => array_values(array_map(static fn($item) => $item, $this->accessPermissions)),
            'runtimeConfig' => $this->runtimeConfig,
            'deployApplicationId' => $this->deployApplicationId,
            'ownershipScope' => $this->ownershipScope,
            'ownerUserId' => $this->ownerUserId,
            'provisioningIdempotencyKey' => $this->provisioningIdempotencyKey,
        ];
    }
}
