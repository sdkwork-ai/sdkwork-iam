/** The order plus the one-time plaintext token of the link it just issued. Only the SHA-256 of the token is stored; it is never returned again. */
export interface IamEnterpriseOrderWithLink {
  id: string;
  orderNo: string;
  tenantId?: string;
  applicationId?: string;
  enterpriseTenantId?: string;
  enterpriseName?: string;
  authorizationMode?: 'all_members' | 'seat';
  seatCount?: number | null;
  seatName?: string | null;
  managementScope?: 'tenant' | 'organization' | 'department' | 'self';
  durationMonths?: 3 | 6 | 12;
  orderStatus: 'pending_authorization' | 'active' | 'pending_termination' | 'terminated' | 'cancelled';
  expiresAt?: string | null;
  linkToken: string;
}
