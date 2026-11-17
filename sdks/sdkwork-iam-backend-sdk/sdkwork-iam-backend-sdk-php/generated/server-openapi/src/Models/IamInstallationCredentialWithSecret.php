<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\BackendSdk\Models;

/**
 * The create/rotate result: credential metadata plus the one-time plaintext secret. No read operation returns this shape.
 */
final class IamInstallationCredentialWithSecret
{
    public ?string $credentialId = null;

    public ?string $tenantId = null;

    public ?string $installationEnvironmentId = null;

    public ?string $environmentKey = null;

    public ?string $clientId = null;

    /** Plaintext OAuth client secret. Emitted exactly once by create/rotate and never on reads. */
    public ?string $clientSecret = null;

    public array $redirectUris = [];

    public array $grantedScopes = [];

    public ?string $status = null;

    public ?string $rotatedAt = null;

    public ?string $retiredAt = null;

    /** Creation timestamp. */
    public ?string $createdAt = null;

    /** Last write timestamp. */
    public ?string $updatedAt = null;

    public function __construct(array $data = [])
    {
        $this->credentialId = array_key_exists('credentialId', $data)
            ? $data['credentialId']
            : null;
        $this->tenantId = array_key_exists('tenantId', $data)
            ? $data['tenantId']
            : null;
        $this->installationEnvironmentId = array_key_exists('installationEnvironmentId', $data)
            ? $data['installationEnvironmentId']
            : null;
        $this->environmentKey = array_key_exists('environmentKey', $data)
            ? $data['environmentKey']
            : null;
        $this->clientId = array_key_exists('clientId', $data)
            ? $data['clientId']
            : null;
        $this->clientSecret = array_key_exists('clientSecret', $data)
            ? $data['clientSecret']
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
        $this->status = array_key_exists('status', $data)
            ? $data['status']
            : null;
        $this->rotatedAt = array_key_exists('rotatedAt', $data)
            ? $data['rotatedAt']
            : null;
        $this->retiredAt = array_key_exists('retiredAt', $data)
            ? $data['retiredAt']
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
            'credentialId' => $this->credentialId,
            'tenantId' => $this->tenantId,
            'installationEnvironmentId' => $this->installationEnvironmentId,
            'environmentKey' => $this->environmentKey,
            'clientId' => $this->clientId,
            'clientSecret' => $this->clientSecret,
            'redirectUris' => array_values(array_map(static fn($item) => $item, $this->redirectUris)),
            'grantedScopes' => array_values(array_map(static fn($item) => $item, $this->grantedScopes)),
            'status' => $this->status,
            'rotatedAt' => $this->rotatedAt,
            'retiredAt' => $this->retiredAt,
            'createdAt' => $this->createdAt,
            'updatedAt' => $this->updatedAt,
        ];
    }
}
