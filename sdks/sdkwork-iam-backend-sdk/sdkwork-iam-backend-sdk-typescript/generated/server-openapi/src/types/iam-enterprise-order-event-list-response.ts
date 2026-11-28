import type { IamEnterpriseOrderEvent } from './iam-enterprise-order-event';
import type { PageInfo } from './page-info';

export interface IamEnterpriseOrderEventListResponse {
  code: 0;
  data: unknown & { items: IamEnterpriseOrderEvent[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
