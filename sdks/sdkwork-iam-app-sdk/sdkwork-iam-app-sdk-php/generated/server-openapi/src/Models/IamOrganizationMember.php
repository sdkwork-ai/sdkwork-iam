<?php

declare(strict_types=1);

namespace SDKWork\\Iam\\AppSdk\Models;

/**
 * One member of an organization roster as IAM publishes it.
 */
final class IamOrganizationMember
{
    /** IAM user id. */
    public ?string $userId = null;

    /** Organization membership row id that binds the user to the organization. */
    public ?string $membershipId = null;

    /** Display name of the member. */
    public ?string $displayName = null;

    /** Login name of the member. */
    public ?string $username = null;

    /** Contact email. Omitted unless the caller holds an owner or admin membership in the same organization. */
    public ?string $email = null;

    public ?string $membershipKind = null;

    /** Membership status; an active roster only reports active rows. */
    public ?string $status = null;

    /** Whether this membership is the member primary organization membership. */
    public ?bool $isPrimary = null;

    public function __construct(array $data = [])
    {
        $this->userId = array_key_exists('userId', $data)
            ? $data['userId']
            : null;
        $this->membershipId = array_key_exists('membershipId', $data)
            ? $data['membershipId']
            : null;
        $this->displayName = array_key_exists('displayName', $data)
            ? $data['displayName']
            : null;
        $this->username = array_key_exists('username', $data)
            ? $data['username']
            : null;
        $this->email = array_key_exists('email', $data)
            ? $data['email']
            : null;
        $this->membershipKind = array_key_exists('membershipKind', $data)
            ? $data['membershipKind']
            : null;
        $this->status = array_key_exists('status', $data)
            ? $data['status']
            : null;
        $this->isPrimary = array_key_exists('isPrimary', $data)
            ? $data['isPrimary']
            : null;
    }

    public static function fromArray(?array $data): ?self
    {
        return $data === null ? null : new self($data);
    }

    public function toArray(): array
    {
        return [
            'userId' => $this->userId,
            'membershipId' => $this->membershipId,
            'displayName' => $this->displayName,
            'username' => $this->username,
            'email' => $this->email,
            'membershipKind' => $this->membershipKind,
            'status' => $this->status,
            'isPrimary' => $this->isPrimary,
        ];
    }
}
