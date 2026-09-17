<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\BackendSdk\Models;

/**
 * Provision a registered application template for a tenant through an authenticated operator workflow.
 */
final class IamTenantApplicationManagementProvisionCommand
{
    public ?string $organizationId = null;

    public ?string $templateId = null;

    public ?string $appKey = null;

    public ?string $instanceKey = null;

    public ?string $displayName = null;

    public ?string $environment = null;

    /** Product-semantic application type (api | h5 | pc | flutter | other); defaults to a mapping of the template app_type. */
    public ?string $applicationType = null;

    public ?string $primaryDomain = null;

    public array $accessPermissions = [];

    public function __construct(array $data = [])
    {
        $this->organizationId = array_key_exists('organizationId', $data)
            ? $data['organizationId']
            : null;
        $this->templateId = array_key_exists('templateId', $data)
            ? $data['templateId']
            : null;
        $this->appKey = array_key_exists('appKey', $data)
            ? $data['appKey']
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
    }

    public static function fromArray(?array $data): ?self
    {
        return $data === null ? null : new self($data);
    }

    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'templateId' => $this->templateId,
            'appKey' => $this->appKey,
            'instanceKey' => $this->instanceKey,
            'displayName' => $this->displayName,
            'environment' => $this->environment,
            'applicationType' => $this->applicationType,
            'primaryDomain' => $this->primaryDomain,
            'accessPermissions' => array_values(array_map(static fn($item) => $item, $this->accessPermissions)),
        ];
    }
}
