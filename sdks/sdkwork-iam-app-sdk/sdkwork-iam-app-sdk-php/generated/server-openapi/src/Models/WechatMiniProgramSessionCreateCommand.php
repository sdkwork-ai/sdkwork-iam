<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\AppSdk\Models;

/**
 * One-time WeChat Mini Program login-code exchange command.
 */
final class WechatMiniProgramSessionCreateCommand
{
    /** One-time code returned by wx.login(). */
    public ?string $jsCode = null;

    /** One-time code returned by the mini program getPhoneNumber grant. WeChat verified the subscriber SIM for this code, so the resulting phone may associate the WeChat identity with an existing account (subject to the tenant OAuth phone-association policy). Omit it to require the phone-binding step instead. */
    public ?string $phoneCode = null;

    public ?string $providerCode = null;

    /** Registered IAM OAuth mini-program surface code. */
    public ?string $surfaceCode = null;

    /** Opaque client device identity. Sessions are replaced per application per device, so the same device signing in again revokes only its own previous session instead of every session of the application. Carried forward across refresh and the phone-binding step. */
    public ?string $deviceId = null;

    public function __construct(array $data = [])
    {
        $this->jsCode = array_key_exists('jsCode', $data)
            ? $data['jsCode']
            : null;
        $this->phoneCode = array_key_exists('phoneCode', $data)
            ? $data['phoneCode']
            : null;
        $this->providerCode = array_key_exists('providerCode', $data)
            ? $data['providerCode']
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
            'jsCode' => $this->jsCode,
            'phoneCode' => $this->phoneCode,
            'providerCode' => $this->providerCode,
            'surfaceCode' => $this->surfaceCode,
            'deviceId' => $this->deviceId,
        ];
    }
}
