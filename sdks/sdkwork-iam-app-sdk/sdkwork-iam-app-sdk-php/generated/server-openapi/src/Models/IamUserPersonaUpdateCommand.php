<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\AppSdk\Models;

/**
 * Full persona replacement; omitted interests mean an empty list.
 */
final class IamUserPersonaUpdateCommand
{
    /** Chosen persona role code, or null to clear it. */
    public ?string $role = null;

    /** Followed interest codes; must be active catalog codes. */
    public array $interests = [];

    /** Whether the first-run prompt was answered. */
    public ?bool $promptDismissed = null;

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
        ];
    }
}
