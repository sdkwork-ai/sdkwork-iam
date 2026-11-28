import type { IamEnterpriseOrder } from './iam-enterprise-order';

export interface IamEnterpriseOrderResponse {
  code: 0;
  data: unknown & { item: IamEnterpriseOrder; };
  /** Server-owned request correlation id. */
  traceId: string;
}
