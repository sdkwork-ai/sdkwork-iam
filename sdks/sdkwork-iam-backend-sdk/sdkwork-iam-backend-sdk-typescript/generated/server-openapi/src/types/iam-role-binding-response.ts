import type { IamRoleBinding } from './iam-role-binding';

export interface IamRoleBindingResponse {
  code: 0;
  data: unknown & { item: IamRoleBinding; };
  /** Server-owned request correlation id. */
  traceId: string;
}
