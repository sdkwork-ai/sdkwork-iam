import type { IamEnterpriseSeatPolicy } from './iam-enterprise-seat-policy';

export interface IamEnterpriseSeatPolicyResponse {
  code: 0;
  data: unknown & { item: IamEnterpriseSeatPolicy; };
  /** Server-owned request correlation id. */
  traceId: string;
}
