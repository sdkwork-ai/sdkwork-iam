<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\AppSdk\Models;

/**
 * Signed application access credential. It is a session-class credential: it expires after one hour and can be revoked like any other IAM session.
 */
final class IamAppAccessToken
{
    /** Signed access token; send it as the Access-Token header. */
    public ?string $accessToken = null;

    /** Signed auth token; send it as the Authorization: Bearer header. */
    public ?string $authToken = null;

    /** Credential expiry instant. */
    public ?string $expiresAt = null;

    /** Deploy application anchor carried as the token app_id/aud. */
    public ?string $appId = null;

    /** Installation the credential was issued for. */
    public ?string $installationId = null;

    /** Organization claim of the installation; 0 for tenant- and user-released installations. */
    public ?string $organizationId = null;

    /** Release scope of the installation. */
    public ?string $ownershipScope = null;

    /** Persisted session that can be revoked. */
    public ?string $sessionId = null;

    /** Installation lifecycle environment the credential was gated on (development, production, ...). */
    public ?string $environment = null;

    public function __construct(array $data = [])
    {
        $this->accessToken = array_key_exists('accessToken', $data)
            ? $data['accessToken']
            : null;
        $this->authToken = array_key_exists('authToken', $data)
            ? $data['authToken']
            : null;
        $this->expiresAt = array_key_exists('expiresAt', $data)
            ? $data['expiresAt']
            : null;
        $this->appId = array_key_exists('appId', $data)
            ? $data['appId']
            : null;
        $this->installationId = array_key_exists('installationId', $data)
            ? $data['installationId']
            : null;
        $this->organizationId = array_key_exists('organizationId', $data)
            ? $data['organizationId']
            : null;
        $this->ownershipScope = array_key_exists('ownershipScope', $data)
            ? $data['ownershipScope']
            : null;
        $this->sessionId = array_key_exists('sessionId', $data)
            ? $data['sessionId']
            : null;
        $this->environment = array_key_exists('environment', $data)
            ? $data['environment']
            : null;
    }

    public static function fromArray(?array $data): ?self
    {
        return $data === null ? null : new self($data);
    }

    public function toArray(): array
    {
        return [
            'accessToken' => $this->accessToken,
            'authToken' => $this->authToken,
            'expiresAt' => $this->expiresAt,
            'appId' => $this->appId,
            'installationId' => $this->installationId,
            'organizationId' => $this->organizationId,
            'ownershipScope' => $this->ownershipScope,
            'sessionId' => $this->sessionId,
            'environment' => $this->environment,
        ];
    }
}
