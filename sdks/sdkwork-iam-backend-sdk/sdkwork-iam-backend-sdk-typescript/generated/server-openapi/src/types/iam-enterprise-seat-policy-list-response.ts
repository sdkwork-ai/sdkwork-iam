import type { IamEnterpriseSeatPolicy } from './iam-enterprise-seat-policy';
import type { PageInfo } from './page-info';

export interface IamEnterpriseSeatPolicyListResponse {
  code: 0;
  data: unknown & { items: IamEnterpriseSeatPolicy[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
