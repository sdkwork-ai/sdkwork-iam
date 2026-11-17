<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\AppSdk\Models;

/**
 * One selectable persona role.
 */
final class IamPersonaRole
{
    public ?string $code = null;

    /** Authorization role code this persona maps onto, when one exists. */
    public ?string $iamRoleCode = null;

    public ?int $sortOrder = null;

    /** Locale to display-text map, for example {"zh-CN":"学员","en-US":"Learner"}. */
    public array $labels = [];

    /** Locale to display-text map, for example {"zh-CN":"学员","en-US":"Learner"}. */
    public array $descriptions = [];

    public function __construct(array $data = [])
    {
        $this->code = array_key_exists('code', $data)
            ? $data['code']
            : null;
        $this->iamRoleCode = array_key_exists('iamRoleCode', $data)
            ? $data['iamRoleCode']
            : null;
        $this->sortOrder = array_key_exists('sortOrder', $data)
            ? $data['sortOrder']
            : null;
        $this->labels = array_key_exists('labels', $data)
            ? is_array($data['labels'])
                ? array_map(static fn($item) => $item, $data['labels'])
                : []
            : [];
        $this->descriptions = array_key_exists('descriptions', $data)
            ? is_array($data['descriptions'])
                ? array_map(static fn($item) => $item, $data['descriptions'])
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
            'iamRoleCode' => $this->iamRoleCode,
            'sortOrder' => $this->sortOrder,
            'labels' => array_map(static fn($item) => $item, $this->labels),
            'descriptions' => array_map(static fn($item) => $item, $this->descriptions),
        ];
    }
}
