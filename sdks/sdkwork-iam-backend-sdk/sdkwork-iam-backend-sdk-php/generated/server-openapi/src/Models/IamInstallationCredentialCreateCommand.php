<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\BackendSdk\Models;

/**
 * Creates the OAuth client of one environment. Omitted clientId is generated.
 */
final class IamInstallationCredentialCreateCommand
{
    /** Registered environment of the installation, by key or canonical alias. */
    public ?string $environmentKey = null;

    /** Explicit client id. Omitted generates one; an id already in use conflicts. */
    public ?string $clientId = null;

    public array $redirectUris = [];

    public array $grantedScopes = [];

    public function __construct(array $data = [])
    {
        $this->environmentKey = array_key_exists('environmentKey', $data)
            ? $data['environmentKey']
            : null;
        $this->clientId = array_key_exists('clientId', $data)
            ? $data['clientId']
            : null;
        $this->redirectUris = array_key_exists('redirectUris', $data)
            ? is_array($data['redirectUris'])
                ? array_values(array_map(static fn($item) => $item, $data['redirectUris']))
                : []
            : [];
        $this->grantedScopes = array_key_exists('grantedScopes', $data)
            ? is_array($data['grantedScopes'])
                ? array_values(array_map(static fn($item) => $item, $data['grantedScopes']))
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
            'environmentKey' => $this->environmentKey,
            'clientId' => $this->clientId,
            'redirectUris' => array_values(array_map(static fn($item) => $item, $this->redirectUris)),
            'grantedScopes' => array_values(array_map(static fn($item) => $item, $this->grantedScopes)),
        ];
    }
}
