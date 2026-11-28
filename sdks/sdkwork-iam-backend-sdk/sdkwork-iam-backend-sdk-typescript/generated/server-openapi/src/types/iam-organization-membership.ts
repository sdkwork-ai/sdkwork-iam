export interface IamOrganizationMembership {
  id?: string;
  userId: string;
  membershipId: string;
  organizationId: string;
  tenantId?: string;
  membershipKind: string;
  status: string;
  username?: string;
  displayName?: string;
  email?: string | null;
  phone?: string | null;
}
