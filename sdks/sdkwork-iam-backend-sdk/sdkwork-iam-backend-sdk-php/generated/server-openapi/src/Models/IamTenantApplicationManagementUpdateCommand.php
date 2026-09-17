<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\BackendSdk\Models;

/**
 * Update operator-managed tenant application domain and access permissions.
 */
final class IamTenantApplicationManagementUpdateCommand
{
    public ?string $primaryDomain = null;

    public array $accessPermissions = [];

    public function __construct(array $data = [])
    {
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
            'primaryDomain' => $this->primaryDomain,
            'accessPermissions' => array_values(array_map(static fn($item) => $item, $this->accessPermissions)),
        ];
    }
}
