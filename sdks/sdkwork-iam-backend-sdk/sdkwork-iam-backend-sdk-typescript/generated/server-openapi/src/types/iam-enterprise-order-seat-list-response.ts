import type { IamEnterpriseOrderSeat } from './iam-enterprise-order-seat';
import type { PageInfo } from './page-info';

export interface IamEnterpriseOrderSeatListResponse {
  code: 0;
  data: unknown & { items: IamEnterpriseOrderSeat[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
