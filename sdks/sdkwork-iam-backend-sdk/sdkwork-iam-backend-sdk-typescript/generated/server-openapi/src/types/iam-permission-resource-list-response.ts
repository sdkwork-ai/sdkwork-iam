import type { IamPermissionResource } from './iam-permission-resource';
import type { PageInfo } from './page-info';

export interface IamPermissionResourceListResponse {
  code: 0;
  data: unknown & { items: IamPermissionResource[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
