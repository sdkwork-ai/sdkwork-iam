<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\AppSdk\Models;

use SDKWork\\Iam\\AppSdk\Models\IamPersonaInterest;
use SDKWork\\Iam\\AppSdk\Models\IamPersonaRole;

/**
 * The selectable persona taxonomy with every active locale.
 */
final class IamPersonaCatalog
{
    /** Opaque catalog version; refresh the cached catalog when it changes. */
    public ?string $version = null;

    public array $roles = [];

    public array $interests = [];

    public function __construct(array $data = [])
    {
        $this->version = array_key_exists('version', $data)
            ? $data['version']
            : null;
        $this->roles = array_key_exists('roles', $data)
            ? is_array($data['roles'])
                ? array_values(array_map(static fn($item) => is_array($item) ? IamPersonaRole::fromArray($item) : $item, $data['roles']))
                : []
            : [];
        $this->interests = array_key_exists('interests', $data)
            ? is_array($data['interests'])
                ? array_values(array_map(static fn($item) => is_array($item) ? IamPersonaInterest::fromArray($item) : $item, $data['interests']))
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
            'version' => $this->version,
            'roles' => array_values(array_map(static fn($item) => $item instanceof IamPersonaRole ? $item->toArray() : $item, $this->roles)),
            'interests' => array_values(array_map(static fn($item) => $item instanceof IamPersonaInterest ? $item->toArray() : $item, $this->interests)),
        ];
    }
}
