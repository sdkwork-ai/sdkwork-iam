<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\AppSdk\Models;

/**
 * Requests the ownership-proof SMS code for a pending OAuth account association. Unlike `auth/verification_code_requests` the caller is not yet authenticated; the pending-binding ticket is the authorization.
 */
final class OauthPhoneBindingVerificationCodeRequestCommand
{
    /** One-time `continuationToken` returned by the `OAUTH_PHONE_BINDING_REQUIRED` challenge. */
    public ?string $continuationToken = null;

    /** Phone number to prove ownership of. */
    public ?string $phone = null;

    public function __construct(array $data = [])
    {
        $this->continuationToken = array_key_exists('continuationToken', $data)
            ? $data['continuationToken']
            : null;
        $this->phone = array_key_exists('phone', $data)
            ? $data['phone']
            : null;
    }

    public static function fromArray(?array $data): ?self
    {
        return $data === null ? null : new self($data);
    }

    public function toArray(): array
    {
        return [
            'continuationToken' => $this->continuationToken,
            'phone' => $this->phone,
        ];
    }
}
