import type { IamEnterpriseOrderWithLink } from './iam-enterprise-order-with-link';

export interface IamEnterpriseOrderWithLinkResponse {
  code: 0;
  data: unknown & { item: IamEnterpriseOrderWithLink; };
  /** Server-owned request correlation id. */
  traceId: string;
}
