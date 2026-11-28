import type { IamEnterpriseSeatBlacklistEntry } from './iam-enterprise-seat-blacklist-entry';
import type { PageInfo } from './page-info';

export interface IamEnterpriseSeatBlacklistListResponse {
  code: 0;
  data: unknown & { items: IamEnterpriseSeatBlacklistEntry[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
