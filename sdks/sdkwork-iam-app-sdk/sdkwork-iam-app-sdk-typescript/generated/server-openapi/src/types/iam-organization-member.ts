/** One member of an organization roster as IAM publishes it. */
export interface IamOrganizationMember {
  /** IAM user id. */
  userId: string;
  /** Organization membership row id that binds the user to the organization. */
  membershipId: string;
  /** Display name of the member. */
  displayName?: string;
  /** Login name of the member. */
  username?: string;
  /** Contact email. Omitted unless the caller holds an owner or admin membership in the same organization. */
  email?: string;
  membershipKind: 'owner' | 'admin' | 'member';
  /** Membership status; an active roster only reports active rows. */
  status: string;
  /** Whether this membership is the member primary organization membership. */
  isPrimary: boolean;
}
