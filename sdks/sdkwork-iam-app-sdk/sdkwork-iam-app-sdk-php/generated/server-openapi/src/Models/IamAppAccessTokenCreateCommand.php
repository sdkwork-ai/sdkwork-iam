<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\AppSdk\Models;

/**
 * Selectors for the application whose access credential is requested. Supply at least one; the tenant and the organization are derived from the authenticated session and the installation, never from this body.
 */
final class IamAppAccessTokenCreateCommand
{
    /** Installation deploy application anchor (iam_application_installation.deploy_application_id). Preferred selector: it is the identity the deployment plane publishes. */
    public ?string $appId = null;

    /** IAM installation row id (tapp_...) of the caller's tenant. */
    public ?string $installationId = null;

    /** Installation instance key of the caller's tenant. */
    public ?string $instanceKey = null;

    /** Exact installation lifecycle to initialize. Omitted means the caller session environment when the installation registered it, otherwise the installation's only active environment. An operator can initialize a lifecycle that differs from its own session environment. */
    public ?string $environment = null;

    /** Release scope the caller declares. It is a declaration to be checked, never a selector: the installation decides the level. Omit it to inherit the installation scope (a tenant-level application therefore yields a tenant-level credential); an explicit value that disagrees with the installation is refused. */
    public ?string $ownershipScope = null;

    public function __construct(array $data = [])
    {
        $this->appId = array_key_exists('appId', $data)
            ? $data['appId']
            : null;
        $this->installationId = array_key_exists('installationId', $data)
            ? $data['installationId']
            : null;
        $this->instanceKey = array_key_exists('instanceKey', $data)
            ? $data['instanceKey']
            : null;
        $this->environment = array_key_exists('environment', $data)
            ? $data['environment']
            : null;
        $this->ownershipScope = array_key_exists('ownershipScope', $data)
            ? $data['ownershipScope']
            : null;
    }

    public static function fromArray(?array $data): ?self
    {
        return $data === null ? null : new self($data);
    }

    public function toArray(): array
    {
        return [
            'appId' => $this->appId,
            'installationId' => $this->installationId,
            'instanceKey' => $this->instanceKey,
            'environment' => $this->environment,
            'ownershipScope' => $this->ownershipScope,
        ];
    }
}
