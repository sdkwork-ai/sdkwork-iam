/** One seat inside the grantee enterprise. tenantId here is the enterprise, not the publisher. */
export interface IamEnterpriseOrderSeat {
  id: string;
  tenantId: string;
  organizationId?: string;
  orderId: string;
  applicationId: string;
  userId: string;
  displayName?: string | null;
  oneIdId?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  allocationMethod: 'manual' | 'department_auto' | 'department_login';
  policyId?: string | null;
  blacklisted: boolean;
  seatStatus: 'active' | 'released';
  assignedBy?: string;
  assignedAt?: string;
  releasedBy?: string | null;
  releasedAt?: string | null;
  version?: string;
}
