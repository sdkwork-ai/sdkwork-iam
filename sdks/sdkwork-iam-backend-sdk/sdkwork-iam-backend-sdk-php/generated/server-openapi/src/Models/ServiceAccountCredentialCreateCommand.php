<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\BackendSdk\Models;

/**
 * Create a one-time-returned workload credential bound to a service account and tenant application.
 */
final class ServiceAccountCredentialCreateCommand
{
    public ?string $installationId = null;

    public ?string $expiresAt = null;

    public function __construct(array $data = [])
    {
        $this->installationId = array_key_exists('installationId', $data)
            ? $data['installationId']
            : null;
        $this->expiresAt = array_key_exists('expiresAt', $data)
            ? $data['expiresAt']
            : null;
    }

    public static function fromArray(?array $data): ?self
    {
        return $data === null ? null : new self($data);
    }

    public function toArray(): array
    {
        return [
            'installationId' => $this->installationId,
            'expiresAt' => $this->expiresAt,
        ];
    }
}
