<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\AppSdk\Models;

/**
 * Completes a pending OAuth account association after the person proved ownership of the phone. Answered with the standard session payload, or with the `LOGIN_CONTEXT_SELECTION` challenge for an account that belongs to several organizations.
 */
final class OauthPhoneBindingSessionCreateCommand
{
    /** One-time `continuationToken` returned by the `OAUTH_PHONE_BINDING_REQUIRED` challenge of an OAuth, mini-program, or official-account session exchange. */
    public ?string $continuationToken = null;

    /** Phone number that owns the target IAM account. When no account owns it yet, a new account is registered for the OAuth identity if the tenant allows OAuth auto-registration. */
    public ?string $phone = null;

    /** One-time SMS verification code requested for this phone. */
    public ?string $verificationCode = null;

    /** Originating client surface, recorded with the association. */
    public ?string $surfaceCode = null;

    /** Opaque client device identity kept from the challenge. Omit it only when the original request did not send one; the session then binds no device slot. */
    public ?string $deviceId = null;

    public function __construct(array $data = [])
    {
        $this->continuationToken = array_key_exists('continuationToken', $data)
            ? $data['continuationToken']
            : null;
        $this->phone = array_key_exists('phone', $data)
            ? $data['phone']
            : null;
        $this->verificationCode = array_key_exists('verificationCode', $data)
            ? $data['verificationCode']
            : null;
        $this->surfaceCode = array_key_exists('surfaceCode', $data)
            ? $data['surfaceCode']
            : null;
        $this->deviceId = array_key_exists('deviceId', $data)
            ? $data['deviceId']
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
            'verificationCode' => $this->verificationCode,
            'surfaceCode' => $this->surfaceCode,
            'deviceId' => $this->deviceId,
        ];
    }
}
