<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\AppSdk\Models;

final class AuthorizationsCreateRequest
{
    public ?string $clientId = null;

    public ?string $responseType = null;

    public ?string $redirectUri = null;

    public ?string $scope = null;

    public ?string $state = null;

    public ?string $codeChallenge = null;

    public ?string $codeChallengeMethod = null;

    public ?string $tenantId = null;

    public function __construct(array $data = [])
    {
        $this->clientId = array_key_exists('clientId', $data)
            ? $data['clientId']
            : null;
        $this->responseType = array_key_exists('responseType', $data)
            ? $data['responseType']
            : null;
        $this->redirectUri = array_key_exists('redirectUri', $data)
            ? $data['redirectUri']
            : null;
        $this->scope = array_key_exists('scope', $data)
            ? $data['scope']
            : null;
        $this->state = array_key_exists('state', $data)
            ? $data['state']
            : null;
        $this->codeChallenge = array_key_exists('codeChallenge', $data)
            ? $data['codeChallenge']
            : null;
        $this->codeChallengeMethod = array_key_exists('codeChallengeMethod', $data)
            ? $data['codeChallengeMethod']
            : null;
        $this->tenantId = array_key_exists('tenantId', $data)
            ? $data['tenantId']
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
            'responseType' => $this->responseType,
            'redirectUri' => $this->redirectUri,
            'scope' => $this->scope,
            'state' => $this->state,
            'codeChallenge' => $this->codeChallenge,
            'codeChallengeMethod' => $this->codeChallengeMethod,
            'tenantId' => $this->tenantId,
        ];
    }
}
