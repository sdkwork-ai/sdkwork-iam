<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\AppSdk\Models;

/**
 * Native-app exchange of a deep-link authorization code for a dual-token session.
 */
final class DesktopSessionsCreateRequest
{
    public ?string $clientId = null;

    public ?string $authorizationCode = null;

    public ?string $codeVerifier = null;

    /** Registered native redirect URI; the code must have been issued for a desktop surface (custom scheme or loopback). */
    public ?string $redirectUri = null;

    public ?string $clientSecret = null;

    /** Stable opaque per-install device identity. A new login replaces only this device's previous session for the same application. */
    public ?string $deviceId = null;

    public function __construct(array $data = [])
    {
        $this->clientId = array_key_exists('clientId', $data)
            ? $data['clientId']
            : null;
        $this->authorizationCode = array_key_exists('authorizationCode', $data)
            ? $data['authorizationCode']
            : null;
        $this->codeVerifier = array_key_exists('codeVerifier', $data)
            ? $data['codeVerifier']
            : null;
        $this->redirectUri = array_key_exists('redirectUri', $data)
            ? $data['redirectUri']
            : null;
        $this->clientSecret = array_key_exists('clientSecret', $data)
            ? $data['clientSecret']
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
            'clientId' => $this->clientId,
            'authorizationCode' => $this->authorizationCode,
            'codeVerifier' => $this->codeVerifier,
            'redirectUri' => $this->redirectUri,
            'clientSecret' => $this->clientSecret,
            'deviceId' => $this->deviceId,
        ];
    }
}
