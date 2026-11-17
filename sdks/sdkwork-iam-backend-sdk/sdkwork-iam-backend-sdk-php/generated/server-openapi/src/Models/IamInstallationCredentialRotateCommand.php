<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\BackendSdk\Models;

/**
 * Rotates the active credential: the replacement becomes active with a new client id and secret, and the predecessor is kept as rotated history.
 */
final class IamInstallationCredentialRotateCommand
{
    /** Explicit replacement client id. Omitted generates one. */
    public ?string $clientId = null;

    public function __construct(array $data = [])
    {
        $this->clientId = array_key_exists('clientId', $data)
            ? $data['clientId']
            : null;
    }

    public static function fromArray(?array $data): ?self
    {
        return $data === null ? null : new self($data);
    }

    public function toArray(): array
    {
        return [
            'clientId' => $this->clientId,
        ];
    }
}
