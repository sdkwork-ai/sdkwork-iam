import type { IamEnterpriseSeatBlacklistEntry } from './iam-enterprise-seat-blacklist-entry';

export interface IamEnterpriseSeatBlacklistResponse {
  code: 0;
  data: unknown & { item: IamEnterpriseSeatBlacklistEntry; };
  /** Server-owned request correlation id. */
  traceId: string;
}
