import type { IamOrganizationMember } from './iam-organization-member';
import type { PageInfo } from './page-info';

export interface IamOrganizationMemberListResponse {
  code: 0;
  data: unknown & { items: IamOrganizationMember[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
