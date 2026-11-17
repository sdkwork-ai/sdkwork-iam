<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\AppSdk\Models;

final class SessionsCurrentLogoutRequest
{
    /** Refresh token of the session to revoke. Accepted without an access token so logout still revokes the server session after the access token expired. */
    public ?string $refreshToken = null;

    public function __construct(array $data = [])
    {
        $this->refreshToken = array_key_exists('refreshToken', $data)
            ? $data['refreshToken']
            : null;
    }

    public static function fromArray(?array $data): ?self
    {
        return $data === null ? null : new self($data);
    }

    public function toArray(): array
    {
        return [
            'refreshToken' => $this->refreshToken,
        ];
    }
}
