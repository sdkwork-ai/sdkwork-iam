import type { IamRoleBinding } from './iam-role-binding';
import type { PageInfo } from './page-info';

export interface IamRoleBindingListResponse {
  code: 0;
  data: unknown & { items: IamRoleBinding[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
