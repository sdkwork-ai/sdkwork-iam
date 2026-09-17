<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\BackendSdk\Models;

/**
 * Authenticated operator command for a tenant application status transition.
 */
final class IamTenantApplicationStatusCommand
{
    // OpenAPI schema defines no explicit properties.

    public function __construct(array $data = [])
    {
        // No properties to hydrate.
    }

    public static function fromArray(?array $data): ?self
    {
        return $data === null ? null : new self($data);
    }

    public function toArray(): array
    {
        return [
            // No properties to serialize.
        ];
    }
}
