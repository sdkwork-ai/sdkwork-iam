<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\AppSdk\Models;

final class AuthorizationsCreateResponse201
{
    public ?int $code = null;

    public ?string $traceId = null;

    public array $data = [];

    public function __construct(array $data = [])
    {
        $this->code = array_key_exists('code', $data)
            ? $data['code']
            : null;
        $this->traceId = array_key_exists('traceId', $data)
            ? $data['traceId']
            : null;
        $this->data = array_key_exists('data', $data)
            ? is_array($data['data']) ? $data['data'] : []
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
            'traceId' => $this->traceId,
            'data' => $this->data,
        ];
    }
}
