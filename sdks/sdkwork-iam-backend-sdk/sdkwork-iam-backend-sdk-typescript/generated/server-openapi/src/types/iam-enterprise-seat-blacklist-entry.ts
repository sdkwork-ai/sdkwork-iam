export interface IamEnterpriseSeatBlacklistEntry {
  id: string;
  tenantId: string;
  orderId: string;
  applicationId: string;
  userId: string;
  displayName: string;
  oneIdId?: string | null;
  departmentName?: string | null;
  reason?: string | null;
  createdBy: string;
  createdAt: string;
}
