import type { IamInstallationEnvironment } from './iam-installation-environment';
import type { PageInfo } from './page-info';

export interface IamInstallationEnvironmentListResponse {
  code: 0;
  data: unknown & { items: IamInstallationEnvironment[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
