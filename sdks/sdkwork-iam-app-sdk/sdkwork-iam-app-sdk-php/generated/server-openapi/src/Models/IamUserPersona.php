<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\AppSdk\Models;

/**
 * The caller persona. role is null until a role is chosen.
 */
final class IamUserPersona
{
    /** Chosen persona role code, or null while unchosen. */
    public ?string $role = null;

    /** Followed interest codes in catalog order. */
    public array $interests = [];

    /** Whether the first-run prompt was answered without choosing a role. */
    public ?bool $promptDismissed = null;

    /** True once a role is chosen. */
    public ?bool $hasSelection = null;

    /** Catalog version the stored selection was validated against. */
    public ?string $catalogVersion = null;

    /** Last write time, or null before the first write. */
    public ?string $updatedAt = null;

    public function __construct(array $data = [])
    {
        $this->role = array_key_exists('role', $data)
            ? $data['role']
            : null;
        $this->interests = array_key_exists('interests', $data)
            ? is_array($data['interests'])
                ? array_values(array_map(static fn($item) => $item, $data['interests']))
                : []
            : [];
        $this->promptDismissed = array_key_exists('promptDismissed', $data)
            ? $data['promptDismissed']
            : null;
        $this->hasSelection = array_key_exists('hasSelection', $data)
            ? $data['hasSelection']
            : null;
        $this->catalogVersion = array_key_exists('catalogVersion', $data)
            ? $data['catalogVersion']
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
            'role' => $this->role,
            'interests' => array_values(array_map(static fn($item) => $item, $this->interests)),
            'promptDismissed' => $this->promptDismissed,
            'hasSelection' => $this->hasSelection,
            'catalogVersion' => $this->catalogVersion,
            'updatedAt' => $this->updatedAt,
        ];
    }
}
