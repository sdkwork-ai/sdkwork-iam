export interface IamEnterpriseOrderCreateCommand {
  applicationId?: string;
  enterpriseTenantId: string;
  enterpriseOrganizationId?: string;
  enterpriseName: string;
  authorizationMode?: 'all_members' | 'seat';
  seatCount?: number;
  seatName?: string | null;
  durationMonths: 3 | 6 | 12;
  contactName: string;
  contactPhone: string;
  organizationId?: string;
}
