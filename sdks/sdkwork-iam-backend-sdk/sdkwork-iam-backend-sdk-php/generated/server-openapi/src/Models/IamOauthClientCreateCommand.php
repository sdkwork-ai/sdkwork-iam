<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\BackendSdk\Models;

/**
 * Tenant-scoped OAuth provider client registration command.
 */
final class IamOauthClientCreateCommand
{
    public ?string $integrationId = null;

    public ?string $providerCode = null;

    public ?string $clientCode = null;

    public ?string $displayName = null;

    public ?string $providerClientId = null;

    /** Provider-owned identity federation scope, such as a WeChat Open Platform account ID. */
    public ?string $providerTenantId = null;

    public function __construct(array $data = [])
    {
        $this->integrationId = array_key_exists('integrationId', $data)
            ? $data['integrationId']
            : null;
        $this->providerCode = array_key_exists('providerCode', $data)
            ? $data['providerCode']
            : null;
        $this->clientCode = array_key_exists('clientCode', $data)
            ? $data['clientCode']
            : null;
        $this->displayName = array_key_exists('displayName', $data)
            ? $data['displayName']
            : null;
        $this->providerClientId = array_key_exists('providerClientId', $data)
            ? $data['providerClientId']
            : null;
        $this->providerTenantId = array_key_exists('providerTenantId', $data)
            ? $data['providerTenantId']
            : null;
    }

    public static function fromArray(?array $data): ?self
    {
        return $data === null ? null : new self($data);
    }

    public function toArray(): array
    {
        return [
            'integrationId' => $this->integrationId,
            'providerCode' => $this->providerCode,
            'clientCode' => $this->clientCode,
            'displayName' => $this->displayName,
            'providerClientId' => $this->providerClientId,
            'providerTenantId' => $this->providerTenantId,
        ];
    }
}
