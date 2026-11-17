<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\BackendSdk\Models;

/**
 * Idempotent registration of one environment. The path environmentKey is authoritative; an explicit body value must match it. Omitted status keeps the stored status on update and defaults to pending on insert.
 */
final class IamInstallationEnvironmentUpsertCommand
{
    public ?string $environmentKey = null;

    /** Blank or null clears the domain; a domain is unique per tenant. */
    public ?string $primaryDomain = null;

    public array $domainConfig = [];

    public ?string $status = null;

    public function __construct(array $data = [])
    {
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
    }

    public static function fromArray(?array $data): ?self
    {
        return $data === null ? null : new self($data);
    }

    public function toArray(): array
    {
        return [
            'environmentKey' => $this->environmentKey,
            'primaryDomain' => $this->primaryDomain,
            'domainConfig' => $this->domainConfig,
            'status' => $this->status,
        ];
    }
}
