/** One enterprise authorization order. tenantId is the publisher; enterpriseTenantId is the grantee enterprise. */
export interface IamEnterpriseOrder {
  id: string;
  orderNo: string;
  tenantId: string;
  organizationId?: string;
  applicationId: string;
  enterpriseTenantId: string;
  enterpriseOrganizationId?: string;
  enterpriseName?: string;
  authorizationMode: 'all_members' | 'seat';
  seatCount?: number | null;
  seatName?: string | null;
  managementScope?: 'tenant' | 'organization' | 'department' | 'self';
  durationMonths: 3 | 6 | 12;
  orderStatus: 'pending_authorization' | 'active' | 'pending_termination' | 'terminated' | 'cancelled';
  contactName?: string;
  contactPhone?: string;
  authorizedAt?: string | null;
  expiresAt?: string | null;
  terminatedAt?: string | null;
  terminationReason?: string | null;
  terminationNote?: string | null;
  createdAt?: string;
  updatedAt?: string;
  version?: string;
}
