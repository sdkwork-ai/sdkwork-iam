<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\BackendSdk\Models;

/**
 * Exchange a workload client credential for short-lived tenant-bound dual tokens.
 */
final class ServiceAccountTokenExchangeCommand
{
    public ?string $clientId = null;

    public ?string $clientSecret = null;

    public function __construct(array $data = [])
    {
        $this->clientId = array_key_exists('clientId', $data)
            ? $data['clientId']
            : null;
        $this->clientSecret = array_key_exists('clientSecret', $data)
            ? $data['clientSecret']
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
            'clientSecret' => $this->clientSecret,
        ];
    }
}
