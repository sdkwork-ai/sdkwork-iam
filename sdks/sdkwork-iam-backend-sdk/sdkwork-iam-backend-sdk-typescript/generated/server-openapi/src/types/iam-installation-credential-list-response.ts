import type { IamInstallationCredential } from './iam-installation-credential';
import type { PageInfo } from './page-info';

export interface IamInstallationCredentialListResponse {
  code: 0;
  data: unknown & { items: IamInstallationCredential[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
