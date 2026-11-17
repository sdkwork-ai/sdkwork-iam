<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\AppSdk\Models;

/**
 * One selectable interest direction.
 */
final class IamPersonaInterest
{
    public ?string $code = null;

    public ?int $sortOrder = null;

    /** Locale to display-text map, for example {"zh-CN":"学员","en-US":"Learner"}. */
    public array $labels = [];

    public function __construct(array $data = [])
    {
        $this->code = array_key_exists('code', $data)
            ? $data['code']
            : null;
        $this->sortOrder = array_key_exists('sortOrder', $data)
            ? $data['sortOrder']
            : null;
        $this->labels = array_key_exists('labels', $data)
            ? is_array($data['labels'])
                ? array_map(static fn($item) => $item, $data['labels'])
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
            'code' => $this->code,
            'sortOrder' => $this->sortOrder,
            'labels' => array_map(static fn($item) => $item, $this->labels),
        ];
    }
}
