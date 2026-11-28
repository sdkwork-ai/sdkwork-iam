import type { IamOrganizationMembership } from './iam-organization-membership';
import type { PageInfo } from './page-info';

export interface IamOrganizationMembershipListResponse {
  code: 0;
  data: unknown & { items: IamOrganizationMembership[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
