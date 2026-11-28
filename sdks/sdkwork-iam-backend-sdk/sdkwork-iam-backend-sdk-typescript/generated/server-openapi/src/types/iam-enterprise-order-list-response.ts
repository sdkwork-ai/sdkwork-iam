import type { IamEnterpriseOrder } from './iam-enterprise-order';
import type { PageInfo } from './page-info';

export interface IamEnterpriseOrderListResponse {
  code: 0;
  data: unknown & { items: IamEnterpriseOrder[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
