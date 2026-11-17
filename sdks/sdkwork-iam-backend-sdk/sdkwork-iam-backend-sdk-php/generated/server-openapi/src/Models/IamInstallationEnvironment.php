<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\BackendSdk\Models;

/**
 * One lifecycle environment registered for an installation.
 */
final class IamInstallationEnvironment
{
    public ?string $environmentId = null;

    public ?string $tenantId = null;

    public ?string $organizationId = null;

    /** Installation (tenant application) id. */
    public ?string $installationId = null;

    /** Environment key, unique per installation. */
    public ?string $environmentKey = null;

    /** Public domain of this environment. Null when the environment has no domain; null is the only value allowed to repeat inside one tenant. */
    public ?string $primaryDomain = null;

    /** Environment-specific domain configuration document. */
    public array $domainConfig = [];

    public ?string $status = null;

    /** Creation timestamp. */
    public ?string $createdAt = null;

    /** Last write timestamp. */
    public ?string $updatedAt = null;

    public function __construct(array $data = [])
    {
        $this->environmentId = array_key_exists('environmentId', $data)
            ? $data['environmentId']
            : null;
        $this->tenantId = array_key_exists('tenantId', $data)
            ? $data['tenantId']
            : null;
        $this->organizationId = array_key_exists('organizationId', $data)
            ? $data['organizationId']
            : null;
        $this->installationId = array_key_exists('installationId', $data)
            ? $data['installationId']
            : null;
        $this->environmentKey = array_key_exists('environmentKey', $data)
            ? $data['environmentKey']
            : null;
        $this->primaryDomain = array_key_exists('primaryDomain', $data)
            ? $data['primaryDomain']
            : null;
        $this->domainConfig = array_key_exists('domainConfig', $data)
            ? is_array($data['domainConfig']) ? $data['domainConfig'] : []
            : [];
        $this->status = array_key_exists('status', $data)
            ? $data['status']
            : null;
        $this->createdAt = array_key_exists('createdAt', $data)
            ? $data['createdAt']
            : null;
        $this->updatedAt = array_key_exists('updatedAt', $data)
            ? $data['updatedAt']
            : null;
    }

    public static function fromArray(?array $data): ?self
    {
        return $data === null ? null : new self($data);
    }

    public function toArray(): array
    {
        return [
            'environmentId' => $this->environmentId,
            'tenantId' => $this->tenantId,
            'organizationId' => $this->organizationId,
            'installationId' => $this->installationId,
            'environmentKey' => $this->environmentKey,
            'primaryDomain' => $this->primaryDomain,
            'domainConfig' => $this->domainConfig,
            'status' => $this->status,
            'createdAt' => $this->createdAt,
            'updatedAt' => $this->updatedAt,
        ];
    }
}
