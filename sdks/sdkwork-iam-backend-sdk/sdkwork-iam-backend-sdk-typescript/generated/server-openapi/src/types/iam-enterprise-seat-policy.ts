export interface IamEnterpriseSeatPolicy {
  id: string;
  tenantId: string;
  orderId: string;
  applicationId: string;
  organizationId: string;
  departmentId: string;
  departmentName: string;
  allocationType: 'auto' | 'login';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: string;
}
